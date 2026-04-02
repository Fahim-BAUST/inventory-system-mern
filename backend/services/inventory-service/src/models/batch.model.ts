import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const batchSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    manufactureDate: { type: Date },
    expiryDate: { type: Date, required: true },
    purchasePrice: { type: Number, min: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
  },
  { timestamps: true },
);

batchSchema.index({ tenantId: 1, expiryDate: 1 });

export const Batch = model("Batch", batchSchema);
