import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const poItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitCost: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true },
  receivedQty: { type: Number, default: 0 },
});

const purchaseOrderSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    poNumber: { type: String, required: true },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: { type: String, required: true },
    items: [poItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "ordered", "partial", "received", "cancelled"],
      default: "draft",
    },
    notes: { type: String },
    expectedDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

purchaseOrderSchema.index({ tenantId: 1, poNumber: 1 }, { unique: true });

export const PurchaseOrder = model("PurchaseOrder", purchaseOrderSchema);
