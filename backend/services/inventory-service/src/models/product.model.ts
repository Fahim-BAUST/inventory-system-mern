import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const productSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    manufacturer: { type: String },
    dosageForm: { type: String },
    strength: { type: String },
    unit: { type: String, required: true, default: "piece" },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    taxRate: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    totalStock: { type: Number, default: 0 },
    drugSchedule: {
      type: String,
      enum: ["OTC", "prescription-only", "controlled"],
    },
    requiresPrescription: { type: Boolean, default: false },
    description: { type: String },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
productSchema.index({ tenantId: 1, name: "text", genericName: "text" });

export const Product = model("Product", productSchema);
