import cron from "node-cron";
import { mongoose } from "@pharmacy-saas/db";
import { ForecastCache } from "../models/forecastCache.model";
import {
  computeForecast,
  computeDaysUntilStockout,
  computeSafetyStock,
  computeReorderQty,
  DEFAULT_FORECAST_CONFIG,
  type DailySale,
  type ForecastConfig,
} from "../utils/forecast";

function col(name: string) {
  return mongoose.connection.db!.collection(name);
}

async function refreshForecasts() {
  console.log("🔄 Refreshing forecast cache...");
  const startTime = Date.now();

  try {
    // Get all active tenants
    const tenants = await col("tenants")
      .find({ isActive: true })
      .project({ _id: 1, settings: 1 })
      .toArray();

    let totalCached = 0;

    for (const tenant of tenants) {
      const tid = tenant._id;
      const s = tenant.settings || {};
      const config: ForecastConfig = {
        leadTimeDays:
          s.forecastLeadTimeDays ?? DEFAULT_FORECAST_CONFIG.leadTimeDays,
        safetyFactor:
          s.forecastSafetyFactor ?? DEFAULT_FORECAST_CONFIG.safetyFactor,
        reviewPeriodDays:
          s.forecastReviewPeriodDays ??
          DEFAULT_FORECAST_CONFIG.reviewPeriodDays,
      };

      const horizon = 30; // Default horizon for cache

      // Aggregate sales
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
      const salesAgg = await col("sales")
        .aggregate([
          {
            $match: {
              tenantId: tid,
              createdAt: { $gte: ninetyDaysAgo },
              isReturned: { $ne: true },
            },
          },
          { $unwind: "$items" },
          {
            $group: {
              _id: {
                productId: "$items.productId",
                date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
              },
              quantity: { $sum: "$items.quantity" },
            },
          },
        ])
        .toArray();

      const salesByProduct = new Map<string, DailySale[]>();
      for (const row of salesAgg) {
        const pid = row._id.productId?.toString();
        if (!pid) continue;
        if (!salesByProduct.has(pid)) salesByProduct.set(pid, []);
        salesByProduct.get(pid)!.push({
          date: row._id.date,
          quantity: row.quantity,
        });
      }

      // Get products
      const products = await col("products")
        .find({ tenantId: tid, isActive: true })
        .project({
          totalStock: 1,
          reorderLevel: 1,
          costPrice: 1,
        })
        .toArray();

      // Expiring batches
      const horizonDate = new Date(Date.now() + horizon * 86400000);
      const expiringBatches = await col("batches")
        .aggregate([
          {
            $match: {
              tenantId: tid,
              quantity: { $gt: 0 },
              expiryDate: { $lte: horizonDate, $gte: new Date() },
            },
          },
          { $sort: { expiryDate: 1 } },
          {
            $group: {
              _id: "$productId",
              nearestExpiry: { $first: "$expiryDate" },
              expiringQty: { $sum: "$quantity" },
            },
          },
        ])
        .toArray();
      const expiryMap = new Map(
        expiringBatches.map((b: any) => [
          b._id.toString(),
          {
            nearestExpiry: (b.nearestExpiry as Date)
              .toISOString()
              .split("T")[0],
            expiringQty: b.expiringQty as number,
          },
        ]),
      );

      // Compute and upsert
      const bulkOps: any[] = [];
      for (const p of products) {
        const pid = p._id.toString();
        const sales = salesByProduct.get(pid) || [];
        const fc = computeForecast(sales);
        const currentStock = p.totalStock || 0;

        const daysUntilStockout = computeDaysUntilStockout(
          currentStock,
          fc.dailyDemand,
          fc.trendSlope,
          fc.seasonality,
        );
        const safetyStock = computeSafetyStock(
          fc.demandStdDev,
          config.leadTimeDays,
          config.safetyFactor,
        );
        const suggestedReorderQty = computeReorderQty(
          fc.dailyDemand,
          config.leadTimeDays,
          config.reviewPeriodDays,
          safetyStock,
          currentStock,
        );
        const daysForUrgency = daysUntilStockout ?? 9999;
        const urgency =
          daysForUrgency <= 7
            ? "critical"
            : daysForUrgency <= 21
              ? "warning"
              : "ok";
        const expiry = expiryMap.get(pid);

        bulkOps.push({
          updateOne: {
            filter: { tenantId: tid, productId: p._id, horizon },
            update: {
              $set: {
                ...fc,
                daysUntilStockout,
                suggestedReorderQty,
                safetyStock,
                estimatedCost: Math.round(
                  suggestedReorderQty * (p.costPrice || 0),
                ),
                urgency,
                nearestExpiry: expiry?.nearestExpiry || null,
                expiringQty: expiry?.expiringQty || 0,
                computedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }

      if (bulkOps.length > 0) {
        await ForecastCache.bulkWrite(bulkOps);
        totalCached += bulkOps.length;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `✅ Forecast cache refreshed: ${totalCached} products across ${tenants.length} tenants (${elapsed}s)`,
    );
  } catch (err) {
    console.error("❌ Forecast cache refresh failed:", err);
  }
}

export function startForecastCron() {
  // Run daily at 3:00 AM (off-peak hours)
  cron.schedule("0 3 * * *", refreshForecasts);
  console.log("📅 Forecast cron job scheduled (daily 3:00 AM)");

  // Also run once on startup (after a short delay to ensure DB is ready)
  setTimeout(refreshForecasts, 10000);
}
