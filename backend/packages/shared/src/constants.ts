// Predefined roles
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  TENANT_OWNER: "tenant_owner",
  MANAGER: "manager",
  PHARMACIST: "pharmacist",
  CASHIER: "cashier",
  VIEWER: "viewer",
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

// Granular permissions
export const PERMISSIONS = {
  // Inventory
  INVENTORY_READ: "inventory:read",
  INVENTORY_CREATE: "inventory:create",
  INVENTORY_UPDATE: "inventory:update",
  INVENTORY_DELETE: "inventory:delete",

  // Sales
  SALES_READ: "sales:read",
  SALES_CREATE: "sales:create",
  SALES_RETURN: "sales:return",

  // Reports
  REPORTS_VIEW: "reports:view",
  REPORTS_EXPORT: "reports:export",

  // Users
  USERS_READ: "users:read",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",

  // Settings
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",

  // Subscription
  SUBSCRIPTION_MANAGE: "subscription:manage",

  // Super Admin
  TENANTS_MANAGE: "tenants:manage",
} as const;

export type PermissionType = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Default permission sets per role
export const ROLE_PERMISSIONS: Record<RoleType, PermissionType[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.TENANT_OWNER]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: [
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_DELETE,
    PERMISSIONS.SALES_READ,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_RETURN,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.SETTINGS_READ,
  ],
  [ROLES.PHARMACIST]: [
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.SALES_READ,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_RETURN,
    PERMISSIONS.REPORTS_VIEW,
  ],
  [ROLES.CASHIER]: [
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.SALES_READ,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_RETURN,
  ],
  [ROLES.VIEWER]: [
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.SALES_READ,
    PERMISSIONS.REPORTS_VIEW,
  ],
};

// Subscription plan limits
export const PLAN_LIMITS = {
  free: {
    maxUsers: 1,
    maxProducts: 100,
    features: ["basic_reports"],
    trialDays: 30,
  },
  starter: {
    maxUsers: 5,
    maxProducts: 1000,
    features: ["basic_reports", "advanced_reports", "export"],
    priceMonthly: 499,
  },
  professional: {
    maxUsers: 20,
    maxProducts: Infinity,
    features: [
      "basic_reports",
      "advanced_reports",
      "export",
      "analytics",
      "notifications",
      "forecasting",
    ],
    priceMonthly: 999,
  },
  enterprise: {
    maxUsers: Infinity,
    maxProducts: Infinity,
    features: [
      "basic_reports",
      "advanced_reports",
      "export",
      "analytics",
      "notifications",
      "forecasting",
      "api_access",
      "priority_support",
    ],
    priceMonthly: null, // custom pricing
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

// RabbitMQ event routing keys
export const EVENTS = {
  INVENTORY_STOCK_LOW: "inventory.stock.low",
  INVENTORY_BATCH_EXPIRING: "inventory.batch.expiring",
  INVENTORY_PRODUCT_CREATED: "inventory.product.created",
  INVENTORY_STOCK_UPDATED: "inventory.stock.updated",
  SALES_COMPLETED: "sales.completed",
  SALES_RETURN_PROCESSED: "sales.return.processed",
  PAYMENT_SUCCESS: "payment.success",
  PAYMENT_FAILED: "payment.failed",
  SUBSCRIPTION_ACTIVATED: "subscription.activated",
  SUBSCRIPTION_EXPIRED: "subscription.expired",
  USER_REGISTERED: "user.registered",
  USER_INVITED: "user.invited",
  TENANT_DELETED: "tenant.deleted",
} as const;

export const EXCHANGE_NAME = "pharmacy.events";
