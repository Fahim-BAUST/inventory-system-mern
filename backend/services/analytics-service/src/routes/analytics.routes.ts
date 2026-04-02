import { Router, Request, Response, NextFunction } from "express";
import { mongoose } from "@pharmacy-saas/db";
import { DailySummary } from "../models/dailySummary.model";
import { PERMISSIONS } from "@pharmacy-saas/shared";
import { extractUser, requirePermission } from "../middleware/permissions";

export const analyticsRoutes = Router();

analyticsRoutes.use(extractUser);

// Helper: get a collection from the shared MongoDB
function col(name: string) {
  return mongoose.connection.db!.collection(name);
}

// GET /api/analytics/dashboard
analyticsRoutes.get(
  "/dashboard",
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const tid = new mongoose.Types.ObjectId(tenantId);

      // Date range support: ?from=YYYY-MM-DD&to=YYYY-MM-DD
      const fromParam = req.query.from as string;
      const toParam = req.query.to as string;
      const hasDateRange = !!(fromParam && toParam);

      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];

      // Determine date range for trend, top products, recent sales
      // When no date range: trend defaults to last 30 days, others show all-time
      const rangeFrom =
        fromParam ||
        new Date(Date.now() - 29 * 86400000).toISOString().split("T")[0];
      const rangeTo = toParam || today;
      const rangeFromDate = new Date(rangeFrom + "T00:00:00");
      const rangeToDate = new Date(rangeTo + "T23:59:59.999");

      // For KPI sales/revenue — all-time when no date range
      const kpiDateFilter: any = { tenantId };
      if (hasDateRange) {
        kpiDateFilter.date = { $gte: fromParam, $lte: toParam };
      }

      // Previous period for comparison
      const rangeDays = hasDateRange
        ? Math.max(
            1,
            Math.ceil(
              (rangeToDate.getTime() - rangeFromDate.getTime()) / 86400000,
            ),
          )
        : 30;
      const comparisonAnchor = hasDateRange ? rangeFromDate : new Date();
      const prevFrom = new Date(
        comparisonAnchor.getTime() - rangeDays * 86400000,
      )
        .toISOString()
        .split("T")[0];
      const prevTo = new Date(comparisonAnchor.getTime() - 86400000)
        .toISOString()
        .split("T")[0];

      // Sales/recent/top date filter — all-time when no range
      const salesDateFilter: any = { tenantId: tid };
      if (hasDateRange) {
        salesDateFilter.createdAt = { $gte: rangeFromDate, $lte: rangeToDate };
      }

      const [
        currentSummaries,
        prevSummaries,
        totalProducts,
        lowStockCount,
        recentSales,
        trendData,
        topProducts,
        expiringBatches,
        lowStockProducts,
      ] = await Promise.all([
        DailySummary.find(kpiDateFilter).lean(),
        DailySummary.find({
          tenantId,
          date: { $gte: prevFrom, $lte: prevTo },
        }).lean(),
        col("products").countDocuments({ tenantId: tid, isActive: true }),
        col("products").countDocuments({
          tenantId: tid,
          isActive: true,
          $expr: {
            $and: [
              { $gt: ["$totalStock", 0] },
              { $lte: ["$totalStock", "$reorderLevel"] },
            ],
          },
        }),
        col("sales")
          .find(salesDateFilter)
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray(),
        DailySummary.find({
          tenantId,
          date: { $gte: rangeFrom, $lte: rangeTo },
        })
          .sort({ date: 1 })
          .lean(),
        col("sales")
          .aggregate([
            {
              $match: salesDateFilter,
            },
            { $unwind: "$items" },
            {
              $group: {
                _id: { $ifNull: ["$items.productName", "$items.name"] },
                productId: { $first: "$items.productId" },
                totalQty: { $sum: "$items.quantity" },
                totalRevenue: {
                  $sum: {
                    $multiply: [
                      { $ifNull: ["$items.unitPrice", "$items.price"] },
                      "$items.quantity",
                    ],
                  },
                },
              },
            },
            { $sort: { totalQty: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "product",
              },
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
          ])
          .toArray(),
        col("batches")
          .find({
            tenantId: tid,
            expiryDate: { $lte: new Date(Date.now() + 30 * 86400000) },
            quantity: { $gt: 0 },
          })
          .sort({ expiryDate: 1 })
          .limit(5)
          .toArray(),
        col("products")
          .find({
            tenantId: tid,
            isActive: true,
            $expr: { $lte: ["$totalStock", "$reorderLevel"] },
          })
          .sort({ totalStock: 1 })
          .limit(5)
          .toArray(),
      ]);

      const todaySales = currentSummaries.reduce(
        (sum, d) => sum + (d.totalSales || 0),
        0,
      );
      const todayRevenue = currentSummaries.reduce(
        (sum, d) => sum + (d.totalRevenue || 0),
        0,
      );
      const ySales = prevSummaries.reduce(
        (sum, d) => sum + (d.totalSales || 0),
        0,
      );
      const yRevenue = prevSummaries.reduce(
        (sum, d) => sum + (d.totalRevenue || 0),
        0,
      );

      // Build alerts
      const alerts: any[] = [];
      for (const p of lowStockProducts) {
        alerts.push({
          type: "low_stock",
          productId: p._id,
          image: p.images?.[0]?.url || null,
          message: `${p.name} — only ${p.totalStock || 0} left`,
          severity: "warning",
        });
      }
      for (const b of expiringBatches) {
        const daysLeft = Math.ceil(
          (new Date(b.expiryDate).getTime() - Date.now()) / 86400000,
        );
        alerts.push({
          type: "expiry",
          message: `Batch ${b.batchNumber} expires ${daysLeft <= 0 ? "EXPIRED" : `in ${daysLeft} days`}`,
          severity: daysLeft <= 0 ? "danger" : "warning",
        });
      }

      res.json({
        success: true,
        data: {
          todaySales,
          todayRevenue,
          salesChange:
            ySales > 0 ? Math.round(((todaySales - ySales) / ySales) * 100) : 0,
          revenueChange:
            yRevenue > 0
              ? Math.round(((todayRevenue - yRevenue) / yRevenue) * 100)
              : 0,
          totalProducts,
          lowStockCount,
          recentSales: recentSales.map((s: any) => ({
            _id: s._id,
            invoiceNumber: s.invoiceNumber,
            totalAmount: s.totalAmount,
            itemCount: s.items?.length || 0,
            paymentMethod: s.paymentMethod,
            createdAt: s.createdAt,
          })),
          trend: trendData.map((d: any) => ({
            date: d.date,
            sales: d.totalSales,
            revenue: d.totalRevenue,
          })),
          topProducts: topProducts.map((p: any) => ({
            name: p._id,
            productId: p.productId || null,
            image: p.product?.images?.[0]?.url || null,
            quantity: p.totalQty,
            revenue: p.totalRevenue,
          })),
          alerts,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/analytics/reports/sales
analyticsRoutes.get(
  "/reports/sales",
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const tid = new mongoose.Types.ObjectId(tenantId);
      const { from, to } = req.query;

      // Daily summaries
      const filter: any = { tenantId };
      if (from) filter.date = { $gte: from as string };
      if (to) filter.date = { ...filter.date, $lte: to as string };

      const summaries = await DailySummary.find(filter)
        .sort({ date: 1 })
        .lean();

      // Totals
      const totals = summaries.reduce(
        (acc, d) => ({
          totalSales: acc.totalSales + (d.totalSales || 0),
          totalRevenue: acc.totalRevenue + (d.totalRevenue || 0),
          totalReturns: acc.totalReturns + (d.totalReturns || 0),
          totalItemsSold: acc.totalItemsSold + (d.itemsSold || 0),
        }),
        { totalSales: 0, totalRevenue: 0, totalReturns: 0, totalItemsSold: 0 },
      );

      // Top products for the period
      const dateFilter: any = { tenantId: tid };
      if (from) dateFilter.createdAt = { $gte: new Date(from as string) };
      if (to)
        dateFilter.createdAt = {
          ...dateFilter.createdAt,
          $lte: new Date((to as string) + "T23:59:59"),
        };

      const topProducts = await col("sales")
        .aggregate([
          { $match: dateFilter },
          { $unwind: "$items" },
          {
            $group: {
              _id: { $ifNull: ["$items.productName", "$items.name"] },
              productId: { $first: "$items.productId" },
              totalQty: { $sum: "$items.quantity" },
              totalRevenue: {
                $sum: {
                  $multiply: [
                    { $ifNull: ["$items.unitPrice", "$items.price"] },
                    "$items.quantity",
                  ],
                },
              },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "products",
              localField: "productId",
              foreignField: "_id",
              as: "product",
            },
          },
          { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
        ])
        .toArray();

      // Payment method breakdown
      const paymentBreakdown = await col("sales")
        .aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: "$paymentMethod",
              count: { $sum: 1 },
              total: { $sum: "$totalAmount" },
            },
          },
          { $sort: { total: -1 } },
        ])
        .toArray();

      res.json({
        success: true,
        data: {
          summaries: summaries.map((d: any) => ({
            date: d.date,
            sales: d.totalSales,
            revenue: d.totalRevenue,
            returns: d.totalReturns,
            items: d.itemsSold,
          })),
          totals,
          topProducts: topProducts.map((p: any) => ({
            name: p._id,
            productId: p.productId || null,
            image: p.product?.images?.[0]?.url || null,
            quantity: p.totalQty,
            revenue: p.totalRevenue,
          })),
          paymentBreakdown: paymentBreakdown.map((p: any) => ({
            method: p._id,
            count: p.count,
            total: p.total,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/analytics/reports/inventory
analyticsRoutes.get(
  "/reports/inventory",
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const tid = new mongoose.Types.ObjectId(tenantId);

      const [
        totalProducts,
        lowStock,
        outOfStock,
        expiringBatches,
        categoryBreakdown,
      ] = await Promise.all([
        col("products").countDocuments({ tenantId: tid, isActive: true }),
        col("products")
          .find({
            tenantId: tid,
            isActive: true,
            $expr: { $lte: ["$totalStock", "$reorderLevel"] },
            totalStock: { $gt: 0 },
          })
          .sort({ totalStock: 1 })
          .limit(20)
          .toArray(),
        col("products")
          .find({ tenantId: tid, isActive: true, totalStock: { $lte: 0 } })
          .sort({ name: 1 })
          .toArray(),
        col("batches")
          .find({
            tenantId: tid,
            expiryDate: { $lte: new Date(Date.now() + 90 * 86400000) },
            quantity: { $gt: 0 },
          })
          .sort({ expiryDate: 1 })
          .limit(20)
          .toArray(),
        col("products")
          .aggregate([
            { $match: { tenantId: tid, isActive: true } },
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
                totalValue: {
                  $sum: { $multiply: ["$costPrice", "$totalStock"] },
                },
              },
            },
            { $sort: { count: -1 } },
          ])
          .toArray(),
      ]);

      res.json({
        success: true,
        data: {
          totalProducts,
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock.length,
          lowStock: lowStock.map((p: any) => ({
            _id: p._id,
            name: p.name,
            sku: p.sku,
            stock: p.totalStock,
            reorderLevel: p.reorderLevel,
            image: p.images?.[0]?.url || null,
          })),
          outOfStock: outOfStock.map((p: any) => ({
            _id: p._id,
            name: p.name,
            sku: p.sku,
            image: p.images?.[0]?.url || null,
          })),
          expiringBatches: expiringBatches.map((b: any) => ({
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            quantity: b.quantity,
            daysLeft: Math.ceil(
              (new Date(b.expiryDate).getTime() - Date.now()) / 86400000,
            ),
          })),
          categoryBreakdown: categoryBreakdown.map((c: any) => ({
            category: c._id || "Uncategorized",
            count: c.count,
            value: c.totalValue,
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
