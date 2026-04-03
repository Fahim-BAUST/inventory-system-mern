import { useState } from "react";
import {
  HelpCircle,
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Pill,
  Tags,
  Truck,
  AlertTriangle,
  ClipboardList,
  History,
  Contact,
  FileText,
  Users,
  CreditCard,
  Store,
  ScanBarcode,
  Upload,
  Printer,
  RotateCcw,
  BookOpen,
  Brain,
} from "lucide-react";

interface HelpSection {
  id: string;
  icon: any;
  title: string;
  subtitle: string;
  items: { q: string; a: string }[];
}

const sections: HelpSection[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    subtitle: "Overview of your pharmacy's key metrics",
    items: [
      {
        q: "What does the dashboard show?",
        a: "The dashboard displays today's sales, revenue, total products, low-stock alerts, expiry warnings, recent sales, and sales trend charts. All data updates in real time.",
      },
      {
        q: "What are the alert cards?",
        a: "Alert cards show low-stock products and near-expiry batches. Click any alert to navigate directly to the product or expiry tracker.",
      },
      {
        q: "Can I filter by date range?",
        a: "Yes. Use the date range picker at the top to view dashboard data for a custom period — today, this week, this month, or a custom range.",
      },
    ],
  },
  {
    id: "products",
    icon: Pill,
    title: "Products",
    subtitle: "Manage your product catalog",
    items: [
      {
        q: "How do I add a new product?",
        a: "Go to Inventory → Products → click 'Add Product'. Fill in the name, SKU, category, unit, cost price, selling price, and optionally upload product images. Mark 'Requires Prescription' for Rx items.",
      },
      {
        q: "How do I import products from CSV?",
        a: "Click the 'Import CSV' button on the Products page. Your CSV file must have headers: name, sku, unit, costprice, sellingprice. Optional columns: category, description, barcode, manufacturer, lowstockthreshold. Categories are auto-created if they don't exist.",
      },
      {
        q: "How does the barcode field work?",
        a: "Enter a barcode/UPC when creating or editing a product. In the POS terminal, scanning a barcode with a USB scanner automatically finds and adds the product to the cart.",
      },
      {
        q: "What is the discount field?",
        a: "The product-level discount (%) applies automatically in the POS. If a product has a 10% discount, the POS shows the discounted price when added to cart.",
      },
    ],
  },
  {
    id: "categories",
    icon: Tags,
    title: "Categories",
    subtitle: "Organize products into groups",
    items: [
      {
        q: "How do categories work?",
        a: "Categories help organize products (e.g., Antibiotics, Pain Relief, Vitamins). Create categories in Inventory → Categories, then assign products to them. You can filter products by category on the Products page.",
      },
    ],
  },
  {
    id: "suppliers",
    icon: Truck,
    title: "Suppliers",
    subtitle: "Track your product suppliers",
    items: [
      {
        q: "How do I manage suppliers?",
        a: "Go to Inventory → Suppliers to add, edit, or delete suppliers. Each supplier has a name, company, email, phone, and address. Suppliers are linked to batches and purchase orders.",
      },
    ],
  },
  {
    id: "batches-expiry",
    icon: AlertTriangle,
    title: "Batches & Expiry Tracker",
    subtitle: "Monitor product batches and expiry dates",
    items: [
      {
        q: "What are batches?",
        a: "Each product can have multiple batches with different expiry dates, quantities, and purchase prices. When you receive stock from a purchase order, batches are created automatically.",
      },
      {
        q: "How does the expiry tracker work?",
        a: "Go to Inventory → Expiry Tracker to see all batches expiring within a configurable window (default 90 days). The system also sends automatic low-stock and expiry alert notifications.",
      },
    ],
  },
  {
    id: "purchase-orders",
    icon: ClipboardList,
    title: "Purchase Orders",
    subtitle: "Order stock from suppliers",
    items: [
      {
        q: "How do I create a purchase order?",
        a: "Go to Inventory → Purchase Orders → click 'New Order'. Select a supplier, search and add products with quantities and unit costs, set an expected date, then create. The PO starts as 'Draft'.",
      },
      {
        q: "What are the PO statuses?",
        a: "Draft → Ordered → Received (or Partial/Cancelled). Click the send icon to mark as Ordered. When goods arrive, click the check icon to mark Received — this automatically creates batches and updates product stock.",
      },
      {
        q: "Can I edit a purchase order?",
        a: "Only Draft orders can be edited or deleted. Once marked as Ordered, the PO is locked. You can still cancel or mark it as received.",
      },
    ],
  },
  {
    id: "pos",
    icon: ShoppingCart,
    title: "POS Terminal",
    subtitle: "Process sales quickly",
    items: [
      {
        q: "How do I make a sale?",
        a: "Go to Sales → POS Terminal. Search products by name or scan a barcode. Click a product to add it to the cart. Adjust quantities, set a discount %, choose the payment method, and click Checkout.",
      },
      {
        q: "How does barcode scanning work?",
        a: "Connect a USB barcode scanner to your computer. It acts like a keyboard — just scan a product barcode and the POS auto-focuses the search field. Press Enter or the scanner sends Enter automatically to add the matched product.",
      },
      {
        q: "How do I attach a customer to a sale?",
        a: "In the checkout panel, use the 'Customer (optional)' search to find an existing customer by name or phone. The customer's purchase stats are updated automatically after each sale.",
      },
      {
        q: "What happens with prescription items?",
        a: "If your cart contains items marked 'Requires Prescription', a purple Rx badge appears and a prescription ID field is shown. You must enter a valid prescription ID (e.g., RX-00001) before checkout.",
      },
      {
        q: "Does it print receipts?",
        a: "Yes. The 'Print receipt on checkout' toggle is enabled by default. After a successful sale, a thermal-style receipt opens in a print dialog. You can also print from Sales History later.",
      },
      {
        q: "How is tax calculated?",
        a: "Tax is calculated automatically based on the tax rate in your Shop Settings. The formula is: Tax = (Subtotal − Discount) × Tax Rate%. Update the rate in Settings → Shop.",
      },
    ],
  },
  {
    id: "sales-history",
    icon: History,
    title: "Sales History",
    subtitle: "View and manage past sales",
    items: [
      {
        q: "How do I view sales history?",
        a: "Go to Sales → Sales History. Browse all past sales with date range filters. Click any sale to see the full receipt with item details, totals, payment info, and cashier.",
      },
      {
        q: "How do I process a return?",
        a: "Open a sale in the detail modal and click 'Return'. Confirm the return — this marks the sale as returned and restores the stock to inventory. Returns cannot be undone.",
      },
      {
        q: "How do I print/download an invoice?",
        a: "In the sale detail modal, click 'Download PDF'. This opens a formatted invoice in a new window that you can print or save as PDF using your browser's print function.",
      },
    ],
  },
  {
    id: "customers",
    icon: Contact,
    title: "Customers",
    subtitle: "Manage your customer base",
    items: [
      {
        q: "How do I add customers?",
        a: "Go to Sales → Customers → click 'Add Customer'. Enter the customer name, phone, email, address, and notes. Customers can then be linked to sales in the POS.",
      },
      {
        q: "What stats are tracked?",
        a: "Each customer tracks total purchases (count), total amount spent, and last visit date. These stats update automatically when you link a customer to a sale in the POS.",
      },
    ],
  },
  {
    id: "prescriptions",
    icon: FileText,
    title: "Prescriptions",
    subtitle: "Track and manage prescriptions",
    items: [
      {
        q: "How does prescription tracking work?",
        a: "Go to Sales → Prescriptions to create and manage prescriptions. Each prescription has a unique Rx number, patient name, doctor info, and status (Active/Dispensed/Expired). Prescriptions are linked to sales when used at checkout.",
      },
      {
        q: "Do I need to create a prescription before selling Rx items?",
        a: "You need a prescription ID at checkout. Create the prescription first in the Prescriptions page to get the Rx number, then enter it at POS checkout when selling prescription-only items.",
      },
    ],
  },
  {
    id: "reports",
    icon: BarChart3,
    title: "Reports",
    subtitle: "Business analytics and insights",
    items: [
      {
        q: "What reports are available?",
        a: "Sales reports (daily/weekly/monthly trends, top products), Inventory reports (stock levels, valuation, low-stock items). Use date range filters and export reports to CSV/Excel.",
      },
      {
        q: "How do I export data?",
        a: "On the Reports page, click 'Export' after selecting your report type and date range. The data downloads as a CSV file that you can open in Excel or Google Sheets.",
      },
    ],
  },
  {
    id: "forecasting",
    icon: Brain,
    title: "AI Demand Forecasting",
    subtitle: "Predict reorder quantities from sales trends",
    items: [
      {
        q: "How does demand forecasting work?",
        a: "The system analyzes your last 90 days of sales data using weighted moving averages, trend detection, and day-of-week seasonality patterns to predict future demand for each product. No external AI service is needed — it runs entirely on your data.",
      },
      {
        q: "What do the urgency levels mean?",
        a: "Critical (red) = predicted stockout within 7 days. Warning (amber) = stockout within 21 days. OK (green) = sufficient stock for the forecast horizon. Products are sorted by urgency so you see the most important ones first.",
      },
      {
        q: "What is the confidence level?",
        a: "Confidence reflects how much sales data is available: Low = less than 14 days of history, Medium = 14–60 days, High = 60+ days. Products with low confidence should be reviewed manually before ordering.",
      },
      {
        q: "How do I change the forecast horizon?",
        a: "Use the horizon dropdown at the top of the Forecasting page. Choose 7, 14, 30, 60, or 90 days. A longer horizon suggests larger reorder quantities to cover the entire period.",
      },
      {
        q: "What does 'Suggested Reorder Qty' mean?",
        a: "It's the quantity you should order to cover the forecast horizon with a 1.5x safety factor. Formula: (horizon × daily demand × 1.5) − current stock. If current stock is sufficient, the suggested qty is 0.",
      },
      {
        q: "Can I create a purchase order from the forecast?",
        a: "Yes. Click any product row to open the detail modal, then click 'Create PO'. It navigates to the Purchase Orders page with the product, quantity, and last supplier pre-filled.",
      },
      {
        q: "What charts are in the product detail?",
        a: "Three charts: (1) Sales History & Projected Demand — shows actual sales for the last 90 days + predicted demand going forward. (2) Stock Depletion Timeline — shows when stock will reach the reorder level and zero. (3) Day-of-Week Pattern — shows which days have higher/lower demand.",
      },
    ],
  },
  {
    id: "audit-log",
    icon: Shield,
    title: "Audit Log",
    subtitle: "Track all system activities",
    items: [
      {
        q: "What does the audit log track?",
        a: "The audit log records key actions: sales, returns, product changes, imports, and user activities. Each entry shows who did what, when, and on which entity. Filter by entity type, action, or search by user/description.",
      },
    ],
  },
  {
    id: "users-roles",
    icon: Users,
    title: "Users & Roles",
    subtitle: "Manage team access",
    items: [
      {
        q: "How do I add team members?",
        a: "Go to Settings → Users → click 'Invite User'. Enter the user's name, email, and assign a role. They'll receive an invitation email with login credentials.",
      },
      {
        q: "How do roles and permissions work?",
        a: "Go to Settings → Roles to create custom roles with specific permissions. Permissions control access to: Inventory (read/create/update/delete), Sales (read/create/return), Reports (view/export), Users (manage), Settings (read/update), and Subscriptions.",
      },
    ],
  },
  {
    id: "shop-settings",
    icon: Store,
    title: "Shop Settings",
    subtitle: "Configure your pharmacy",
    items: [
      {
        q: "What can I configure?",
        a: "Set your shop name, address, phone, currency (BDT/USD/EUR/INR), tax rate (%), low-stock alert threshold, and expiry alert window (days). These settings apply across the entire system — POS, reports, dashboards, and notifications.",
      },
    ],
  },
  {
    id: "billing",
    icon: CreditCard,
    title: "Billing & Subscription",
    subtitle: "Manage your plan",
    items: [
      {
        q: "How does billing work?",
        a: "Go to Settings → Billing to view your current plan, payment history, and upgrade/downgrade options. Payments are processed securely through the integrated payment gateway.",
      },
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const filtered = searchQuery.trim()
    ? sections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.a.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter((s) => s.items.length > 0)
    : sections;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/20">
          <BookOpen size={26} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold">Help Center</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          Learn how to use every feature of PharmaSaaS. Search below or browse
          by section.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search help topics..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0f1729] text-sm shadow-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
        />
      </div>

      {/* Quick Links */}
      {!searchQuery && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { icon: ShoppingCart, label: "POS", id: "pos" },
            { icon: Package, label: "Products", id: "products" },
            { icon: ClipboardList, label: "Orders", id: "purchase-orders" },
            { icon: FileText, label: "Rx", id: "prescriptions" },
            { icon: BarChart3, label: "Reports", id: "reports" },
            { icon: Brain, label: "Forecasting", id: "forecasting" },
            { icon: Users, label: "Users", id: "users-roles" },
            { icon: Store, label: "Settings", id: "shop-settings" },
            { icon: Shield, label: "Audit", id: "audit-log" },
          ].map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setExpandedSections([link.id]);
                document
                  .getElementById(`help-${link.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white dark:bg-[#0f1729] border border-gray-200 dark:border-white/[0.06] hover:border-primary-300 dark:hover:border-primary-500/30 hover:shadow-sm transition-all text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <link.icon size={16} className="text-primary-500" />
              {link.label}
            </button>
          ))}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <HelpCircle size={40} className="mx-auto mb-3 opacity-40" />
            <p>No matching help topics found</p>
          </div>
        )}
        {filtered.map((section) => {
          const isExpanded =
            expandedSections.includes(section.id) || !!searchQuery;
          return (
            <div
              key={section.id}
              id={`help-${section.id}`}
              className="bg-white dark:bg-[#0f1729] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
                  <section.icon
                    size={18}
                    className="text-primary-600 dark:text-primary-400"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{section.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {section.subtitle}
                  </p>
                </div>
                <span className="text-xs text-gray-400 mr-2">
                  {section.items.length} topic
                  {section.items.length !== 1 ? "s" : ""}
                </span>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-white/[0.04]">
                  {section.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-5 py-4 border-b border-gray-50 dark:border-white/[0.02] last:border-0"
                    >
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
                        {item.q}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-gray-400">
        PharmaSaaS v1.0 — Built with React, Node.js & MongoDB
      </div>
    </div>
  );
}
