import { mongoose } from "@pharmacy-saas/db";

const { Schema, model } = mongoose;

export interface IUserDoc {
  tenantId?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUserDoc>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
      sparse: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    role: { type: String, required: true, default: "viewer" },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
  },
);

// Compound unique: one email per tenant (sparse for super admin with no tenant)
userSchema.index({ email: 1, tenantId: 1 }, { unique: true, sparse: true });

export const User = model<IUserDoc>("User", userSchema);
