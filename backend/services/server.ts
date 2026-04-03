/**
 * Unified Server — Single-process mode for deployment.
 * Mounts all service routes directly (no proxy, no inter-service HTTP).
 * Used by: Render, Railway, or any single-process host.
 *
 * Build:  npm run build:unified
 * Start:  npm start
 */
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB } from "@pharmacy-saas/db";
import { connectRabbitMQ, consumeEvents } from "@pharmacy-saas/rabbitmq";
import { EVENTS } from "@pharmacy-saas/shared";

// Auth middleware (from gateway)
import { authMiddleware } from "./gateway/src/middleware/auth";

// Routes from each service
import { authRoutes } from "./auth-service/src/routes/auth.routes";
import { userRoutes } from "./auth-service/src/routes/user.routes";
import { roleRoutes } from "./auth-service/src/routes/role.routes";
import { adminRoutes } from "./auth-service/src/routes/admin.routes";
import { seedSuperAdmin } from "./auth-service/src/services/auth.service";

import { tenantRoutes } from "./tenant-service/src/routes/tenant.routes";
import { Tenant } from "./tenant-service/src/models/tenant.model";

import { productRoutes } from "./inventory-service/src/routes/product.routes";
import { categoryRoutes } from "./inventory-service/src/routes/category.routes";
import { supplierRoutes } from "./inventory-service/src/routes/supplier.routes";
import {
  batchRoutes,
  productBatchRoutes,
} from "./inventory-service/src/routes/batch.routes";
import { purchaseOrderRoutes } from "./inventory-service/src/routes/purchaseOrder.routes";
import { startExpiryCron } from "./inventory-service/src/cron/expiryChecker";
import { handleInventoryEvent } from "./inventory-service/src/consumers/inventoryConsumer";

import { salesRoutes } from "./sales-service/src/routes/sales.routes";
import { customerRoutes } from "./sales-service/src/routes/customer.routes";
import { prescriptionRoutes } from "./sales-service/src/routes/prescription.routes";

import { analyticsRoutes } from "./analytics-service/src/routes/analytics.routes";
import { auditRoutes } from "./analytics-service/src/routes/audit.routes";
import { forecastRoutes } from "./analytics-service/src/routes/forecast.routes";
import { handleAnalyticsEvent } from "./analytics-service/src/consumers/analyticsConsumer";

import { paymentRoutes } from "./payment-service/src/routes/payment.routes";

import { notificationRoutes } from "./notification-service/src/routes/notification.routes";
import { handleNotificationEvent } from "./notification-service/src/consumers/notificationConsumer";

// Gateway error handler
import { errorHandler } from "./gateway/src/middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security & Middleware ───
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ───
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Pharmacy SaaS API running",
    timestamp: new Date().toISOString(),
  });
});

// ─── Public Routes (no auth required) ───
const publicPaths = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/refresh-token",
  "/api/tenants/slug/",
  "/api/payments/webhook",
  "/api/payments/success",
  "/api/payments/fail",
  "/api/payments/cancel",
  "/api/payments/plans",
];

app.use("/api", (req, res, next) => {
  const fullPath = `/api${req.path}`;
  const isPublic = publicPaths.some((p) => fullPath.startsWith(p));
  if (isPublic) return next();
  return authMiddleware(req, res, next);
});

// ─── Mount All Service Routes ───

// Auth
app.use("/api/auth", authRoutes);
app.use("/api/auth/users", userRoutes);
app.use("/api/auth/roles", roleRoutes);
app.use("/api/admin", adminRoutes);

// Tenant
app.use("/api/tenants", tenantRoutes);

// Inventory
app.use("/api/inventory/purchase-orders", purchaseOrderRoutes);
app.use("/api/inventory/products/:productId/batches", productBatchRoutes);
app.use("/api/inventory/products", productRoutes);
app.use("/api/inventory/categories", categoryRoutes);
app.use("/api/inventory/suppliers", supplierRoutes);
app.use("/api/inventory/expiry", batchRoutes);

// Sales (specific paths first)
app.use("/api/sales/customers", customerRoutes);
app.use("/api/sales/prescriptions", prescriptionRoutes);
app.use("/api/sales", salesRoutes);

// Analytics (specific paths first)
app.use("/api/analytics/audit-log", auditRoutes);
app.use("/api/analytics/forecast", forecastRoutes);
app.use("/api/analytics", analyticsRoutes);

// Payments
app.use("/api/payments", paymentRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// ─── Error Handler ───
app.use(errorHandler);

// ─── Tenant Event Handler ───
async function handleTenantEvent(routingKey: string, data: any) {
  switch (routingKey) {
    case EVENTS.PAYMENT_SUCCESS: {
      const { tenantId, planId, validTo } = data;
      if (!tenantId || !planId) break;
      await Tenant.findByIdAndUpdate(tenantId, {
        "subscription.planId": planId,
        "subscription.status": "active",
        "subscription.currentPeriodEnd": validTo
          ? new Date(validTo)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      console.log(
        `✅ Subscription activated: tenant=${tenantId} plan=${planId}`,
      );
      break;
    }
    case EVENTS.PAYMENT_FAILED: {
      console.log(`⚠️ Payment failed for tenant=${data.tenantId}`);
      break;
    }
    case EVENTS.SUBSCRIPTION_EXPIRED: {
      const { tenantId } = data;
      if (!tenantId) break;
      await Tenant.findByIdAndUpdate(tenantId, {
        "subscription.status": "expired",
      });
      console.log(`⏰ Subscription expired: tenant=${tenantId}`);
      break;
    }
  }
}

// ─── Start ───
async function start() {
  await connectDB(
    process.env.MONGODB_URI || "mongodb://localhost:27017/pharmacy-saas",
  );
  console.log("✅ MongoDB connected");

  await seedSuperAdmin();

  try {
    await connectRabbitMQ(process.env.RABBITMQ_URL || "amqp://localhost:5672");

    await consumeEvents(
      "inventory-queue",
      [EVENTS.SALES_COMPLETED, EVENTS.SALES_RETURN_PROCESSED],
      handleInventoryEvent,
    );
    await consumeEvents(
      "analytics-queue",
      ["sales.*", "inventory.*"],
      handleAnalyticsEvent,
    );
    await consumeEvents("notification-queue", ["#"], handleNotificationEvent);
    await consumeEvents(
      "tenant-queue",
      [
        EVENTS.PAYMENT_SUCCESS,
        EVENTS.PAYMENT_FAILED,
        EVENTS.SUBSCRIPTION_EXPIRED,
      ],
      handleTenantEvent,
    );

    console.log("✅ RabbitMQ connected + consumers started");
  } catch {
    console.warn("⚠️ RabbitMQ not available — running without event bus");
  }

  startExpiryCron();

  app.listen(PORT, () => {
    console.log(`🚀 Pharmacy SaaS API running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Failed to start:", err);
  process.exit(1);
});
