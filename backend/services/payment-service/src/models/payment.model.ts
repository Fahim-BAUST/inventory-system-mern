import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const paymentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    planId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "BDT" },
    transactionId: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled"],
      default: "pending",
    },
    gatewayResponse: { type: Schema.Types.Mixed },
    validFrom: { type: Date },
    validTo: { type: Date },
  },
  { timestamps: true },
);

export const Payment = model("Payment", paymentSchema);
