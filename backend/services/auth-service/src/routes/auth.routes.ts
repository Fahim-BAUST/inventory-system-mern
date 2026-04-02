import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import * as authService from "../services/auth.service";
import { BadRequestError } from "@pharmacy-saas/shared";

export const authRoutes = Router();

const validate = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors
      .array()
      .map((e) => e.msg)
      .join(", ");
    return next(new BadRequestError(messages));
  }
  next();
};

// POST /api/auth/register
authRoutes.post(
  "/register",
  [
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("tenantId").notEmpty().withMessage("Tenant ID is required"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.registerUser(req.body);
      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/login
authRoutes.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
    // tenantId is optional (super admin doesn't need it)
    body("tenantId").optional(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, tenantId } = req.body;
      const result = await authService.loginUser(email, password, tenantId);
      res.json({ success: true, message: "Login successful", data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/refresh-token
authRoutes.post(
  "/refresh-token",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refreshAccessToken(
        req.body.refreshToken,
      );
      res.json({ success: true, message: "Token refreshed", data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/logout
authRoutes.post(
  "/logout",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logoutUser(req.body.refreshToken);
      res.json({ success: true, message: "Logged out" });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/forgot-password
authRoutes.post(
  "/forgot-password",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("tenantId").notEmpty().withMessage("Tenant ID is required"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.forgotPassword(
        req.body.email,
        req.body.tenantId,
      );
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/reset-password
authRoutes.post(
  "/reset-password",
  [
    body("resetToken").notEmpty().withMessage("Reset token is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.resetPassword(
        req.body.resetToken,
        req.body.newPassword,
      );
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
);
