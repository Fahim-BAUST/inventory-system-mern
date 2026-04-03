import api from "./client";

export const authApi = {
  login: (data: { email: string; password: string; tenantId?: string }) =>
    api.post("/auth/login", data),

  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    tenantId: string;
    phone?: string;
  }) => api.post("/auth/register", data),

  forgotPassword: (data: { email: string; tenantId: string }) =>
    api.post("/auth/forgot-password", data),

  resetPassword: (data: { resetToken: string; newPassword: string }) =>
    api.post("/auth/reset-password", data),

  refreshToken: (refreshToken: string) =>
    api.post("/auth/refresh-token", { refreshToken }),

  logout: (refreshToken: string) => api.post("/auth/logout", { refreshToken }),
};

export const tenantApi = {
  create: (data: {
    name: string;
    type: string;
    email: string;
    phone: string;
  }) => api.post("/tenants", data),

  getBySlug: (slug: string) =>
    api.get(`/tenants/slug/${encodeURIComponent(slug)}`),

  getMe: () => api.get("/tenants/me"),

  update: (data: any) => api.patch("/tenants/me", data),
};

export const userApi = {
  getAll: (page = 1, limit = 20) =>
    api.get(`/auth/users?page=${page}&limit=${limit}`),

  getById: (id: string) => api.get(`/auth/users/${id}`),

  invite: (data: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  }) => api.post("/auth/users/invite", data),

  update: (id: string, data: any) => api.patch(`/auth/users/${id}`, data),

  delete: (id: string) => api.delete(`/auth/users/${id}`),
};

export const roleApi = {
  getAll: () => api.get("/auth/roles"),
  create: (data: {
    name: string;
    displayName: string;
    permissions: string[];
  }) => api.post("/auth/roles", data),
  update: (id: string, data: any) => api.patch(`/auth/roles/${id}`, data),
  delete: (id: string) => api.delete(`/auth/roles/${id}`),
};

export const inventoryApi = {
  getProducts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    stock?: string;
    from?: string;
    to?: string;
  }) => api.get("/inventory/products", { params }),

  getProduct: (id: string) => api.get(`/inventory/products/${id}`),

  createProduct: (data: any) => api.post("/inventory/products", data),

  updateProduct: (id: string, data: any) =>
    api.patch(`/inventory/products/${id}`, data),

  deleteProduct: (id: string) => api.delete(`/inventory/products/${id}`),

  toggleProductStatus: (id: string) =>
    api.patch(`/inventory/products/${id}/toggle-status`),

  // Product Images
  uploadProductImages: (id: string, formData: FormData) =>
    api.post(`/inventory/products/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteProductImage: (id: string, publicId: string) =>
    api.delete(`/inventory/products/${id}/images/${publicId}`),
  importProducts: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/inventory/products/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Categories
  getCategories: () => api.get("/inventory/categories"),
  createCategory: (data: any) => api.post("/inventory/categories", data),
  updateCategory: (id: string, data: any) =>
    api.patch(`/inventory/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/inventory/categories/${id}`),

  // Suppliers
  getSuppliers: () => api.get("/inventory/suppliers"),
  createSupplier: (data: any) => api.post("/inventory/suppliers", data),
  updateSupplier: (id: string, data: any) =>
    api.patch(`/inventory/suppliers/${id}`, data),
  deleteSupplier: (id: string) => api.delete(`/inventory/suppliers/${id}`),

  // Batches
  getBatches: (productId: string) =>
    api.get(`/inventory/products/${productId}/batches`),
  createBatch: (productId: string, data: any) =>
    api.post(`/inventory/products/${productId}/batches`, data),
  updateBatch: (productId: string, batchId: string, data: any) =>
    api.patch(`/inventory/products/${productId}/batches/${batchId}`, data),

  // Expiry
  getExpiringBatches: (days?: number) =>
    api.get("/inventory/expiry", { params: { days } }),

  // Purchase Orders
  getPurchaseOrders: (params?: { status?: string; search?: string }) =>
    api.get("/inventory/purchase-orders", { params }),
  getPurchaseOrder: (id: string) => api.get(`/inventory/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) =>
    api.post("/inventory/purchase-orders", data),
  updatePurchaseOrder: (id: string, data: any) =>
    api.patch(`/inventory/purchase-orders/${id}`, data),
  updatePurchaseOrderStatus: (id: string, data: any) =>
    api.post(`/inventory/purchase-orders/${id}/status`, data),
  deletePurchaseOrder: (id: string) =>
    api.delete(`/inventory/purchase-orders/${id}`),
};

export const salesApi = {
  createSale: (data: any) => api.post("/sales", data),
  getSales: (params?: any) => api.get("/sales", { params }),
  getSale: (id: string) => api.get(`/sales/${id}`),
  createReturn: (saleId: string, data: any) =>
    api.post(`/sales/${saleId}/return`, data),
};

export const customerApi = {
  getAll: (search?: string) =>
    api.get("/sales/customers", { params: { search } }),
  create: (data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  }) => api.post("/sales/customers", data),
  update: (id: string, data: any) => api.patch(`/sales/customers/${id}`, data),
  delete: (id: string) => api.delete(`/sales/customers/${id}`),
};

export const prescriptionApi = {
  getAll: (params?: { search?: string; status?: string }) =>
    api.get("/sales/prescriptions", { params }),
  getById: (id: string) => api.get(`/sales/prescriptions/${id}`),
  create: (data: any) => api.post("/sales/prescriptions", data),
  update: (id: string, data: any) =>
    api.patch(`/sales/prescriptions/${id}`, data),
  linkSale: (id: string, saleId: string) =>
    api.post(`/sales/prescriptions/${id}/link-sale`, { saleId }),
};

export const analyticsApi = {
  getDashboard: (params?: { from?: string; to?: string }) =>
    api.get("/analytics/dashboard", { params }),
  getSalesReport: (params: any) =>
    api.get("/analytics/reports/sales", { params }),
  getInventoryReport: () => api.get("/analytics/reports/inventory"),
  exportReport: (type: string, params: any) =>
    api.get(`/analytics/reports/export/${type}`, {
      params,
      responseType: "blob",
    }),
  getAuditLog: (params?: {
    entity?: string;
    action?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get("/analytics/audit-log", { params }),
  createAuditLog: (data: {
    action: string;
    entity: string;
    entityId?: string;
    description?: string;
    changes?: any;
  }) => api.post("/analytics/audit-log", data),
  getForecast: (params?: { horizon?: number; productId?: string }) =>
    api.get("/analytics/forecast", { params }),
  getProductForecast: (productId: string, horizon?: number) =>
    api.get(`/analytics/forecast/${productId}`, { params: { horizon } }),
};

export const paymentApi = {
  getPlans: () => api.get("/payments/plans"),
  initPayment: (planId: string) => api.post("/payments/init", { planId }),
  getPaymentHistory: () => api.get("/payments/history"),
};

export const notificationApi = {
  getAll: (page = 1, limit = 20) =>
    api.get("/notifications", { params: { page, limit } }),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.post("/notifications/read-all"),
};

export const adminApi = {
  // Tenants (uses tenant-service via gateway)
  getTenants: () => api.get("/tenants"),
  getTenant: (id: string) => api.get(`/tenants/${id}`),
  createTenant: (data: {
    name: string;
    type: string;
    email: string;
    phone: string;
  }) => api.post("/tenants", data),
  deleteTenant: (id: string) => api.delete(`/tenants/${id}`),
  updateTenantSubscription: (
    id: string,
    data: {
      planId?: string;
      status?: string;
      trialEndsAt?: string | null;
      currentPeriodEnd?: string | null;
    },
  ) => api.patch(`/tenants/${id}/subscription`, data),
  updateTenantStatus: (id: string, isActive: boolean) =>
    api.patch(`/tenants/${id}/status`, { isActive }),

  // Tenant owners/users (uses admin routes on auth-service)
  createTenantOwner: (
    tenantId: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
    },
  ) => api.post(`/admin/tenants/${tenantId}/owner`, data),

  getTenantUsers: (tenantId: string) =>
    api.get(`/admin/tenants/${tenantId}/users`),

  getStats: () => api.get("/admin/stats"),
};
