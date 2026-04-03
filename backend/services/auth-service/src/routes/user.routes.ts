import { Router, Request, Response, NextFunction } from "express";
import { body, query } from "express-validator";
import * as userService from "../services/user.service";
import { extractUser, requirePermission } from "../middleware/permissions";
import {
  BadRequestError,
  ForbiddenError,
  PERMISSIONS,
  getPlanLimit,
} from "@pharmacy-saas/shared";
import { validationResult } from "express-validator";
import { mongoose } from "@pharmacy-saas/db";

export const userRoutes = Router();

// All user routes require authentication (handled by gateway)
userRoutes.use(extractUser);

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

// GET /api/auth/users
userRoutes.get(
  "/",
  requirePermission(PERMISSIONS.USERS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const result = await userService.getUsers(user.tenantId, page, limit);
      res.json({ success: true, data: result.users, meta: result.meta });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/auth/users/:id
userRoutes.get(
  "/:id",
  requirePermission(PERMISSIONS.USERS_READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const result = await userService.getUserById(
        req.params.id,
        user.tenantId,
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/users/invite
userRoutes.post(
  "/invite",
  requirePermission(PERMISSIONS.USERS_CREATE),
  [
    body("firstName").trim().notEmpty().withMessage("First name required"),
    body("lastName").trim().notEmpty().withMessage("Last name required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("role").notEmpty().withMessage("Role is required"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = (req as any).user;

      // Enforce plan user limit
      const db = mongoose.connection.db;
      if (db) {
        const tid = new mongoose.Types.ObjectId(currentUser.tenantId);
        const [tenant, userCount] = await Promise.all([
          db
            .collection("tenants")
            .findOne(
              { _id: tid },
              { projection: { "subscription.planId": 1 } },
            ),
          db.collection("users").countDocuments({ tenantId: tid }),
        ]);
        const planId = tenant?.subscription?.planId || "free";
        const maxUsers = getPlanLimit(planId, "maxUsers");
        if (userCount >= maxUsers) {
          return next(
            new ForbiddenError(
              `Your ${planId} plan allows up to ${maxUsers} user(s). Please upgrade to add more.`,
            ),
          );
        }
      }

      const result = await userService.inviteUser({
        ...req.body,
        tenantId: currentUser.tenantId,
        invitedBy: currentUser.userId,
      });
      res
        .status(201)
        .json({ success: true, message: "User invited", data: result });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/auth/users/:id
userRoutes.patch(
  "/:id",
  requirePermission(PERMISSIONS.USERS_UPDATE),
  [
    body("phone")
      .optional()
      .trim()
      .matches(/^\+?[\d\s\-()]{7,20}$/)
      .withMessage("Invalid phone format"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = (req as any).user;
      const result = await userService.updateUser(
        req.params.id,
        currentUser.tenantId,
        req.body,
      );
      res.json({ success: true, message: "User updated", data: result });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/auth/users/:id
userRoutes.delete(
  "/:id",
  requirePermission(PERMISSIONS.USERS_DELETE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = (req as any).user;
      const result = await userService.deleteUser(
        req.params.id,
        currentUser.tenantId,
      );
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
);
