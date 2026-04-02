import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/user.model";
import { RefreshToken } from "../models/refreshToken.model";
import { Role } from "../models/role.model";
import { publishEvent } from "@pharmacy-saas/rabbitmq";
import { mongoose } from "@pharmacy-saas/db";
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ROLES,
  ROLE_PERMISSIONS,
  EVENTS,
} from "@pharmacy-saas/shared";
import type { JwtPayload, TokenPair } from "@pharmacy-saas/shared";

const SALT_ROUNDS = 12;

function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET || "default-secret", {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
  });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

// Register a new tenant owner (first user of a tenant)
export async function registerUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  tenantId: string;
}) {
  const existing = await User.findOne({
    email: data.email,
    tenantId: data.tenantId,
  });
  if (existing) {
    throw new ConflictError("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
  const permissions = ROLE_PERMISSIONS[ROLES.TENANT_OWNER];

  const user = await User.create({
    ...data,
    password: hashedPassword,
    role: ROLES.TENANT_OWNER,
    permissions,
  });

  // Create default roles for the tenant
  await seedDefaultRoles(data.tenantId);

  const tokenPair = await createTokenPair(user);

  try {
    await publishEvent(EVENTS.USER_REGISTERED, {
      userId: user._id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });
  } catch {
    // non-critical
  }

  return {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      tenantId: user.tenantId,
    },
    tokens: tokenPair,
  };
}

export async function loginUser(
  email: string,
  password: string,
  tenantId?: string,
) {
  // Super admin login (no tenantId required)
  let user;
  if (!tenantId) {
    user = await User.findOne({ email, role: ROLES.SUPER_ADMIN }).select(
      "+password",
    );
  } else {
    user = await User.findOne({ email, tenantId }).select("+password");
  }
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (!user.isActive) {
    throw new UnauthorizedError("Account is deactivated");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // For tenant users, verify the tenant is active and subscription is valid
  if (user.tenantId) {
    const tenantCol = mongoose.connection.db?.collection("tenants");
    if (tenantCol) {
      const { ObjectId } = mongoose.Types;
      const tenant = await tenantCol.findOne({
        _id: new ObjectId(user.tenantId.toString()),
      });
      if (!tenant) {
        throw new UnauthorizedError("Tenant not found");
      }
      if (!tenant.isActive) {
        throw new UnauthorizedError(
          "Your shop has been suspended. Contact the administrator.",
        );
      }
      // Check trial expiration — auto-expire if trialEndsAt has passed
      if (
        tenant.subscription?.status === "trial" &&
        tenant.subscription?.trialEndsAt &&
        new Date(tenant.subscription.trialEndsAt) < new Date()
      ) {
        // Auto-update status to expired
        await tenantCol.updateOne(
          { _id: tenant._id },
          { $set: { "subscription.status": "expired" } },
        );
        throw new UnauthorizedError(
          "Your free trial has expired. Please contact the administrator to upgrade your plan.",
        );
      }
      // Check if subscription itself is expired or cancelled
      if (
        tenant.subscription?.status === "expired" ||
        tenant.subscription?.status === "cancelled"
      ) {
        throw new UnauthorizedError(
          "Your subscription has expired. Please contact the administrator to renew.",
        );
      }
    }
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  const tokenPair = await createTokenPair(user);

  return {
    user: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      tenantId: user.tenantId,
    },
    tokens: tokenPair,
  };
}

export async function refreshAccessToken(refreshTokenValue: string) {
  const storedToken = await RefreshToken.findOne({ token: refreshTokenValue });
  if (!storedToken) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  if (storedToken.expiresAt < new Date()) {
    await RefreshToken.deleteOne({ _id: storedToken._id });
    throw new UnauthorizedError("Refresh token expired");
  }

  const user = await User.findById(storedToken.userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedError("User not found or deactivated");
  }

  // Check tenant status (skip for super_admin who has no tenant)
  if (user.tenantId) {
    const { ObjectId } = mongoose.Types;
    const tenantsCol = mongoose.connection.db?.collection("tenants");
    if (tenantsCol) {
      const tenant = await tenantsCol.findOne({
        _id: new ObjectId(user.tenantId.toString()),
      });
      if (!tenant) {
        await RefreshToken.deleteOne({ _id: storedToken._id });
        throw new UnauthorizedError("Tenant not found");
      }
      if (!tenant.isActive) {
        await RefreshToken.deleteOne({ _id: storedToken._id });
        throw new UnauthorizedError(
          "Your shop has been suspended. Contact the administrator.",
        );
      }
      if (
        tenant.subscription?.status === "trial" &&
        tenant.subscription?.trialEndsAt &&
        new Date(tenant.subscription.trialEndsAt) < new Date()
      ) {
        await tenantsCol.updateOne(
          { _id: tenant._id },
          { $set: { "subscription.status": "expired" } },
        );
        await RefreshToken.deleteOne({ _id: storedToken._id });
        throw new UnauthorizedError(
          "Your free trial has expired. Please subscribe to continue.",
        );
      }
      if (
        tenant.subscription?.status === "expired" ||
        tenant.subscription?.status === "cancelled"
      ) {
        await RefreshToken.deleteOne({ _id: storedToken._id });
        throw new UnauthorizedError(
          "Your subscription has expired. Please renew to continue.",
        );
      }
    }
  }

  // Rotate: delete old, create new
  await RefreshToken.deleteOne({ _id: storedToken._id });
  const tokenPair = await createTokenPair(user);

  return { tokens: tokenPair };
}

export async function logoutUser(refreshTokenValue: string) {
  await RefreshToken.deleteOne({ token: refreshTokenValue });
}

export async function forgotPassword(email: string, tenantId: string) {
  const user = await User.findOne({ email, tenantId }).select(
    "+passwordResetToken +passwordResetExpires",
  );
  if (!user) {
    // Don't reveal if user exists
    return {
      message: "If the email is registered, you will receive a reset link.",
    };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  // TODO: Send email via notification service
  // For now, return token in dev mode
  const result: any = {
    message: "If the email is registered, you will receive a reset link.",
  };
  if (process.env.NODE_ENV === "development") {
    result.resetToken = resetToken;
  }
  return result;
}

export async function resetPassword(resetToken: string, newPassword: string) {
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetToken +passwordResetExpires");

  if (!user) {
    throw new BadRequestError("Invalid or expired reset token");
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Invalidate all refresh tokens for this user
  await RefreshToken.deleteMany({ userId: user._id });

  return { message: "Password reset successfully" };
}

// ---- Helpers ----

async function createTokenPair(user: any): Promise<TokenPair> {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    tenantId: user.tenantId ? user.tenantId.toString() : "",
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  };

  const accessToken = generateAccessToken(payload);
  const refreshTokenValue = generateRefreshToken();

  await RefreshToken.create({
    userId: user._id,
    tenantId: user.tenantId || undefined,
    token: refreshTokenValue,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  return { accessToken, refreshToken: refreshTokenValue };
}

// Seed the super admin on first startup
export async function seedSuperAdmin() {
  const existing = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existing) return;

  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@pharmasaas.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123";
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  await User.create({
    firstName: "Super",
    lastName: "Admin",
    email,
    password: hashedPassword,
    role: ROLES.SUPER_ADMIN,
    permissions: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN],
    isActive: true,
  });

  console.log(`🔑 Super Admin created: ${email} / ${password}`);
}

// Super admin: create tenant + owner in one step
export async function createTenantOwner(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  tenantId: string;
}) {
  const existing = await User.findOne({
    email: data.email,
    tenantId: data.tenantId,
  });
  if (existing) {
    throw new ConflictError(
      "User with this email already exists in this tenant",
    );
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
  const permissions = ROLE_PERMISSIONS[ROLES.TENANT_OWNER];

  const user = await User.create({
    ...data,
    password: hashedPassword,
    role: ROLES.TENANT_OWNER,
    permissions,
  });

  // Create default roles for the tenant
  await seedDefaultRoles(data.tenantId);

  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  };
}

async function seedDefaultRoles(tenantId: string) {
  const roles = [
    {
      name: ROLES.TENANT_OWNER,
      displayName: "Owner",
      permissions: ROLE_PERMISSIONS[ROLES.TENANT_OWNER],
      isSystem: true,
    },
    {
      name: ROLES.MANAGER,
      displayName: "Manager",
      permissions: ROLE_PERMISSIONS[ROLES.MANAGER],
      isSystem: true,
    },
    {
      name: ROLES.PHARMACIST,
      displayName: "Pharmacist",
      permissions: ROLE_PERMISSIONS[ROLES.PHARMACIST],
      isSystem: true,
    },
    {
      name: ROLES.CASHIER,
      displayName: "Cashier",
      permissions: ROLE_PERMISSIONS[ROLES.CASHIER],
      isSystem: true,
    },
    {
      name: ROLES.VIEWER,
      displayName: "Viewer",
      permissions: ROLE_PERMISSIONS[ROLES.VIEWER],
      isSystem: true,
    },
  ];

  for (const role of roles) {
    await Role.findOneAndUpdate(
      { name: role.name, tenantId },
      { ...role, tenantId },
      { upsert: true, new: true },
    );
  }
}
