import { Request, Response, NextFunction } from "express";
import { AppError } from "@pharmacy-saas/shared";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json({ success: false, message: err.message, code: err.code });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
}
