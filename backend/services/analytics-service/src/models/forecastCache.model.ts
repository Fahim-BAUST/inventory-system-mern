import { mongoose } from "@pharmacy-saas/db";

const { Schema, model } = mongoose;

const forecastCacheSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, required: true },
    horizon: { type: Number, required: true },
    dailyDemand: { type: Number },
    weeklyDemand: { type: Number },
    monthlyDemand: { type: Number },
    trend: { type: String, enum: ["rising", "stable", "declining"] },
    trendSlope: { type: Number },
    demandStdDev: { type: Number },
    confidence: { type: String, enum: ["low", "medium", "high"] },
    seasonality: [Number],
    dataPoints: { type: Number },
    daysUntilStockout: { type: Number, default: null },
    suggestedReorderQty: { type: Number },
    safetyStock: { type: Number },
    estimatedCost: { type: Number },
    urgency: { type: String, enum: ["critical", "warning", "ok"] },
    nearestExpiry: { type: String, default: null },
    expiringQty: { type: Number, default: 0 },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// Unique per tenant + product + horizon
forecastCacheSchema.index(
  { tenantId: 1, productId: 1, horizon: 1 },
  { unique: true },
);
// TTL: auto-remove after 25 hours (cache is refreshed daily)
forecastCacheSchema.index({ computedAt: 1 }, { expireAfterSeconds: 90000 });

export const ForecastCache = model("ForecastCache", forecastCacheSchema);
