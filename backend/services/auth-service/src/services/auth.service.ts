import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
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
    expiresIn: (process.env.JWT_ACCESS_EXPIRY || "15m") as any,
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

  // Send reset email
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Pharmacy SaaS" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 0;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 40px;text-align:center;">
                    <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;margin:0 auto 16px;line-height:56px;font-size:28px;">🔐</div>
                    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;letter-spacing:-0.3px;">Password Reset</h1>
                    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">We received a request to reset your password</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 40px;">
                    <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 8px;">Hi there,</p>
                    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 28px;">Someone requested a password reset for your Pharmacy SaaS account. Click the button below to choose a new password:</p>
                    
                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center">
                        <a href="${resetLink}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(79,70,229,0.4);">Reset My Password</a>
                      </td></tr>
                    </table>

                    <!-- Expiry notice -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:28px 0 0;">
                      <table cellpadding="0" cellspacing="0"><tr>
                        <td style="vertical-align:top;padding-right:10px;font-size:16px;">⏱️</td>
                        <td style="color:#64748b;font-size:13px;line-height:1.6;">This link will expire in <strong style="color:#334155;">1 hour</strong>. After that, you'll need to request a new one.</td>
                      </tr></table>
                    </div>

                    <!-- Alternative link -->
                    <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:24px 0 0;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break:break-all;font-size:12px;margin:6px 0 0;"><a href="${resetLink}" style="color:#4f46e5;text-decoration:underline;">${resetLink}</a></p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e2e8f0;"></div></td></tr>

                <!-- Security notice -->
                <tr>
                  <td style="padding:24px 40px;">
                    <table cellpadding="0" cellspacing="0"><tr>
                      <td style="vertical-align:top;padding-right:10px;font-size:16px;">🛡️</td>
                      <td style="color:#94a3b8;font-size:12px;line-height:1.6;">If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</td>
                    </tr></table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
                    <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Pharmacy SaaS. All rights reserved.</p>
                    <p style="color:#cbd5e1;font-size:11px;margin:8px 0 0;">This is an automated email. Please do not reply.</p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });
  } catch (err) {
    console.error("Failed to send reset email:", err);
  }

  return {
    message: "If the email is registered, you will receive a reset link.",
  };
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
