import { Express } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { authMiddleware } from "./middleware/auth";

const services: Record<string, string> = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:4001",
  tenants: process.env.TENANT_SERVICE_URL || "http://localhost:4002",
  inventory: process.env.INVENTORY_SERVICE_URL || "http://localhost:4003",
  sales: process.env.SALES_SERVICE_URL || "http://localhost:4004",
  analytics: process.env.ANALYTICS_SERVICE_URL || "http://localhost:4005",
  payments: process.env.PAYMENT_SERVICE_URL || "http://localhost:4006",
  notifications:
    process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4007",
};

// Routes that don't require authentication
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

export function proxyRoutes(app: Express): void {
  // Apply auth middleware to all /api routes except public paths
  app.use("/api", (req, res, next) => {
    const fullPath = `/api${req.path}`;
    const isPublic = publicPaths.some((p) => fullPath.startsWith(p));
    if (isPublic) return next();
    return authMiddleware(req, res, next);
  });

  // Auth service
  app.use(
    "/api/auth",
    createProxyMiddleware({
      target: services.auth,
      changeOrigin: true,
      pathRewrite: { "^/api/auth": "/api/auth" },
    }),
  );

  // Tenant service
  app.use(
    "/api/tenants",
    createProxyMiddleware({
      target: services.tenants,
      changeOrigin: true,
      pathRewrite: { "^/api/tenants": "/api/tenants" },
    }),
  );

  // Inventory service
  app.use(
    "/api/inventory",
    createProxyMiddleware({
      target: services.inventory,
      changeOrigin: true,
      pathRewrite: { "^/api/inventory": "/api/inventory" },
    }),
  );

  // Sales service
  app.use(
    "/api/sales",
    createProxyMiddleware({
      target: services.sales,
      changeOrigin: true,
      pathRewrite: { "^/api/sales": "/api/sales" },
    }),
  );

  // Analytics service
  app.use(
    "/api/analytics",
    createProxyMiddleware({
      target: services.analytics,
      changeOrigin: true,
      pathRewrite: { "^/api/analytics": "/api/analytics" },
    }),
  );

  // Payment service
  app.use(
    "/api/payments",
    createProxyMiddleware({
      target: services.payments,
      changeOrigin: true,
      pathRewrite: { "^/api/payments": "/api/payments" },
    }),
  );

  // Notification service
  app.use(
    "/api/notifications",
    createProxyMiddleware({
      target: services.notifications,
      changeOrigin: true,
      pathRewrite: { "^/api/notifications": "/api/notifications" },
    }),
  );

  // Admin routes (proxied to auth service)
  app.use(
    "/api/admin",
    createProxyMiddleware({
      target: services.auth,
      changeOrigin: true,
      pathRewrite: { "^/api/admin": "/api/admin" },
    }),
  );
}
