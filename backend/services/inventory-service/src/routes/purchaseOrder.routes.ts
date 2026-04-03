import { Router, Request, Response, NextFunction } from "express";
import { PurchaseOrder } from "../models/purchaseOrder.model";
import { Product } from "../models/product.model";
import { Batch } from "../models/batch.model";
import { Supplier } from "../models/supplier.model";
import { extractUser, requirePermission } from "../middleware/permissions";
import {
  PERMISSIONS,
  NotFoundError,
  BadRequestError,
} from "@pharmacy-saas/shared";

export const purchaseOrderRoutes = Router();
purchaseOrderRoutes.use(extractUser);

// GET /api/inventory/purchase-orders
purchaseOrderRoutes.get(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const { status, search } = req.query;
      const filter: any = { tenantId };
      if (status) filter.status = status;
      if (search) {
        filter.$or = [
          { poNumber: { $regex: search, $options: "i" } },
          { supplierName: { $regex: search, $options: "i" } },
        ];
      }
      const orders = await PurchaseOrder.find(filter)
        .sort({ createdAt: -1 })
        .limit(200);
      res.json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/inventory/purchase-orders/:id
purchaseOrderRoutes.get(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId });
      if (!po) throw new NotFoundError("Purchase order not found");
      res.json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/inventory/purchase-orders
purchaseOrderRoutes.post(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = (req as any).user;
      const { supplierId, items, notes, expectedDate } = req.body;

      if (!supplierId || !items?.length) {
        throw new BadRequestError(
          "Supplier and at least one item are required",
        );
      }

      const supplier = await Supplier.findOne({
        _id: supplierId,
        tenantId,
        isActive: true,
      });
      if (!supplier) throw new NotFoundError("Supplier not found");

      // Generate PO number
      const count = await PurchaseOrder.countDocuments({ tenantId });
      const poNumber = `PO-${String(count + 1).padStart(5, "0")}`;

      const poItems = items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitCost: item.unitCost,
        total: item.quantity * item.unitCost,
      }));

      const totalAmount = poItems.reduce(
        (sum: number, i: any) => sum + i.total,
        0,
      );

      const po = await PurchaseOrder.create({
        tenantId,
        poNumber,
        supplierId,
        supplierName: supplier.name,
        items: poItems,
        totalAmount,
        notes,
        expectedDate,
        createdBy: userId,
      });

      res.status(201).json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/inventory/purchase-orders/:id — update draft PO
purchaseOrderRoutes.patch(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId });
      if (!po) throw new NotFoundError("Purchase order not found");
      if (po.status !== "draft") {
        throw new BadRequestError("Only draft orders can be edited");
      }

      const { items, notes, expectedDate, supplierId } = req.body;

      if (supplierId) {
        const supplier = await Supplier.findOne({
          _id: supplierId,
          tenantId,
          isActive: true,
        });
        if (!supplier) throw new NotFoundError("Supplier not found");
        po.supplierId = supplierId;
        po.supplierName = supplier.name;
      }

      if (items?.length) {
        po.items = items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.quantity * item.unitCost,
        }));
        po.totalAmount = po.items.reduce(
          (sum: number, i: any) => sum + i.total,
          0,
        );
      }

      if (notes !== undefined) po.notes = notes;
      if (expectedDate !== undefined) po.expectedDate = expectedDate;

      await po.save();

      res.json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/inventory/purchase-orders/:id/status — status transitions
purchaseOrderRoutes.post(
  "/:id/status",
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const { status } = req.body;
      const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId });
      if (!po) throw new NotFoundError("Purchase order not found");

      const validTransitions: Record<string, string[]> = {
        draft: ["ordered", "cancelled"],
        ordered: ["received", "partial", "cancelled"],
        partial: ["received", "cancelled"],
      };

      const allowed = validTransitions[po.status];
      if (!allowed || !allowed.includes(status)) {
        throw new BadRequestError(
          `Cannot transition from '${po.status}' to '${status}'`,
        );
      }

      // If receiving, create batches and update stock
      if (status === "received" || status === "partial") {
        const { receivedItems } = req.body; // [{productId, receivedQty}]
        if (receivedItems?.length) {
          for (const ri of receivedItems) {
            const poItem = po.items.find(
              (i: any) => i.productId.toString() === ri.productId,
            );
            if (!poItem) continue;
            const qty = Math.min(
              ri.receivedQty,
              poItem.quantity - (poItem as any).receivedQty,
            );
            if (qty <= 0) continue;

            (poItem as any).receivedQty += qty;

            // Create batch
            await Batch.create({
              tenantId,
              productId: ri.productId,
              batchNumber: `${po.poNumber}-${Date.now()}`,
              quantity: qty,
              expiryDate:
                ri.expiryDate ||
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              purchasePrice: (poItem as any).unitCost,
              supplierId: po.supplierId,
            });

            // Update product stock
            await Product.findByIdAndUpdate(ri.productId, {
              $inc: { totalStock: qty },
            });
          }
        }
      }

      po.status = status as any;
      await po.save();

      res.json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/inventory/purchase-orders/:id — only drafts
purchaseOrderRoutes.delete(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY_DELETE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const po = await PurchaseOrder.findOne({ _id: req.params.id, tenantId });
      if (!po) throw new NotFoundError("Purchase order not found");
      if (po.status !== "draft") {
        throw new BadRequestError("Only draft orders can be deleted");
      }
      await po.deleteOne();
      res.json({ success: true, message: "Deleted" });
    } catch (err) {
      next(err);
    }
  },
);
