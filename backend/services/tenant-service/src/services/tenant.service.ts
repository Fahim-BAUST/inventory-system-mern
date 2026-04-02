import slugify from "slugify";
import { Tenant } from "../models/tenant.model";
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from "@pharmacy-saas/shared";

export async function createTenant(data: {
  name: string;
  type: string;
  email: string;
  phone: string;
  address?: any;
  licenseNumber?: string;
}) {
  let slug = slugify(data.name, { lower: true, strict: true });

  // Ensure unique slug
  const existing = await Tenant.findOne({ slug });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const tenant = await Tenant.create({
    ...data,
    slug,
    subscription: {
      planId: "free",
      status: "trial",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  return tenant;
}

export async function getTenantById(tenantId: string) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new NotFoundError("Tenant not found");
  return tenant;
}

export async function getTenantBySlug(slug: string) {
  const tenant = await Tenant.findOne({ slug });
  if (!tenant) throw new NotFoundError("Tenant not found");
  return tenant;
}

export async function updateTenant(
  tenantId: string,
  updates: Partial<{
    name: string;
    phone: string;
    address: any;
    logo: string;
    licenseNumber: string;
    settings: any;
  }>,
) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new NotFoundError("Tenant not found");

  // If settings are being updated, merge them
  if (updates.settings) {
    updates.settings = {
      ...(tenant.settings as any).toObject(),
      ...updates.settings,
    };
  }

  Object.assign(tenant, updates);
  await tenant.save();
  return tenant;
}

export async function getAllTenants(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [tenants, total] = await Promise.all([
    Tenant.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
    Tenant.countDocuments(),
  ]);

  return {
    tenants,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateTenantSubscription(
  tenantId: string,
  updates: {
    planId?: string;
    status?: "trial" | "active" | "expired" | "cancelled";
    trialEndsAt?: Date | null;
    currentPeriodEnd?: Date | null;
  },
) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new NotFoundError("Tenant not found");
  tenant.subscription = {
    ...(tenant.subscription as any).toObject(),
    ...updates,
  } as any;
  await tenant.save();
  return tenant;
}

export async function updateTenantStatus(tenantId: string, isActive: boolean) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new NotFoundError("Tenant not found");
  tenant.isActive = isActive;
  await tenant.save();
  return tenant;
}

export async function deleteTenant(tenantId: string) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new NotFoundError("Tenant not found");

  // Cascade delete all tenant data from all collections
  const { connection } = require("mongoose");
  const db = connection.db;

  const collections = [
    "users",
    "refreshtokens",
    "roles",
    "products",
    "categories",
    "suppliers",
    "batches",
    "sales",
    "counters",
    "dailysummaries",
    "payments",
    "notifications",
  ];

  const results: Record<string, number> = {};

  for (const col of collections) {
    try {
      const result = await db
        .collection(col)
        .deleteMany({ tenantId: tenant._id });
      results[col] = result.deletedCount;
    } catch {
      results[col] = 0;
    }
  }

  // Delete the tenant itself
  await Tenant.findByIdAndDelete(tenantId);

  console.log(`🗑️ Tenant "${tenant.name}" deleted with cascade:`, results);
  return { tenant, deletedCounts: results };
}
