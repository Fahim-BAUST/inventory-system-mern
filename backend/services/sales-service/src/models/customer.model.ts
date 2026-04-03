import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const customerSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String },
    notes: { type: String },
    totalPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastVisit: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

customerSchema.index({ tenantId: 1, phone: 1 });

export const Customer = model("Customer", customerSchema);
