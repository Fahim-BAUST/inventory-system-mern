import { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "@pharmacy-saas/shared";
import type { PermissionType } from "@pharmacy-saas/shared";

export function extractUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const userId = req.headers["x-user-id"] as string;
  const tenantId = req.headers["x-tenant-id"] as string;
  const role = req.headers["x-user-role"] as string;
  const email = req.headers["x-user-email"] as string;

  let permissions: string[] = [];
  try {
    const raw = req.headers["x-user-permissions"] as string;
    if (raw) permissions = JSON.parse(raw);
  } catch {
    permissions = [];
  }

  if (!userId) {
    return next(new UnauthorizedError("User context missing"));
  }

  (req as any).user = {
    userId,
    tenantId: tenantId || null,
    role,
    email,
    permissions,
  };
  next();
}

export function requirePermission(...requiredPermissions: PermissionType[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return next(new UnauthorizedError());

    const hasAll = requiredPermissions.every((p) =>
      user.permissions.includes(p),
    );
    if (!hasAll) return next(new ForbiddenError("Insufficient permissions"));
    next();
  };
}
