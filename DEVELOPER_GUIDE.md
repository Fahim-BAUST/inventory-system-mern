# PharmaSaaS — Developer Guide

A comprehensive multi-tenant pharmacy/shop management SaaS platform built as a microservices monorepo.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Backend Services](#backend-services)
- [Frontend Application](#frontend-application)
- [Database Models](#database-models)
- [API Reference](#api-reference)
- [Authentication & Authorization](#authentication--authorization)
- [Event System (RabbitMQ)](#event-system-rabbitmq)
- [Deployment](#deployment)
- [Feature Reference](#feature-reference)

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────────────────────────────────┐
│   React SPA  │────▶│  API Gateway (:4000)                     │
│  (Vite 5)    │     │  JWT Auth · Rate Limit · Proxy           │
└──────────────┘     └──────┬───┬───┬───┬───┬───┬───┬──────────┘
                            │   │   │   │   │   │   │
              ┌─────────────┘   │   │   │   │   │   └──────────┐
              ▼                 ▼   ▼   ▼   ▼   ▼              ▼
         ┌────────┐  ┌──────┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐  ┌──────────┐
         │  Auth  │  │Tenant│ │Inv│ │Sal│ │Ana│ │Pay│  │  Notif   │
         │ :4001  │  │:4002 │ │:4003│:4004│:4005│:4006│  │  :4007   │
         └───┬────┘  └──┬───┘ └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘  └────┬─────┘
             │          │       │     │     │     │          │
             └──────────┴───────┴─────┴─────┴─────┴──────────┘
                                    │
                       ┌────────────┴────────────┐
                       │   MongoDB Atlas          │
                       │   (shared database)      │
                       └────────────┬─────────────┘
                                    │
                       ┌────────────┴────────────┐
                       │   RabbitMQ (CloudAMQP)   │
                       │   Topic Exchange         │
                       └──────────────────────────┘
```

**Two deployment modes:**
1. **Microservices** — Each service runs on its own port, gateway proxies requests.
2. **Unified** — All routes mount in a single Express process (`server.ts`) for platforms like Render/Railway.

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js + Express | HTTP server framework |
| TypeScript | Type safety |
| Mongoose (MongoDB) | ODM / database |
| RabbitMQ (amqplib) | Event-driven messaging |
| JWT (jsonwebtoken) | Authentication tokens |
| SSLCommerz | Payment processing |
| Cloudinary | Product image hosting |
| Nodemailer | Transactional emails |
| node-cron | Scheduled jobs (expiry checker) |
| multer | File uploads (images, CSV) |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI library |
| TypeScript | Type safety |
| Vite 5 | Build tool & dev server |
| TailwindCSS | Utility-first CSS |
| React Router v6 | Client-side routing |
| TanStack Query v5 | Server state management |
| Zustand | Client state (auth, theme) |
| React Hook Form + Zod | Form validation |
| ApexCharts | Dashboard charts |
| Lucide React | Icon library |
| RSuite | Date range picker component |
| react-hot-toast | Toast notifications |

---

## Project Structure

```
Pharmacy/
├── backend/
│   ├── packages/
│   │   ├── shared/          # Constants, types, errors
│   │   ├── db/              # Mongoose connection wrapper
│   │   └── rabbitmq/        # RabbitMQ connection + publish/consume
│   ├── services/
│   │   ├── gateway/         # API Gateway (port 4000)
│   │   ├── auth-service/    # Auth & users (port 4001)
│   │   ├── tenant-service/  # Multi-tenancy (port 4002)
│   │   ├── inventory-service/ # Products, batches, POs (port 4003)
│   │   ├── sales-service/   # POS, sales, customers, Rx (port 4004)
│   │   ├── analytics-service/ # Reports, audit log (port 4005)
│   │   ├── payment-service/ # SSLCommerz payments (port 4006)
│   │   ├── notification-service/ # In-app notifications (port 4007)
│   │   └── server.ts        # Unified single-process server
│   ├── scripts/
│   │   ├── dev-start.js     # Dev launcher with in-memory MongoDB
│   │   └── seed-data.js     # Sample data seeder
│   └── package.json         # Workspace root
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client + endpoint definitions
│   │   ├── components/      # Shared UI components
│   │   ├── features/        # Feature pages (grouped by domain)
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── sales/
│   │   │   ├── analytics/
│   │   │   ├── settings/
│   │   │   └── help/
│   │   ├── hooks/           # Custom hooks (useTenant)
│   │   ├── layouts/         # DashboardLayout, AuthLayout, AdminLayout
│   │   ├── store/           # Zustand stores
│   │   └── utils/           # Utilities (phone validation, etc.)
│   └── package.json
│
├── DEVELOPER_GUIDE.md       # This file
├── claude.md                # AI assistant context
└── .github/
    └── agents/
        └── agent.md         # Copilot agent definition
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- MongoDB (or use the built-in mongodb-memory-server for development)

### Quick Start (Development)

```bash
# Clone the repository
git clone https://github.com/Fahim-BAUST/inventory-system-mern.git
cd inventory-system-mern

# Install all dependencies (uses npm workspaces)
cd backend && npm install
cd ../frontend && npm install

# Copy environment file
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start backend (auto-starts in-memory MongoDB + all services)
cd backend && npm run dev

# Start frontend (separate terminal)
cd frontend && npm run dev
```

The backend `dev` script uses `mongodb-memory-server`, so you don't need an external MongoDB instance during development.

### Seeding Sample Data

```bash
cd backend
npm run seed
```

This creates a sample tenant, admin user, products, categories, suppliers, batches, and sales data. Default login: check the seed script output for credentials.

### Production Build

```bash
# Frontend
cd frontend && npm run build

# Backend (unified mode for single-server deployment)
cd backend && npm run build:unified
npm start
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/pharmacy-saas` |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://localhost:5672` |
| `JWT_ACCESS_SECRET` | JWT signing secret for access tokens | Required |
| `JWT_REFRESH_SECRET` | JWT signing secret for refresh tokens | Required |
| `JWT_ACCESS_EXPIRY` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | `7d` |
| `PORT_GATEWAY` | Gateway port | `4000` |
| `PORT_AUTH` | Auth service port | `4001` |
| `PORT_TENANT` | Tenant service port | `4002` |
| `PORT_INVENTORY` | Inventory service port | `4003` |
| `PORT_SALES` | Sales service port | `4004` |
| `PORT_ANALYTICS` | Analytics service port | `4005` |
| `PORT_PAYMENT` | Payment service port | `4006` |
| `PORT_NOTIFICATION` | Notification service port | `4007` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Required for images |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Required for images |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Required for images |
| `SMTP_HOST` | Email server host | `smtp.gmail.com` |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email username | Required for emails |
| `SMTP_PASS` | Email password/app password | Required for emails |
| `SSLCOMMERZ_STORE_ID` | SSLCommerz store ID | Required for payments |
| `SSLCOMMERZ_STORE_PASSWORD` | SSLCommerz store password | Required for payments |
| `SSLCOMMERZ_IS_SANDBOX` | SSLCommerz sandbox mode | `true` |
| `FRONTEND_URL` | Frontend URL for CORS & email links | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:4000/api` |

---

## Backend Services

### Gateway Service (Port 4000)

The API gateway is the single entry point for all client requests.

**Responsibilities:**
- JWT token verification (extracts user info into `x-user-*` headers)
- Rate limiting (100 requests per 15 minutes per IP)
- Request proxying to downstream services
- Public path allowlist (login, registration, webhooks)

**Proxy routing:**

| Client Path | Target Service |
|-------------|---------------|
| `/api/auth/*` | auth-service:4001 |
| `/api/admin/*` | auth-service:4001 |
| `/api/tenants/*` | tenant-service:4002 |
| `/api/inventory/*` | inventory-service:4003 |
| `/api/sales/*` | sales-service:4004 |
| `/api/analytics/*` | analytics-service:4005 |
| `/api/payments/*` | payment-service:4006 |
| `/api/notifications/*` | notification-service:4007 |

### Auth Service (Port 4001)

Handles authentication, user management, and role-based access control.

**Models:** `User`, `Role`, `RefreshToken`

**Key endpoints:**
- `POST /api/auth/login` — Login with email + password
- `POST /api/auth/register` — Register new user
- `POST /api/auth/forgot-password` — Send reset email
- `POST /api/auth/reset-password` — Reset password with token
- `POST /api/auth/refresh-token` — Refresh JWT tokens
- `GET/POST/PATCH/DELETE /api/auth/users/*` — User CRUD
- `GET/POST/PATCH/DELETE /api/auth/roles/*` — Role CRUD

### Tenant Service (Port 4002)

Multi-tenancy management. Each tenant is a separate pharmacy/shop.

**Model:** `Tenant` (includes `settings` subdocument for currency, taxRate, lowStockThreshold, etc.)

**Key endpoints:**
- `POST /api/tenants` — Create new tenant
- `GET /api/tenants/me` — Get current tenant
- `PATCH /api/tenants/me` — Update tenant settings
- `GET /api/tenants/slug/:slug` — Public slug lookup

### Inventory Service (Port 4003)

Product catalog, stock management, batches, suppliers, and purchase orders.

**Models:** `Product`, `Batch`, `Category`, `Supplier`, `PurchaseOrder`

**Key endpoints:**
- `GET/POST/PATCH/DELETE /api/inventory/products/*` — Product CRUD
- `POST /api/inventory/products/import` — CSV bulk import
- `POST /api/inventory/products/:id/images` — Image upload (Cloudinary)
- `GET/POST/PATCH /api/inventory/products/:id/batches/*` — Batch CRUD
- `GET/POST/PATCH/DELETE /api/inventory/categories/*` — Category CRUD
- `GET/POST/PATCH/DELETE /api/inventory/suppliers/*` — Supplier CRUD
- `GET /api/inventory/expiry` — Expiring batches query
- `GET/POST/PATCH/DELETE /api/inventory/purchase-orders/*` — PO CRUD
- `POST /api/inventory/purchase-orders/:id/status` — PO status transitions

**Cron job:** Runs daily at midnight to check for expiring batches and publish events.

**Event consumers:** `sales.completed` (decrement stock), `sales.return.processed` (restore stock)

### Sales Service (Port 4004)

POS sales, customer management, and prescription tracking.

**Models:** `Sale`, `Customer`, `Prescription`, `Counter`

**Key endpoints:**
- `POST /api/sales` — Create sale (from POS)
- `GET /api/sales` — List sales (paginated, filtered by date)
- `GET /api/sales/:id` — Get sale details
- `POST /api/sales/:id/return` — Process return
- `GET/POST/PATCH/DELETE /api/sales/customers/*` — Customer CRUD
- `GET/POST/PATCH /api/sales/prescriptions/*` — Prescription CRUD
- `POST /api/sales/prescriptions/:id/link-sale` — Link sale to prescription

### Analytics Service (Port 4005)

Dashboard analytics, reports, and audit logging.

**Models:** `DailySummary`, `AuditLog`

**Key endpoints:**
- `GET /api/analytics/dashboard` — Dashboard metrics
- `GET /api/analytics/reports/sales` — Sales report data
- `GET /api/analytics/reports/inventory` — Inventory report data
- `GET /api/analytics/reports/export/:type` — Export as CSV/Excel
- `GET /api/analytics/audit-log` — Paginated audit log query
- `POST /api/analytics/audit-log` — Create audit log entry

### Payment Service (Port 4006)

SSLCommerz payment gateway integration.

**Model:** `Payment`

**Key endpoints:**
- `GET /api/payments/plans` — List subscription plans
- `POST /api/payments/init` — Initiate payment session
- `POST /api/payments/webhook` — SSLCommerz IPN webhook
- `GET /api/payments/history` — Payment history

### Notification Service (Port 4007)

In-app notification system. Subscribes to ALL RabbitMQ events and creates user-facing notifications.

**Model:** `Notification`

**Key endpoints:**
- `GET /api/notifications` — List notifications (paginated)
- `PATCH /api/notifications/:id/read` — Mark as read
- `POST /api/notifications/read-all` — Mark all as read

---

## Database Models

### User (auth-service)
```
firstName, lastName, email (unique per tenant), password (bcrypt),
tenantId, role, customRoleId?, phone?, isActive, permissions[]
```

### Tenant (tenant-service)
```
name, slug (unique), type (pharmacy|general_store|...),
email, phone, address?, logo?,
settings: { currency, taxRate, lowStockThreshold, expiryAlertDays },
subscription: { planId, status, trialEndsAt, currentPeriodEnd }
```

### Product (inventory-service)
```
tenantId, name, sku (unique per tenant), description?,
category: { _id, name }, unit, costPrice, sellingPrice,
discount?, barcode?, manufacturer?, requiresPrescription,
lowStockThreshold, totalStock, images[], isActive
```

### Batch (inventory-service)
```
tenantId, productId, batchNumber, quantity,
manufactureDate?, expiryDate, purchasePrice?, supplierId?
```

### PurchaseOrder (inventory-service)
```
tenantId, poNumber, supplierId, supplierName,
items: [{ productId, productName, quantity, unitCost, total, receivedQty }],
totalAmount, status (draft|ordered|partial|received|cancelled),
notes?, expectedDate?, createdBy
```

### Sale (sales-service)
```
tenantId, invoiceNumber, customerId?,
items: [{ productId, productName, batchId?, quantity, unitPrice, discount, total }],
subtotal, taxAmount, discount, totalAmount,
paymentMethod (cash|card|mobile|credit), paymentStatus (paid|partial|due),
prescriptionId?, soldBy, isReturned
```

### Customer (sales-service)
```
tenantId, name, phone?, email?, address?, notes?,
totalPurchases, totalSpent, lastVisit?, isActive
```

### Prescription (sales-service)
```
tenantId, prescriptionNumber, patientName,
doctorName?, doctorPhone?, notes?,
customerId?, saleIds[], imageUrl?,
status (active|dispensed|expired)
```

### AuditLog (analytics-service)
```
tenantId, userId, userName?, action, entity,
entityId?, description?, changes?, ipAddress
```

---

## Authentication & Authorization

### JWT Flow
1. User logs in → receives `accessToken` (15min) + `refreshToken` (7d)
2. Access token is sent in `Authorization: Bearer <token>` header
3. Gateway validates JWT, extracts `tenantId`, `userId`, `role`, `permissions` into `x-user-*` headers
4. Downstream services read headers via `extractUser` middleware
5. `requirePermission(PERMISSION)` middleware checks if user has the needed permission
6. When access token expires, client auto-refreshes using the refresh token

### Permissions (17 total)

| Area | Permissions |
|------|------------|
| Inventory | `inventory:read`, `inventory:create`, `inventory:update`, `inventory:delete` |
| Sales | `sales:read`, `sales:create`, `sales:return` |
| Reports | `reports:view`, `reports:export` |
| Users | `users:read`, `users:create`, `users:update`, `users:delete` |
| Settings | `settings:read`, `settings:update` |
| Subscription | `subscription:manage` |
| Tenants | `tenants:manage` |

### Role Hierarchy

| Role | Access Level |
|------|-------------|
| `super_admin` | All permissions, no tenant scoping, admin panel |
| `tenant_owner` | All permissions within their tenant |
| `manager` | Inventory + Sales + Reports + Users:read + Settings:read |
| `pharmacist` | Inventory (read/create/update) + Sales + Reports:view |
| `cashier` | Inventory:read + Sales (read/create/return) |
| `viewer` | Read-only: Inventory:read + Sales:read + Reports:view |

---

## Event System (RabbitMQ)

**Exchange:** `pharmacy.events` (topic type)

### Events Published

| Event | Routing Key | Publisher |
|-------|------------|----------|
| `INVENTORY_STOCK_LOW` | `inventory.stock.low` | inventory-service |
| `INVENTORY_BATCH_EXPIRING` | `inventory.batch.expiring` | inventory-service (cron) |
| `INVENTORY_PRODUCT_CREATED` | `inventory.product.created` | inventory-service |
| `INVENTORY_STOCK_UPDATED` | `inventory.stock.updated` | inventory-service |
| `SALES_COMPLETED` | `sales.completed` | sales-service |
| `SALES_RETURN_PROCESSED` | `sales.return.processed` | sales-service |
| `PAYMENT_SUCCESS` | `payment.success` | payment-service |
| `PAYMENT_FAILED` | `payment.failed` | payment-service |
| `SUBSCRIPTION_ACTIVATED` | `subscription.activated` | payment-service |
| `SUBSCRIPTION_EXPIRED` | `subscription.expired` | system |
| `USER_REGISTERED` | `user.registered` | auth-service |
| `USER_INVITED` | `user.invited` | auth-service |
| `TENANT_DELETED` | `tenant.deleted` | tenant-service |

### Queue Bindings

| Queue | Binding Patterns | Service |
|-------|-----------------|---------|
| `tenant-queue` | `payment.success`, `payment.failed`, `subscription.expired` | tenant-service |
| `inventory-queue` | `sales.completed`, `sales.return.processed` | inventory-service |
| `analytics-queue` | `sales.*`, `inventory.*` | analytics-service |
| `notification-queue` | `#` (all events) | notification-service |

---

## Deployment

### Render (Backend) + Vercel (Frontend)

**Backend on Render:**
- Build command: `npm run build:unified`
- Start command: `npm start`
- Uses unified `server.ts` that mounts all routes in one process
- Set all environment variables in Render dashboard

**Frontend on Vercel:**
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to your Render backend URL

### Subscription Plans

| Plan | Users | Products | Price/mo |
|------|-------|----------|----------|
| Free | 1 | 100 | Free (30-day trial) |
| Starter | 5 | 1,000 | ৳499 |
| Professional | 20 | Unlimited | ৳999 |
| Enterprise | Unlimited | Unlimited | Custom |

---

## Feature Reference

### 1. Dashboard
Real-time metrics: today's sales/revenue, product counts, low-stock alerts, expiry warnings, sales trend charts. Clickable alerts navigate to relevant pages.

### 2. Product Management
Full CRUD with image uploads (Cloudinary), category assignment, barcode support, discount %, prescription flag, soft delete. CSV bulk import with auto-category creation.

### 3. Batch & Expiry Tracking
Per-product batch management with expiry dates, quantities, purchase prices. Automated daily cron checks for near-expiry batches. Dashboard alerts and notification creation.

### 4. Purchase Orders
Create POs for suppliers with product line items. Status workflow: Draft → Ordered → Partial/Received. On receive, auto-creates batches and updates product stock.

### 5. POS Terminal
Product search + barcode scanner support. Cart with quantity adjustment, product discounts, order-level discount %. Tax auto-calculation from shop settings. Customer linking. Prescription enforcement for Rx items. Print receipt on checkout toggle.

### 6. Sales History & Returns
Paginated sales list with date range filters. Detail modal with receipt-style view. PDF/print invoice generation. One-click return processing with stock restoration.

### 7. Customer Management
Customer CRUD (name, phone, email, address, notes). Auto-tracked stats: total purchases, total spent, last visit. POS integration for linking customers to sales.

### 8. Prescription Tracking
Prescription CRUD with unique Rx numbers. Patient/doctor info, status workflow (Active → Dispensed/Expired). POS enforces prescription ID for Rx-flagged products.

### 9. Reports & Export
Sales reports (daily/weekly/monthly, top products). Inventory reports (stock levels, valuation). CSV/Excel export.

### 10. Audit Log
Tracks system actions: sales, returns, imports. Filterable by entity, action type, user. Paginated with search.

### 11. User & Role Management
Invite users via email. Custom roles with granular permissions. Edit/deactivate users.

### 12. Shop Settings
Tenant-wide configuration: currency, tax rate, low-stock threshold, expiry alert days. Reflected across all POS, reports, and dashboard views.

### 13. Notifications
Real-time in-app notifications from all system events. Bell icon with unread count. Mark individual or all as read.

### 14. Billing & Subscriptions
SSLCommerz payment integration. Plan selection, payment history, subscription status management.

### 15. Multi-tenancy
Complete data isolation per tenant ID. Slug-based tenant lookup. Super admin can manage all tenants.

### 16. Dark Mode
Toggle between light/dark themes. Persisted in local storage via Zustand.

### 17. Help Center
In-app searchable help section covering all features with Q&A format.

---

## Adding a New Feature (Quick Guide)

1. **Backend model** — Create in the relevant service's `models/` directory
2. **Backend routes** — Create in `routes/`, use `extractUser` + `requirePermission` middleware
3. **Wire routes** — Import and mount in the service's `index.ts`
4. **Frontend API** — Add endpoint functions in `frontend/src/api/endpoints.ts`
5. **Frontend page** — Create in `frontend/src/features/<domain>/`
6. **Route** — Add `<Route>` in `App.tsx`
7. **Sidebar** — Add nav item in `DashboardLayout.tsx`
8. **Build check** — Run `npm run build` in frontend, `npx tsc --noEmit` in service

---

## License

MIT
