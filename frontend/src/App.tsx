import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import AdminLayout from "@/layouts/AdminLayout";
import LoginPage from "@/features/auth/LoginPage";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import ProductsPage from "@/features/inventory/ProductsPage";
import AddProductPage from "@/features/inventory/AddProductPage";
import EditProductPage from "@/features/inventory/EditProductPage";
import CategoriesPage from "@/features/inventory/CategoriesPage";
import SuppliersPage from "@/features/inventory/SuppliersPage";
import ExpiryTrackerPage from "@/features/inventory/ExpiryTrackerPage";
import PurchaseOrdersPage from "@/features/inventory/PurchaseOrdersPage";
import POSPage from "@/features/sales/POSPage";
import SalesHistoryPage from "@/features/sales/SalesHistoryPage";
import CustomersPage from "@/features/sales/CustomersPage";
import PrescriptionsPage from "@/features/sales/PrescriptionsPage";
import ReportsPage from "@/features/analytics/ReportsPage";
import ForecastingPage from "@/features/analytics/ForecastingPage";
import AuditLogPage from "@/features/analytics/AuditLogPage";
import HelpPage from "@/features/help/HelpPage";
import UsersPage from "@/features/settings/UsersPage";
import RolesPage from "@/features/settings/RolesPage";
import ShopSettingsPage from "@/features/settings/ShopSettingsPage";
import SubscriptionPage from "@/features/settings/SubscriptionPage";
import PaymentResultPage from "@/features/settings/PaymentResultPage";
import AdminTenantsPage from "@/features/admin/AdminTenantsPage";
import TenantDetailPage from "@/features/admin/TenantDetailPage";
import AdminDashboardPage from "@/features/admin/AdminDashboardPage";
import AdminSubscriptionsPage from "@/features/admin/AdminSubscriptionsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "super_admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function TenantRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === "super_admin")
    return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated) {
    if (user?.role === "super_admin")
      return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function SmartRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === "super_admin")
    return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route
        element={
          <GuestRoute>
            <AuthLayout />
          </GuestRoute>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Super Admin routes */}
      <Route
        element={
          <SuperAdminRoute>
            <AdminLayout />
          </SuperAdminRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/tenants" element={<AdminTenantsPage />} />
        <Route path="/admin/tenants/:tenantId" element={<TenantDetailPage />} />
        <Route
          path="/admin/subscriptions"
          element={<AdminSubscriptionsPage />}
        />
      </Route>

      {/* Tenant user dashboard routes */}
      <Route
        element={
          <TenantRoute>
            <DashboardLayout />
          </TenantRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* Inventory */}
        <Route path="/inventory/products" element={<ProductsPage />} />
        <Route path="/inventory/products/new" element={<AddProductPage />} />
        <Route
          path="/inventory/products/:id/edit"
          element={<EditProductPage />}
        />
        <Route path="/inventory/categories" element={<CategoriesPage />} />
        <Route path="/inventory/suppliers" element={<SuppliersPage />} />
        <Route
          path="/inventory/expiry-tracker"
          element={<ExpiryTrackerPage />}
        />
        <Route
          path="/inventory/purchase-orders"
          element={<PurchaseOrdersPage />}
        />
        {/* Sales */}
        <Route path="/sales/pos" element={<POSPage />} />
        <Route path="/sales/history" element={<SalesHistoryPage />} />
        <Route path="/sales/customers" element={<CustomersPage />} />
        <Route path="/sales/prescriptions" element={<PrescriptionsPage />} />
        {/* Analytics */}
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/forecasting" element={<ForecastingPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/help" element={<HelpPage />} />
        {/* Settings */}
        <Route path="/settings/users" element={<UsersPage />} />
        <Route path="/settings/roles" element={<RolesPage />} />
        <Route path="/settings/shop" element={<ShopSettingsPage />} />
        <Route path="/settings/subscription" element={<SubscriptionPage />} />
      </Route>

      {/* Payment result — standalone (SSLCommerz redirect) */}
      <Route path="/payment/result" element={<PaymentResultPage />} />

      {/* Smart redirect */}
      <Route path="/" element={<SmartRedirect />} />
      <Route path="*" element={<SmartRedirect />} />
    </Routes>
  );
}
