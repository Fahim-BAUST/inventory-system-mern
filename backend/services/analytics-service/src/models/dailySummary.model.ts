import { mongoose } from "@pharmacy-saas/db";
const { Schema, model } = mongoose;

const dailySummarySchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  totalSales: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  totalReturns: { type: Number, default: 0 },
  totalReturnAmount: { type: Number, default: 0 },
  itemsSold: { type: Number, default: 0 },
  lowStockAlerts: { type: Number, default: 0 },
  expiryAlerts: { type: Number, default: 0 },
});

dailySummarySchema.index({ tenantId: 1, date: 1 }, { unique: true });

export const DailySummary = model("DailySummary", dailySummarySchema);
