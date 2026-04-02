import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const categorySchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
  },
  { timestamps: true },
);

categorySchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Category = model("Category", categorySchema);
