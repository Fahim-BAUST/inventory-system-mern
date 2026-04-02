import { mongoose } from "@pharmacy-saas/db";

const { Schema, model } = mongoose;

export interface ITenantDoc {
  name: string;
  slug: string;
  type: "pharmacy" | "grocery" | "electronics" | "general" | "other";
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  logo?: string;
  licenseNumber?: string;
  settings: {
    currency: string;
    timezone: string;
    taxRate: number;
    lowStockThreshold: number;
    expiryAlertDays: number;
  };
  subscription: {
    planId: string;
    status: "trial" | "active" | "expired" | "cancelled";
    trialEndsAt?: Date;
    currentPeriodEnd?: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenantDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["pharmacy", "grocery", "electronics", "general", "other"],
      default: "pharmacy",
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zipCode: { type: String, default: "" },
      country: { type: String, default: "Bangladesh" },
    },
    logo: { type: String },
    licenseNumber: { type: String },
    settings: {
      currency: { type: String, default: "BDT" },
      timezone: { type: String, default: "Asia/Dhaka" },
      taxRate: { type: Number, default: 0 },
      lowStockThreshold: { type: Number, default: 10 },
      expiryAlertDays: { type: Number, default: 90 },
    },
    subscription: {
      planId: { type: String, default: "free" },
      status: {
        type: String,
        enum: ["trial", "active", "expired", "cancelled"],
        default: "trial",
      },
      trialEndsAt: { type: Date },
      currentPeriodEnd: { type: Date },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Tenant = model<ITenantDoc>("Tenant", tenantSchema);
