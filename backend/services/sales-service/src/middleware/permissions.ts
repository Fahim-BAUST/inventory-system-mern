import { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "@pharmacy-saas/shared";
import type { PermissionType } from "@pharmacy-saas/shared";

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
