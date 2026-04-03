import { Router, Request, Response, NextFunction } from "express";
import { AuditLog } from "../models/auditLog.model";
import { extractUser, requirePermission } from "../middleware/permissions";
import { PERMISSIONS, BadRequestError } from "@pharmacy-saas/shared";

export const auditRoutes = Router();
auditRoutes.use(extractUser);

// GET /api/analytics/audit-log
auditRoutes.get(
  "/",
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = (req as any).user;
      const { entity, action, search, page = "1", limit = "50" } = req.query;
      const filter: any = { tenantId };
      if (entity) filter.entity = entity;
      if (action) filter.action = action;
      if (search) {
        filter.$or = [
          { userName: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { entityId: { $regex: search, $options: "i" } },
        ];
      }

      const pageNum = Math.max(1, parseInt(page as string));
      const lim = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * lim;

      const [logs, total] = await Promise.all([
        AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim),
        AuditLog.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: logs,
        meta: {
          page: pageNum,
          limit: lim,
          total,
          pages: Math.ceil(total / lim),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/analytics/audit-log — any authenticated user can create audit entries
auditRoutes.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      if (!user?.tenantId) throw new BadRequestError("Authentication required");
      const { tenantId, userId } = user;
      const { action, entity, entityId, description, changes, userName } =
        req.body;
      if (!action || !entity) {
        throw new BadRequestError("action and entity are required");
      }

      const log = await AuditLog.create({
        tenantId,
        userId,
        userName: userName || undefined,
        action,
        entity,
        entityId,
        description,
        changes,
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });

      res.status(201).json({ success: true, data: log });
    } catch (err) {
      next(err);
    }
  },
);
