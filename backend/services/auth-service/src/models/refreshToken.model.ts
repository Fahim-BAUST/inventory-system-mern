import { mongoose } from "@pharmacy-saas/db";

const { Schema, model } = mongoose;

export interface IRefreshTokenDoc {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshTokenDoc>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant" },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Auto-remove expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshTokenDoc>(
  "RefreshToken",
  refreshTokenSchema,
);
