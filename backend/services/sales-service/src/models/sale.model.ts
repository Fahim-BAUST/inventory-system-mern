import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const saleItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  batchId: { type: Schema.Types.ObjectId },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const saleSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId },
    items: [saleItemSchema],
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile", "credit"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "due"],
      default: "paid",
    },
    prescriptionId: { type: String },
    soldBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isReturned: { type: Boolean, default: false },
  },
  { timestamps: true },
);

saleSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ tenantId: 1, createdAt: -1 });

export const Sale = model("Sale", saleSchema);
