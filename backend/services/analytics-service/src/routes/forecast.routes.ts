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
  type DailySale,
  type ProductForecast,
} from "../utils/forecast";

export const forecastRoutes = Router();
forecastRoutes.use(extractUser);

function col(name: string) {
  return mongoose.connection.db!.collection(name);
}

// ─── GET /api/analytics/forecast ───────────────────────────────────
// Returns demand forecasts for all active products (or one if ?productId=)
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
      const safetyFactor = 1.5;
      const singleProductId = req.query.productId as string | undefined;

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

      // 2. Get product data
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
          images: { $slice: ["$images", 1] },
        })
        .toArray();

      // 3. Compute forecast per product
      const forecasts: ProductForecast[] = [];

      for (const p of products) {
        const pid = p._id.toString();
        const sales = salesByProduct.get(pid) || [];
        const fc = computeForecast(sales);

        const currentStock = p.totalStock || 0;
        const daysUntilStockout =
          fc.dailyDemand > 0 ? Math.round(currentStock / fc.dailyDemand) : 9999;

        const neededQty = Math.ceil(
          horizon * fc.dailyDemand * safetyFactor - currentStock,
        );
        const suggestedReorderQty = Math.max(0, neededQty);

        const urgency: ProductForecast["urgency"] =
          daysUntilStockout <= 7
            ? "critical"
            : daysUntilStockout <= 21
              ? "warning"
              : "ok";

        forecasts.push({
          ...fc,
          productId: pid,
          productName: p.name,
          sku: p.sku || "",
          image: p.images?.[0]?.url || null,
          currentStock,
          reorderLevel: p.reorderLevel || 10,
          costPrice: p.costPrice || 0,
          daysUntilStockout,
          suggestedReorderQty,
          estimatedCost: Math.round(suggestedReorderQty * (p.costPrice || 0)),
          urgency,
        });
      }

      // Sort: critical first, then warning, then ok; within same urgency by daysUntilStockout
      const urgencyOrder = { critical: 0, warning: 1, ok: 2 };
      forecasts.sort(
        (a, b) =>
          urgencyOrder[a.urgency] - urgencyOrder[b.urgency] ||
          a.daysUntilStockout - b.daysUntilStockout,
      );

      res.json({
        success: true,
        data: {
          forecasts,
          horizon,
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
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/analytics/forecast/:productId ─────────────────────
// Detailed forecast for a single product (history + projections + depletion)
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
      const detail = computeDetailForecast(
        sales,
        product.totalStock || 0,
        horizon,
        fc.dailyDemand,
        fc.seasonality,
      );

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
