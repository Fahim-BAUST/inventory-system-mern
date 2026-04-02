export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>[];
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ---- Tenant ----

export interface ITenant {
  _id: string;
  name: string;
  slug: string;
  type: "pharmacy" | "grocery" | "electronics" | "general" | "other";
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  logo?: string;
  licenseNumber?: string;
  settings: {
    currency: string;
    timezone: string;
    taxRate: number;
    lowStockThreshold: number;
    expiryAlertDays: number;
  };
  subscription: {
    planId: string;
    status: "trial" | "active" | "expired" | "cancelled";
    trialEndsAt?: Date;
    currentPeriodEnd?: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---- User ----

export interface IUser {
  _id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Product / Inventory ----

export interface IProduct {
  _id: string;
  tenantId: string;
  name: string;
  genericName?: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  manufacturer?: string;
  dosageForm?: string;
  strength?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  reorderLevel: number;
  totalStock: number;
  drugSchedule?: "OTC" | "prescription-only" | "controlled";
  requiresPrescription: boolean;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBatch {
  _id: string;
  tenantId: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  manufactureDate: Date;
  expiryDate: Date;
  purchasePrice: number;
  supplierId?: string;
  createdAt: Date;
}

// ---- Sales ----

export interface ISale {
  _id: string;
  tenantId: string;
  invoiceNumber: string;
  customerId?: string;
  items: ISaleItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  paymentMethod: "cash" | "card" | "mobile" | "credit";
  paymentStatus: "paid" | "partial" | "due";
  prescriptionId?: string;
  soldBy: string;
  createdAt: Date;
}

export interface ISaleItem {
  productId: string;
  productName: string;
  batchId?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}
