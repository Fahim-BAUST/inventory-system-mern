import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const counterSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Counter = model("Counter", counterSchema);

export async function getNextInvoiceNumber(tenantId: string): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { tenantId, name: "invoice" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  const padded = String(counter.seq).padStart(6, "0");
  return `INV-${padded}`;
}
