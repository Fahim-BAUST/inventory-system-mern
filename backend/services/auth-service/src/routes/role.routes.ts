import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { Role } from "../models/role.model";
import { extractUser, requirePermission } from "../middleware/permissions";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  PERMISSIONS,
  ROLES,
} from "@pharmacy-saas/shared";
import { validationResult } from "express-validator";

export const roleRoutes = Router();

roleRoutes.use(extractUser);

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

// Only tenant_owner can create/modify/delete roles
function requireTenantOwner(req: Request, _res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user.role !== ROLES.TENANT_OWNER && user.role !== ROLES.SUPER_ADMIN) {
    return next(new ForbiddenError("Only the shop owner can manage roles"));
  }
  next();
}

// GET /api/auth/roles
roleRoutes.get(
  "/",
  requirePermission(PERMISSIONS.SETTINGS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const roles = await Role.find({ tenantId: user.tenantId }).sort({
        isSystem: -1,
        name: 1,
      });
      res.json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/roles — create custom role
roleRoutes.post(
  "/",
  requireTenantOwner,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  [
    body("name").trim().notEmpty().withMessage("Role name required"),
    body("displayName").trim().notEmpty().withMessage("Display name required"),
    body("permissions")
      .isArray({ min: 1 })
      .withMessage("At least one permission required"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const { name, displayName, permissions } = req.body;

      const existing = await Role.findOne({ name, tenantId: user.tenantId });
      if (existing)
        return next(new BadRequestError("Role name already exists"));

      const role = await Role.create({
        tenantId: user.tenantId,
        name,
        displayName,
        permissions,
        isSystem: false,
      });

      res.status(201).json({ success: true, data: role });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/auth/roles/:id
roleRoutes.patch(
  "/:id",
  requireTenantOwner,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const role = await Role.findOne({
        _id: req.params.id,
        tenantId: user.tenantId,
      });
      if (!role) return next(new NotFoundError("Role not found"));
      if (role.name === ROLES.TENANT_OWNER)
        return next(new BadRequestError("Cannot modify owner role"));

      const { displayName, permissions } = req.body;
      // System roles: only permissions can be changed, not the display name
      if (!role.isSystem && displayName) role.displayName = displayName;
      if (permissions) role.permissions = permissions;
      await role.save();

      res.json({ success: true, data: role });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/auth/roles/:id
roleRoutes.delete(
  "/:id",
  requireTenantOwner,
  requirePermission(PERMISSIONS.SETTINGS_UPDATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const role = await Role.findOne({
        _id: req.params.id,
        tenantId: user.tenantId,
      });
      if (!role) return next(new NotFoundError("Role not found"));
      if (role.isSystem)
        return next(new BadRequestError("Cannot delete system roles"));

      await Role.deleteOne({ _id: role._id });
      res.json({ success: true, message: "Role deleted" });
    } catch (err) {
      next(err);
    }
  },
);
