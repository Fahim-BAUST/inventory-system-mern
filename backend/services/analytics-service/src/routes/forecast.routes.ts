import { Router, Request, Response, NextFunction } from "express";
import { mongoose } from "@pharmacy-saas/db";
import { PERMISSIONS } from "@pharmacy-saas/shared";
import {
  extractUser,
  requirePermission,
  requireFeature,
} from "../middleware/permissions";
import {
  computeForecast,
  computeDetailForecast,
  computeDaysUntilStockout,
  computeSafetyStock,
  computeReorderQty,
  applyCategoryFallback,
  DEFAULT_FORECAST_CONFIG,
  type DailySale,
  type ProductForecast,
  type ForecastConfig,
} from "../utils/forecast";

export const forecastRoutes = Router();
forecastRoutes.use(extractUser);

function col(name: string) {
  return mongoose.connection.db!.collection(name);
}

// ─── Load tenant forecast config (E) ──────────────────────────────
async function loadForecastConfig(
  tenantId: mongoose.Types.ObjectId,
): Promise<ForecastConfig> {
  const tenant = await col("tenants").findOne(
    { _id: tenantId },
    { projection: { settings: 1 } },
  );
  const s = tenant?.settings || {};
  return {
    leadTimeDays:
      s.forecastLeadTimeDays ?? DEFAULT_FORECAST_CONFIG.leadTimeDays,
    safetyFactor:
      s.forecastSafetyFactor ?? DEFAULT_FORECAST_CONFIG.safetyFactor,
    reviewPeriodDays:
      s.forecastReviewPeriodDays ?? DEFAULT_FORECAST_CONFIG.reviewPeriodDays,
  };
}

// ─── GET /api/analytics/forecast ───────────────────────────────────
forecastRoutes.get(
  "/",
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  requireFeature("forecasting"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const tid = new mongoose.Types.ObjectId(tenantId);
      const horizon = Math.min(
        Math.max(parseInt(req.query.horizon as string) || 30, 7),
        90,
      );
      const singleProductId = req.query.productId as string | undefined;

      // (E) Load tenant-specific forecast settings
      const config = await loadForecastConfig(tid);

      // 1. Aggregate daily sales per product (last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
      const salesMatch: any = {
        tenantId: tid,
        createdAt: { $gte: ninetyDaysAgo },
        isReturned: { $ne: true },
      };

      const salesAgg = await col("sales")
        .aggregate([
          { $match: salesMatch },
          { $unwind: "$items" },
          ...(singleProductId
            ? [
                {
                  $match: {
                    "items.productId": new mongoose.Types.ObjectId(
                      singleProductId,
                    ),
                  },
                },
              ]
            : []),
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
          { $sort: { "_id.date": 1 } },
        ])
        .toArray();

      // Group by product
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

      // 2. Get product data (include categoryId for fallback)
      const productFilter: any = { tenantId: tid, isActive: true };
      if (singleProductId) {
        productFilter._id = new mongoose.Types.ObjectId(singleProductId);
      }
      const products = await col("products")
        .find(productFilter)
        .project({
          name: 1,
          sku: 1,
          totalStock: 1,
          reorderLevel: 1,
          costPrice: 1,
          categoryId: 1,
          images: { $slice: ["$images", 1] },
        })
        .toArray();

      // (G) Compute category-average demand for cold-start fallback
      const categoryDemandMap = new Map<
        string,
        { total: number; count: number }
      >();
      // Build it from products that DO have sales
      for (const p of products) {
        const pid = p._id.toString();
        const sales = salesByProduct.get(pid);
        const catId = p.categoryId?.toString();
        if (!sales || !catId || sales.length < 7) continue;
        const fc = computeForecast(sales);
        if (!categoryDemandMap.has(catId)) {
          categoryDemandMap.set(catId, { total: 0, count: 0 });
        }
        const cat = categoryDemandMap.get(catId)!;
        cat.total += fc.dailyDemand;
        cat.count += 1;
      }

      // (F) Fetch soonest-expiring batches per product within horizon
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

      // 3. Compute forecast per product
      const forecasts: ProductForecast[] = [];

      for (const p of products) {
        const pid = p._id.toString();
        const sales = salesByProduct.get(pid) || [];
        let fc = computeForecast(sales);

        // (G) Apply category fallback for products with <7 data points
        const catId = p.categoryId?.toString();
        if (catId && categoryDemandMap.has(catId)) {
          const catData = categoryDemandMap.get(catId)!;
          const categoryAvg = catData.total / catData.count;
          fc = applyCategoryFallback(fc, categoryAvg);
        }

        const currentStock = p.totalStock || 0;

        // (B) Seasonality-aware stockout calculation
        const daysUntilStockout = computeDaysUntilStockout(
          currentStock,
          fc.dailyDemand,
          fc.trendSlope,
          fc.seasonality,
        );

        // (D) Proper safety stock + reorder quantity
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
        const urgency: ProductForecast["urgency"] =
          daysForUrgency <= 7
            ? "critical"
            : daysForUrgency <= 21
              ? "warning"
              : "ok";

        // (F) Expiry data
        const expiry = expiryMap.get(pid);

        forecasts.push({
          ...fc,
          productId: pid,
          productName: p.name,
          sku: p.sku || "",
          image: p.images?.[0]?.url || null,
          currentStock,
          reorderLevel: p.reorderLevel || 10,
          costPrice: p.costPrice || 0,
          daysUntilStockout: daysUntilStockout,
          suggestedReorderQty,
          safetyStock,
          estimatedCost: Math.round(suggestedReorderQty * (p.costPrice || 0)),
          urgency,
          nearestExpiry: expiry?.nearestExpiry || null,
          expiringQty: expiry?.expiringQty || 0,
        });
      }

      // Sort: critical first, then warning, then ok; within same urgency by daysUntilStockout
      const urgencyOrder = { critical: 0, warning: 1, ok: 2 };
      forecasts.sort(
        (a, b) =>
          urgencyOrder[a.urgency] - urgencyOrder[b.urgency] ||
          (a.daysUntilStockout ?? 9999) - (b.daysUntilStockout ?? 9999),
      );

      res.json({
        success: true,
        data: {
          forecasts,
          horizon,
          config,
          generatedAt: new Date().toISOString(),
          summary: {
            totalProducts: forecasts.length,
            criticalCount: forecasts.filter((f) => f.urgency === "critical")
              .length,
            warningCount: forecasts.filter((f) => f.urgency === "warning")
              .length,
            avgDailyDemand:
              Math.round(
                (forecasts.reduce((s, f) => s + f.dailyDemand, 0) /
                  (forecasts.length || 1)) *
                  100,
              ) / 100,
            totalReorderCost: forecasts.reduce(
              (s, f) => s + f.estimatedCost,
              0,
            ),
            expiringProducts: forecasts.filter((f) => f.expiringQty > 0).length,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/analytics/forecast/:productId ─────────────────────
forecastRoutes.get(
  "/:productId",
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  requireFeature("forecasting"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const tid = new mongoose.Types.ObjectId(tenantId);
      const pid = new mongoose.Types.ObjectId(req.params.productId);
      const horizon = Math.min(
        Math.max(parseInt(req.query.horizon as string) || 30, 7),
        90,
      );

      const config = await loadForecastConfig(tid);

      // Product data
      const product = await col("products").findOne({
        _id: pid,
        tenantId: tid,
      });
      if (!product) {
        res.status(404).json({ success: false, message: "Product not found" });
        return;
      }

      // Sales history last 90 days
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
          { $match: { "items.productId": pid } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              quantity: { $sum: "$items.quantity" },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      const sales: DailySale[] = salesAgg.map((r: any) => ({
        date: r._id,
        quantity: r.quantity,
      }));

      const fc = computeForecast(sales);

      // (A) Pass trendSlope to detail forecast for trend-adjusted projections
      const detail = computeDetailForecast(
        sales,
        product.totalStock || 0,
        horizon,
        fc.dailyDemand,
        fc.trendSlope,
        fc.seasonality,
      );

      // (D) Safety stock for this product
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
        product.totalStock || 0,
      );

      // (F) Expiry info for this product
      const horizonDate = new Date(Date.now() + horizon * 86400000);
      const expiringBatches = await col("batches")
        .find({
          tenantId: tid,
          productId: pid,
          quantity: { $gt: 0 },
          expiryDate: { $lte: horizonDate, $gte: new Date() },
        })
        .sort({ expiryDate: 1 })
        .project({ batchNumber: 1, expiryDate: 1, quantity: 1 })
        .toArray();

      // Last supplier (from most recent PO for this product)
      const lastPO = await col("purchaseorders")
        .find({
          tenantId: tid,
          "items.productId": pid,
          status: { $in: ["received", "partial", "ordered"] },
        })
        .sort({ createdAt: -1 })
        .limit(1)
        .project({ supplierId: 1, supplierName: 1 })
        .toArray();

      res.json({
        success: true,
        data: {
          product: {
            _id: product._id,
            name: product.name,
            sku: product.sku,
            currentStock: product.totalStock || 0,
            reorderLevel: product.reorderLevel || 10,
            costPrice: product.costPrice || 0,
            image: product.images?.[0]?.url || null,
          },
          forecast: detail,
          safetyStock,
          suggestedReorderQty,
          config,
          expiringBatches: expiringBatches.map((b: any) => ({
            batchNumber: b.batchNumber,
            expiryDate: (b.expiryDate as Date).toISOString().split("T")[0],
            quantity: b.quantity,
          })),
          lastSupplier: lastPO[0]
            ? {
                supplierId: lastPO[0].supplierId,
                supplierName: lastPO[0].supplierName,
              }
            : null,
          horizon,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
