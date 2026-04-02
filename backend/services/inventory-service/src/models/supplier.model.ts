import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const supplierSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    company: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Supplier = model("Supplier", supplierSchema);
