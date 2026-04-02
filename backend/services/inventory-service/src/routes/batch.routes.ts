import { Router, Request, Response, NextFunction } from "express";
import { Batch } from "../models/batch.model";
import { Product } from "../models/product.model";
import { extractUser, requirePermission } from "../middleware/permissions";
import { PERMISSIONS, NotFoundError, EVENTS } from "@pharmacy-saas/shared";
import { publishEvent } from "@pharmacy-saas/rabbitmq";

export const batchRoutes = Router();
batchRoutes.use(extractUser);

// GET /api/inventory/expiry?days=90
batchRoutes.get(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const days = parseInt(req.query.days as string) || 90;
      const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      const batches = await Batch.find({
        tenantId,
        expiryDate: { $lte: cutoff },
        quantity: { $gt: 0 },
      })
        .populate("productId", "name sku")
        .sort({ expiryDate: 1 });

      const result = batches.map((b: any) => ({
        ...b.toObject(),
        productName: b.productId?.name,
        productSku: b.productId?.sku,
      }));

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ============ Product Batch CRUD ============

export const productBatchRoutes = Router({ mergeParams: true });
productBatchRoutes.use(extractUser);

// GET /api/inventory/products/:productId/batches
productBatchRoutes.get(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const { productId } = req.params;

      const batches = await Batch.find({ tenantId, productId }).sort({
        expiryDate: 1,
      });
      res.json({ success: true, data: batches });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/inventory/products/:productId/batches
productBatchRoutes.post(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_CREATE),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const { productId } = req.params;

      const product = await Product.findOne({ _id: productId, tenantId });
      if (!product) return next(new NotFoundError("Product not found"));

      const batch = await Batch.create({ ...req.body, tenantId, productId });

      // Update product stock
      product.totalStock = (product.totalStock || 0) + batch.quantity;
      await product.save();

      // Publish stock updated event
      try {
        await publishEvent(EVENTS.INVENTORY_STOCK_UPDATED, {
          tenantId,
          productId,
          productName: product.name,
          reason: "batch_added",
          newStock: product.totalStock,
        });
      } catch {
        /* non-critical */
      }

      res.status(201).json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/inventory/products/:productId/batches/:batchId
productBatchRoutes.patch(
  "/:batchId",
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const { productId, batchId } = req.params;

      const batch = await Batch.findOne({ _id: batchId, tenantId, productId });
      if (!batch) return next(new NotFoundError("Batch not found"));

      const oldQty = batch.quantity;
      const { quantity, batchNumber, expiryDate, purchasePrice } = req.body;

      if (batchNumber !== undefined) batch.batchNumber = batchNumber;
      if (expiryDate !== undefined) batch.expiryDate = expiryDate;
      if (purchasePrice !== undefined) batch.purchasePrice = purchasePrice;
      if (quantity !== undefined) {
        batch.quantity = quantity;
        // Update product totalStock by the delta
        const delta = quantity - oldQty;
        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { $inc: { totalStock: delta } },
          { new: true },
        );

        // Check low stock
        if (
          updatedProduct &&
          updatedProduct.totalStock <= updatedProduct.reorderLevel
        ) {
          try {
            await publishEvent(EVENTS.INVENTORY_STOCK_LOW, {
              tenantId,
              productId: updatedProduct._id,
              productName: updatedProduct.name,
              currentStock: updatedProduct.totalStock,
              reorderLevel: updatedProduct.reorderLevel,
            });
          } catch {
            /* non-critical */
          }
        }
      }

      await batch.save();
      res.json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  },
);
