import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { extractUser, requirePermission } from "../middleware/permissions";
import * as authService from "../services/auth.service";
import { PERMISSIONS, ROLES, ForbiddenError } from "@pharmacy-saas/shared";
import { User } from "../models/user.model";
import { mongoose } from "@pharmacy-saas/db";

export const adminRoutes = Router();
adminRoutes.use(extractUser);

// Ensure only super_admin can access these routes
function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user.role !== ROLES.SUPER_ADMIN) {
    return next(new ForbiddenError("Super admin access required"));
  }
  next();
}

adminRoutes.use(requireSuperAdmin);

const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const { BadRequestError } = require("@pharmacy-saas/shared");
    return next(
      new BadRequestError(
        errors
          .array()
          .map((e: any) => e.msg)
          .join(", "),
      ),
    );
  }
  next();
};

// POST /api/admin/tenants/:tenantId/owner — create tenant owner with credentials
adminRoutes.post(
  "/tenants/:tenantId/owner",
  [
    body("firstName").trim().notEmpty().withMessage("First name required"),
    body("lastName").trim().notEmpty().withMessage("Last name required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("phone").optional().trim(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const owner = await authService.createTenantOwner({
        ...req.body,
        tenantId: req.params.tenantId,
      });
      res
        .status(201)
        .json({ success: true, message: "Tenant owner created", data: owner });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/tenants/:tenantId/users — list users of a tenant
adminRoutes.get(
  "/tenants/:tenantId/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await User.find({ tenantId: req.params.tenantId }).sort({
        createdAt: -1,
      });
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/stats — super admin dashboard stats
adminRoutes.get(
  "/stats",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [totalUsers, totalOwners] = await Promise.all([
        User.countDocuments({ role: { $ne: ROLES.SUPER_ADMIN } }),
        User.countDocuments({ role: ROLES.TENANT_OWNER }),
      ]);

      // Query Tenant collection directly (same MongoDB instance)
      const Tenant = mongoose.connection.db?.collection("tenants");
      let tenantStats = {
        totalTenants: 0,
        activeTenants: 0,
        suspendedTenants: 0,
        trialTenants: 0,
        expiredTenants: 0,
        planBreakdown: {} as Record<string, number>,
      };
      if (Tenant) {
        const [total, active, suspended, trial, expired, planAgg] =
          await Promise.all([
            Tenant.countDocuments({}),
            Tenant.countDocuments({ isActive: true }),
            Tenant.countDocuments({ isActive: false }),
            Tenant.countDocuments({ "subscription.status": "trial" }),
            Tenant.countDocuments({ "subscription.status": "expired" }),
            Tenant.aggregate([
              { $group: { _id: "$subscription.planId", count: { $sum: 1 } } },
            ]).toArray(),
          ]);
        tenantStats = {
          totalTenants: total,
          activeTenants: active,
          suspendedTenants: suspended,
          trialTenants: trial,
          expiredTenants: expired,
          planBreakdown: Object.fromEntries(
            planAgg.map((p: any) => [p._id, p.count]),
          ),
        };
      }

      res.json({
        success: true,
        data: { totalUsers, totalOwners, ...tenantStats },
      });
    } catch (err) {
      next(err);
    }
  },
);
