import { Router, Request, Response, NextFunction } from "express";
import { Supplier } from "../models/supplier.model";
import { extractUser, requirePermission } from "../middleware/permissions";
import { NotFoundError, PERMISSIONS } from "@pharmacy-saas/shared";

export const supplierRoutes = Router();
supplierRoutes.use(extractUser);

supplierRoutes.get(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const suppliers = await Supplier.find({ tenantId, isActive: true }).sort({
        name: 1,
      });
      res.json({ success: true, data: suppliers });
    } catch (err) {
      next(err);
    }
  },
);

supplierRoutes.post(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_CREATE),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const supplier = await Supplier.create({ ...req.body, tenantId });
      res.status(201).json({ success: true, data: supplier });
    } catch (err) {
      next(err);
    }
  },
);

supplierRoutes.patch(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const supplier = await Supplier.findOneAndUpdate(
        { _id: req.params.id, tenantId },
        req.body,
        { new: true },
      );
      if (!supplier) return next(new NotFoundError("Supplier not found"));
      res.json({ success: true, data: supplier });
    } catch (err) {
      next(err);
    }
  },
);

supplierRoutes.delete(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY_DELETE),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      await Supplier.findOneAndUpdate(
        { _id: req.params.id, tenantId },
        { isActive: false },
      );
      res.json({ success: true, message: "Supplier removed" });
    } catch (err) {
      next(err);
    }
  },
);
