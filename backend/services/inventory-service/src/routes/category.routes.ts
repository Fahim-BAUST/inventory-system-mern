import { Router, Request, Response, NextFunction } from "express";
import { Category } from "../models/category.model";
import { Product } from "../models/product.model";
import { extractUser, requirePermission } from "../middleware/permissions";
import {
  BadRequestError,
  NotFoundError,
  PERMISSIONS,
} from "@pharmacy-saas/shared";

export const categoryRoutes = Router();
categoryRoutes.use(extractUser);

// GET
categoryRoutes.get(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_READ),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const categories = await Category.find({ tenantId })
        .sort({ name: 1 })
        .lean();

      // Count products per category (handle both 'categoryId' and 'category' fields)
      const counts = await Product.aggregate([
        {
          $match: {
            tenantId: new (require("mongoose").Types.ObjectId)(tenantId),
            isActive: { $ne: false },
          },
        },
        { $project: { catRef: { $ifNull: ["$categoryId", "$category"] } } },
        { $group: { _id: "$catRef", count: { $sum: 1 } } },
      ]);
      const countMap: Record<string, number> = {};
      for (const c of counts) {
        if (c._id) countMap[c._id.toString()] = c.count;
      }

      const data = categories.map((cat: any) => ({
        ...cat,
        productCount: countMap[cat._id.toString()] || 0,
      }));

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
);

// POST
categoryRoutes.post(
  "/",
  requirePermission(PERMISSIONS.INVENTORY_CREATE),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const category = await Category.create({ ...req.body, tenantId });
      res.status(201).json({ success: true, data: category });
    } catch (err: any) {
      if (err.code === 11000)
        return next(new BadRequestError("Category already exists"));
      next(err);
    }
  },
);

// PATCH
categoryRoutes.patch(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY_UPDATE),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      const category = await Category.findOneAndUpdate(
        { _id: req.params.id, tenantId },
        req.body,
        { new: true },
      );
      if (!category) return next(new NotFoundError("Category not found"));
      res.json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE
categoryRoutes.delete(
  "/:id",
  requirePermission(PERMISSIONS.INVENTORY_DELETE),
  async (req, res, next) => {
    try {
      const { tenantId } = (req as any).user;
      await Category.deleteOne({ _id: req.params.id, tenantId });
      res.json({ success: true, message: "Category deleted" });
    } catch (err) {
      next(err);
    }
  },
);
