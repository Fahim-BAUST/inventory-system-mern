import { User } from "../models/user.model";
import { Role } from "../models/role.model";
import bcrypt from "bcryptjs";
import { publishEvent } from "@pharmacy-saas/rabbitmq";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  EVENTS,
} from "@pharmacy-saas/shared";

const SALT_ROUNDS = 12;

export async function getUsers(tenantId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find({ tenantId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments({ tenantId }),
  ]);

  return {
    users,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getUserById(userId: string, tenantId: string) {
  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function inviteUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  tenantId: string;
  invitedBy: string;
}) {
  const existing = await User.findOne({
    email: data.email,
    tenantId: data.tenantId,
  });
  if (existing)
    throw new ConflictError(
      "User with this email already exists in this tenant",
    );

  // Get role permissions
  const role = await Role.findOne({ name: data.role, tenantId: data.tenantId });
  if (!role) throw new BadRequestError("Invalid role");

  // Create user with a temporary password (they'll reset via email)
  const tempPassword = await bcrypt.hash(
    Math.random().toString(36).slice(2),
    SALT_ROUNDS,
  );

  const user = await User.create({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: tempPassword,
    role: data.role,
    permissions: role.permissions,
    tenantId: data.tenantId,
    isActive: true,
  });

  try {
    await publishEvent(EVENTS.USER_INVITED, {
      userId: user._id,
      tenantId: data.tenantId,
      email: user.email,
      invitedBy: data.invitedBy,
    });
  } catch {
    // non-critical
  }

  return user;
}

export async function updateUser(
  userId: string,
  tenantId: string,
  updates: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    isActive: boolean;
  }>,
) {
  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) throw new NotFoundError("User not found");

  // If role is being updated, also update permissions
  if (updates.role) {
    const role = await Role.findOne({ name: updates.role, tenantId });
    if (!role) throw new BadRequestError("Invalid role");
    (updates as any).permissions = role.permissions;
  }

  Object.assign(user, updates);
  await user.save();
  return user;
}

export async function deleteUser(userId: string, tenantId: string) {
  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) throw new NotFoundError("User not found");

  // Soft delete
  user.isActive = false;
  await user.save();
  return { message: "User deactivated" };
}
