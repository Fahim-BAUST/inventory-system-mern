import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "@pharmacy-saas/shared";
import type { JwtPayload } from "@pharmacy-saas/shared";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Access token is required"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || "default-secret",
    ) as JwtPayload;

    req.user = decoded;

    // Forward user info to downstream services via headers
    req.headers["x-user-id"] = decoded.userId;
    req.headers["x-tenant-id"] = decoded.tenantId;
    req.headers["x-user-role"] = decoded.role;
    req.headers["x-user-permissions"] = JSON.stringify(decoded.permissions);
    req.headers["x-user-email"] = decoded.email;

    next();
  } catch (err) {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
}
