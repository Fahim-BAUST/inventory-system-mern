import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import * as tenantService from "../services/tenant.service";
import { extractUser, requirePermission } from "../middleware/permissions";
import { BadRequestError, PERMISSIONS, EVENTS } from "@pharmacy-saas/shared";

export const tenantRoutes = Router();

const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new BadRequestError(
        errors
          .array()
          .map((e) => e.msg)
          .join(", "),
      ),
    );
  }
  next();
};

// POST /api/tenants — public: create new tenant (during registration)
tenantRoutes.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Shop name is required"),
    body("type")
      .isIn(["pharmacy", "grocery", "electronics", "general", "other"])
      .withMessage("Invalid shop type"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("phone").trim().notEmpty().withMessage("Phone number is required"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = await tenantService.createTenant(req.body);
      res
        .status(201)
        .json({ success: true, message: "Tenant created", data: tenant });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/tenants/me — get current tenant info
tenantRoutes.get(
  "/me",
  extractUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const tenant = await tenantService.getTenantById(user.tenantId);
      res.json({ success: true, data: tenant });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/tenants/slug/:slug — resolve tenant by slug (for login page)
tenantRoutes.get(
  "/slug/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = await tenantService.getTenantBySlug(req.params.slug);
      // Only return public info
      res.json({
        success: true,
        data: {
          _id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          type: tenant.type,
          logo: tenant.logo,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/tenants/me — update current tenant
tenantRoutes.patch(
  "/me",
  extractUser,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const tenant = await tenantService.updateTenant(user.tenantId, req.body);
      res.json({ success: true, message: "Tenant updated", data: tenant });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/tenants — super admin: list all tenants
tenantRoutes.get(
  "/",
  extractUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user.role !== "super_admin") {
        return res
          .status(403)
          .json({ success: false, message: "Super admin only" });
      }
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const result = await tenantService.getAllTenants(page, limit);
      res.json({ success: true, data: result.tenants, meta: result.meta });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/tenants/:id — super admin: get a single tenant's full details
tenantRoutes.get(
  "/:id",
  extractUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user.role !== "super_admin") {
        return res
          .status(403)
          .json({ success: false, message: "Super admin only" });
      }
      const tenant = await tenantService.getTenantById(req.params.id);
      res.json({ success: true, data: tenant });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/tenants/:id/subscription — super admin: change plan / status / trial
tenantRoutes.patch(
  "/:id/subscription",
  extractUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user.role !== "super_admin") {
        return res
          .status(403)
          .json({ success: false, message: "Super admin only" });
      }
      const tenant = await tenantService.updateTenantSubscription(
        req.params.id,
        req.body,
      );
      res.json({
        success: true,
        message: "Subscription updated",
        data: tenant,
      });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/tenants/:id/status — super admin: activate or suspend a tenant
tenantRoutes.patch(
  "/:id/status",
  extractUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user.role !== "super_admin") {
        return res
          .status(403)
          .json({ success: false, message: "Super admin only" });
      }
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res
          .status(400)
          .json({ success: false, message: "isActive (boolean) required" });
      }
      const tenant = await tenantService.updateTenantStatus(
        req.params.id,
        isActive,
      );
      res.json({
        success: true,
        message: `Tenant ${isActive ? "activated" : "suspended"}`,
        data: tenant,
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/tenants/:id — super admin: delete a tenant and ALL related data
tenantRoutes.delete(
  "/:id",
  extractUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (user.role !== "super_admin") {
        return res
          .status(403)
          .json({ success: false, message: "Super admin only" });
      }
      const result = await tenantService.deleteTenant(req.params.id);

      try {
        const { publishEvent } = require("@pharmacy-saas/rabbitmq");
        await publishEvent(EVENTS.TENANT_DELETED, {
          tenantId: req.params.id,
          tenantName: result.tenant.name,
        });
      } catch {
        /* non-critical */
      }

      res.json({
        success: true,
        message: `Tenant "${result.tenant.name}" and all related data deleted`,
        data: result.deletedCounts,
      });
    } catch (err) {
      next(err);
    }
  },
);
