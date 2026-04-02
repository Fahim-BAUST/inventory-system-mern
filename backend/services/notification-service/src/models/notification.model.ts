import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const notificationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, index: true }, // null = broadcast to tenant
    type: {
      type: String,
      enum: [
        "low_stock",
        "expiry_warning",
        "payment",
        "subscription",
        "system",
        "user",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

notificationSchema.index({ tenantId: 1, isRead: 1, createdAt: -1 });

export const Notification = model("Notification", notificationSchema);
