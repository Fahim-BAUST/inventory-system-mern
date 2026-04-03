import { Router, Request, Response, NextFunction } from "express";
import { Sale } from "../models/sale.model";
import { Customer } from "../models/customer.model";
import { Prescription } from "../models/prescription.model";
import { getNextInvoiceNumber } from "../models/counter.model";
import { extractUser, requirePermission } from "../middleware/permissions";
import {
  BadRequestError,
  NotFoundError,
  PERMISSIONS,
  EVENTS,
} from "@pharmacy-saas/shared";
import { publishEvent } from "@pharmacy-saas/rabbitmq";
import { mongoose } from "@pharmacy-saas/db";

export const salesRoutes = Router();
salesRoutes.use(extractUser);

// GET /api/sales
salesRoutes.get(
  "/",
  requirePermission(PERMISSIONS.SALES_READ),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      const filter: any = { tenantId };
      const from = req.query.from as string;
      const to = req.query.to as string;
      if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from + "T00:00:00");
        if (to) filter.createdAt.$lte = new Date(to + "T23:59:59.999");
      }

      const [sales, total] = await Promise.all([
        Sale.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Sale.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: sales,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/sales/:id
salesRoutes.get(
  "/:id",
  requirePermission(PERMISSIONS.SALES_READ),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const sale = await Sale.findOne({ _id: req.params.id, tenantId });
      if (!sale) return next(new NotFoundError("Sale not found"));
      res.json({ success: true, data: sale });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/sales
salesRoutes.post(
  "/",
  requirePermission(PERMISSIONS.SALES_CREATE),
  async (req, res, next) => {
    try {
      const { tenantId, userId } = (req as any).user;
      const {
        items,
        subtotal,
        discount,
        taxAmount,
        totalAmount,
        paymentMethod,
        customerId,
        prescriptionId,
      } = req.body;

      if (!items || items.length === 0) {
        return next(new BadRequestError("At least one item is required"));
      }

      // Generate invoice number
      const invoiceNumber = await getNextInvoiceNumber(tenantId);

      const sale = await Sale.create({
        tenantId,
        invoiceNumber,
        customerId: customerId || undefined,
        prescriptionId: prescriptionId || undefined,
        items,
        subtotal,
        taxAmount: taxAmount || 0,
        discount: discount || 0,
        totalAmount,
        paymentMethod: paymentMethod || "cash",
        paymentStatus: "paid",
        soldBy: userId,
      });

      // Update customer stats if linked
      if (customerId) {
        Customer.findByIdAndUpdate(customerId, {
          $inc: { totalPurchases: 1, totalSpent: totalAmount },
          lastVisit: new Date(),
        }).catch(() => {});
      }

      // Link sale to prescription and mark as dispensed
      if (prescriptionId) {
        Prescription.findOneAndUpdate(
          { _id: prescriptionId, tenantId },
          { $addToSet: { saleIds: sale._id }, $set: { status: "dispensed" } },
        ).catch(() => {});
        // Also try matching by prescriptionNumber
        Prescription.findOneAndUpdate(
          { prescriptionNumber: prescriptionId, tenantId },
          { $addToSet: { saleIds: sale._id }, $set: { status: "dispensed" } },
        ).catch(() => {});
      }

      // Publish sale event for analytics and inventory stock deduction
      try {
        await publishEvent(EVENTS.SALES_COMPLETED, {
          saleId: sale._id,
          tenantId,
          invoiceNumber,
          items,
          totalAmount,
          paymentMethod,
        });
      } catch {
        /* non-critical */
      }

      res
        .status(201)
        .json({ success: true, message: "Sale completed", data: sale });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/sales/:id/return
salesRoutes.post(
  "/:id/return",
  requirePermission(PERMISSIONS.SALES_RETURN),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const sale = await Sale.findOne({ _id: req.params.id, tenantId });
      if (!sale) return next(new NotFoundError("Sale not found"));
      if (sale.isReturned)
        return next(new BadRequestError("Sale already returned"));

      sale.isReturned = true;
      await sale.save();

      // Directly update DailySummary (reliable even without RabbitMQ)
      try {
        const today = new Date().toISOString().split("T")[0];
        await mongoose.connection
          .db!.collection("dailysummaries")
          .updateOne(
            { tenantId: new mongoose.Types.ObjectId(tenantId), date: today },
            { $inc: { totalReturns: 1, totalReturnAmount: sale.totalAmount } },
            { upsert: true },
          );
      } catch {
        /* non-critical */
      }

      try {
        await publishEvent(EVENTS.SALES_RETURN_PROCESSED, {
          saleId: sale._id,
          tenantId,
          items: sale.items,
          totalAmount: sale.totalAmount,
        });
      } catch {
        /* non-critical */
      }

      res.json({ success: true, message: "Return processed", data: sale });
    } catch (err) {
      next(err);
    }
  },
);
