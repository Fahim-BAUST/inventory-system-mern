import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { Customer } from "../models/customer.model";
import { extractUser, requirePermission } from "../middleware/permissions";
import {
  BadRequestError,
  NotFoundError,
  PERMISSIONS,
} from "@pharmacy-saas/shared";

export const customerRoutes = Router();
customerRoutes.use(extractUser);

const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return next(
      new BadRequestError(
        errors
          .array()
          .map((e) => e.msg)
          .join(", "),
      ),
    );
  next();
};

// GET /api/sales/customers
customerRoutes.get(
  "/",
  requirePermission(PERMISSIONS.SALES_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const search = req.query.search as string;

      const filter: any = { tenantId, isActive: true };
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      const customers = await Customer.find(filter)
        .sort({ lastVisit: -1, createdAt: -1 })
        .limit(50);

      res.json({ success: true, data: customers });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/sales/customers
customerRoutes.post(
  "/",
  requirePermission(PERMISSIONS.SALES_CREATE),
  [
    body("name").trim().notEmpty().withMessage("Customer name required"),
    body("phone").optional().trim(),
    body("email").optional().isEmail().withMessage("Invalid email"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const customer = await Customer.create({ ...req.body, tenantId });
      res
        .status(201)
        .json({ success: true, message: "Customer created", data: customer });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/sales/customers/:id
customerRoutes.patch(
  "/:id",
  requirePermission(PERMISSIONS.SALES_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const { name, phone, email, address, notes } = req.body;
      const update: any = {};
      if (name !== undefined) update.name = name;
      if (phone !== undefined) update.phone = phone;
      if (email !== undefined) update.email = email;
      if (address !== undefined) update.address = address;
      if (notes !== undefined) update.notes = notes;
      const customer = await Customer.findOneAndUpdate(
        { _id: req.params.id, tenantId },
        update,
        { new: true },
      );
      if (!customer) return next(new NotFoundError("Customer not found"));
      res.json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/sales/customers/:id (soft delete)
customerRoutes.delete(
  "/:id",
  requirePermission(PERMISSIONS.SALES_CREATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      await Customer.findOneAndUpdate(
        { _id: req.params.id, tenantId },
        { isActive: false },
      );
      res.json({ success: true, message: "Customer removed" });
    } catch (err) {
      next(err);
    }
  },
);
