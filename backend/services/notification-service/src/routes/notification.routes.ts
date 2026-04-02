import { Router, Request, Response, NextFunction } from "express";
import { Notification } from "../models/notification.model";
import { extractUser } from "../middleware/permissions";

export const notificationRoutes = Router();

notificationRoutes.use(extractUser);

// GET /api/notifications
notificationRoutes.get("/", async (req, res, next) => {
  try {
    const { userId, tenantId } = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    const filter = {
      tenantId,
      $or: [{ userId }, { userId: null }], // user-specific + broadcast
    };

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    res.json({
      success: true,
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
notificationRoutes.patch("/:id/read", async (req, res, next) => {
  try {
    const { tenantId } = (req as any).user;
    await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { isRead: true },
    );
    res.json({ success: true, message: "Marked as read" });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/read-all
notificationRoutes.post("/read-all", async (req, res, next) => {
  try {
    const { userId, tenantId } = (req as any).user;
    await Notification.updateMany(
      { tenantId, $or: [{ userId }, { userId: null }], isRead: false },
      { isRead: true },
    );
    res.json({ success: true, message: "All marked as read" });
  } catch (err) {
    next(err);
  }
});
