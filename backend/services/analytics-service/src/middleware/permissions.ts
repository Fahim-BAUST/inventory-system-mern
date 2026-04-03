import { Request, Response, NextFunction } from "express";
import {
  UnauthorizedError,
  ForbiddenError,
  planHasFeature,
} from "@pharmacy-saas/shared";
import type { PermissionType } from "@pharmacy-saas/shared";
import { mongoose } from "@pharmacy-saas/db";

export function extractUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const userId = req.headers["x-user-id"] as string;
  const tenantId = req.headers["x-tenant-id"] as string;
  const role = req.headers["x-user-role"] as string;
  let permissions: string[] = [];
  try {
    permissions = JSON.parse(
      (req.headers["x-user-permissions"] as string) || "[]",
    );
  } catch {
    permissions = [];
  }

  if (!userId || !tenantId)
    return next(new UnauthorizedError("User context missing"));
  (req as any).user = { userId, tenantId, role, permissions };
  next();
}

export function requirePermission(...required: PermissionType[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return next(new UnauthorizedError());
    if (!required.every((p) => user.permissions.includes(p)))
      return next(new ForbiddenError("Insufficient permissions"));
    next();
  };
}

export function requireFeature(feature: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user?.tenantId) return next(new UnauthorizedError());
      const db = mongoose.connection.db;
      if (!db) return next(new Error("Database not available"));
      const tenant = await db
        .collection("tenants")
        .findOne(
          { _id: new mongoose.Types.ObjectId(user.tenantId) },
          { projection: { "subscription.planId": 1 } },
        );
      const planId = tenant?.subscription?.planId || "free";
      if (!planHasFeature(planId, feature)) {
        return next(
          new ForbiddenError(
            `Your plan does not include the "${feature}" feature. Please upgrade.`,
          ),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
