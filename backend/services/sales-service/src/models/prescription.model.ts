import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const prescriptionSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    prescriptionNumber: { type: String, required: true },
    patientName: { type: String, required: true },
    doctorName: { type: String },
    doctorPhone: { type: String },
    diagnosis: { type: String },
    medications: { type: String },
    notes: { type: String },
    customerId: { type: Schema.Types.ObjectId },
    saleIds: [{ type: Schema.Types.ObjectId, ref: "Sale" }],
    imageUrl: { type: String },
    status: {
      type: String,
      enum: ["active", "dispensed", "expired"],
      default: "active",
    },
  },
  { timestamps: true },
);

prescriptionSchema.index(
  { tenantId: 1, prescriptionNumber: 1 },
  { unique: true },
);

export const Prescription = model("Prescription", prescriptionSchema);
