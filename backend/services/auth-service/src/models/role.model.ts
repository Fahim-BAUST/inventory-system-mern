import { mongoose } from "@pharmacy-saas/db";

const { Schema, model } = mongoose;

export interface IRoleDoc {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  displayName: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRoleDoc>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

roleSchema.index({ name: 1, tenantId: 1 }, { unique: true });

export const Role = model<IRoleDoc>("Role", roleSchema);
