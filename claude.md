# PharmaSaaS — Claude AI Context

This file provides Claude (and other AI assistants) with the context needed to work effectively on this codebase.

---

## Project Identity

**Name:** PharmaSaaS  
**Type:** Multi-tenant pharmacy/shop management SaaS platform  
**Repo:** `Fahim-BAUST/inventory-system-mern`  
**Monorepo:** npm workspaces — `backend/` (8 microservices + 3 shared packages) + `frontend/` (React SPA)

---

## Architecture

- **Backend:** Node.js + Express + TypeScript, 8 microservices behind an API Gateway
- **Frontend:** React 18 + Vite + TailwindCSS + TanStack Query + Zustand
- **Database:** MongoDB (Mongoose ODM), single shared database with tenant isolation via `tenantId`
- **Messaging:** RabbitMQ topic exchange (`pharmacy.events`) for event-driven communication
- **Auth:** JWT (access + refresh tokens), role-based permissions (17 permissions, 6 roles)
- **Payments:** SSLCommerz integration
- **Images:** Cloudinary uploads
- **Emails:** Nodemailer (SMTP)
- **Deployment:** Unified single-process mode (`server.ts`) on Render + Vercel

---

## Key Directories

```
backend/
  packages/shared/       → Constants (ROLES, PERMISSIONS, EVENTS), types, error classes
  packages/db/           → Mongoose connection wrapper
  packages/rabbitmq/     → RabbitMQ publish/consume wrapper
  services/gateway/      → API Gateway (:4000) — JWT auth, rate limit, proxy
  services/auth-service/ → Auth, users, roles (:4001)
  services/tenant-service/ → Tenants, settings (:4002)
  services/inventory-service/ → Products, batches, categories, suppliers, POs (:4003)
  services/sales-service/ → Sales, customers, prescriptions (:4004)
  services/analytics-service/ → Dashboard, reports, audit log (:4005)
  services/payment-service/ → SSLCommerz payments (:4006)
  services/notification-service/ → In-app notifications (:4007)
  services/server.ts     → Unified entry point (mounts all routes in one process)

frontend/
  src/api/endpoints.ts   → All API endpoint definitions (authApi, inventoryApi, salesApi, etc.)
  src/api/client.ts      → Axios instance with JWT interceptor + auto-refresh
  src/features/           → Feature pages grouped by domain
  src/layouts/            → DashboardLayout (sidebar + nav), AuthLayout, AdminLayout
  src/store/              → Zustand stores (authStore, themeStore)
  src/hooks/useTenant.ts  → Hook for tenant settings (currency, taxRate, etc.)
  src/App.tsx             → All routes + route guards
```

---

## Coding Patterns

### Backend Service Pattern
Each service follows:
```
services/<name>/src/
  index.ts         → Express app setup, route mounting, DB/RabbitMQ connect
  models/          → Mongoose schemas
  routes/          → Express routers with extractUser + requirePermission middleware
  middleware/      → permissions.ts (extractUser, requirePermission), errorHandler.ts
  consumers/       → RabbitMQ event handlers (optional)
```

### Route Handler Pattern
```typescript
router.get("/", requirePermission(PERMISSIONS.INVENTORY_READ), async (req, res, next) => {
  try {
    const { tenantId } = (req as any).user;
    // ... query with tenantId filter
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
```

### Frontend Page Pattern
```typescript
export default function PageName() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: [...], queryFn: () => api.method().then(r => r.data.data) });
  const mutation = useMutation({ mutationFn: ..., onSuccess: () => { toast.success(...); queryClient.invalidateQueries({...}); } });
  return ( /* TailwindCSS + dark mode classes */ );
}
```

### Error Classes
Import from `@pharmacy-saas/shared`: `BadRequestError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `ValidationError`

### Events
Import `EVENTS` from `@pharmacy-saas/shared`, publish with `publishEvent(EVENTS.X, payload)`, consume with `consumeEvents(queue, [events], handler)`.

---

## Data Flow: POS Sale Example

1. Frontend POS → `POST /api/sales` with items, amounts, paymentMethod
2. Gateway validates JWT → proxies to sales-service:4004
3. Sales service creates `Sale` document, publishes `EVENTS.SALES_COMPLETED`
4. Inventory service (consumer) decrements product stock
5. Analytics service (consumer) updates daily summary
6. Notification service (consumer) creates notification for the seller

---

## Important Notes

- **All queries must filter by `tenantId`** — data isolation is enforced at the application level
- **Soft deletes** use `isActive: false` pattern (not actual document deletion) for products, suppliers, customers
- **The `useTenant` hook** provides `currencySymbol`, `formatCurrency()`, `taxRate`, `lowStockThreshold` — use these instead of hardcoding
- **Dark mode** classes follow the pattern: `text-gray-900 dark:text-gray-100`, `bg-white dark:bg-[#0f1729]`
- **Card styling**: Use `className="card"` (defined in global CSS) or manually: `bg-white dark:bg-[#0f1729] rounded-xl border border-gray-200 dark:border-white/[0.06] p-4`
- **Icons**: Always use `lucide-react` icons
- **Toast**: Use `react-hot-toast` (`toast.success()`, `toast.error()`)
- **Form inputs**: Use `className="input-field"` for consistent styling
- **The gateway** strips JWT and forwards user info as headers: `x-user-id`, `x-user-tenantid`, `x-user-role`, `x-user-permissions`

---

## Commands

```bash
# Development
cd backend && npm run dev          # Start all services with in-memory MongoDB
cd frontend && npm run dev         # Start Vite dev server

# Build
cd frontend && npm run build       # TypeScript check + Vite production build
cd backend && npm run build:unified # Build unified server for deployment

# Seed data
cd backend && npm run seed         # Populate sample data

# Type-check individual service
cd backend/services/<name> && npx tsc --noEmit
```

---

## Models Quick Reference

| Model | Service | Key Fields |
|-------|---------|-----------|
| User | auth | firstName, lastName, email, password, tenantId, role, permissions[] |
| Role | auth | name, displayName, permissions[], tenantId |
| Tenant | tenant | name, slug, type, settings{currency,taxRate,...}, subscription{} |
| Product | inventory | name, sku, category, costPrice, sellingPrice, totalStock, barcode, requiresPrescription |
| Batch | inventory | productId, batchNumber, quantity, expiryDate, purchasePrice, supplierId |
| Category | inventory | name, description, tenantId |
| Supplier | inventory | name, company, email, phone, isActive |
| PurchaseOrder | inventory | poNumber, supplierId, items[], status, totalAmount |
| Sale | sales | invoiceNumber, items[], subtotal, taxAmount, discount, totalAmount, paymentMethod, prescriptionId |
| Customer | sales | name, phone, email, totalPurchases, totalSpent, lastVisit |
| Prescription | sales | prescriptionNumber, patientName, doctorName, status, saleIds[] |
| DailySummary | analytics | date, tenantId, totalSales, totalRevenue, topProducts |
| AuditLog | analytics | userId, action, entity, entityId, description, changes |
| Payment | payment | tenantId, amount, planId, status, transactionId |
| Notification | notification | tenantId, userId, type, title, message, isRead |

---

## Feature Checklist

- [x] Multi-tenant architecture with data isolation
- [x] JWT authentication with refresh tokens
- [x] Role-based access control (17 permissions, 6 roles)
- [x] Product management with images, barcodes, CSV import
- [x] Batch tracking with expiry dates
- [x] Purchase orders with status workflow
- [x] POS terminal with barcode scanner support
- [x] Sale returns/refunds with stock restoration
- [x] Customer management with stats tracking
- [x] Prescription tracking and POS enforcement
- [x] Receipt printing on checkout
- [x] Dashboard with real-time metrics and charts
- [x] Sales and inventory reports with CSV export
- [x] Audit logging
- [x] In-app notifications (event-driven)
- [x] SSLCommerz payment integration
- [x] Email system (invites, password reset)
- [x] Dark/light theme
- [x] Help center
- [x] Super admin panel
