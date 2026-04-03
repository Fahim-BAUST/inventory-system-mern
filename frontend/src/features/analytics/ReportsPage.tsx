import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { analyticsApi } from "@/api/endpoints";
import { useTenant } from "@/hooks/useTenant";
import DateRangePicker, { type DatePreset } from "@/components/DateRangePicker";
import ProductThumb from "@/components/ProductThumb";
import { Download, TrendingUp, Package, CreditCard } from "lucide-react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

const baseChartOpts: ApexOptions = {
  chart: {
    toolbar: { show: false },
    background: "transparent",
    fontFamily: "inherit",
  },
  theme: { mode: "dark" },
  grid: {
    borderColor: "rgba(255,255,255,0.06)",
    strokeDashArray: 4,
    padding: { left: 4, right: 4 },
  },
  xaxis: {
    labels: { style: { colors: "#9ca3af", fontSize: "11px" } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { style: { colors: "#9ca3af", fontSize: "11px" } },
  },
  tooltip: {
    theme: "dark",
    style: { fontSize: "12px" },
  },
  stroke: { curve: "smooth", width: 2 },
  dataLabels: { enabled: false },
};

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

const REPORT_PRESETS: DatePreset[] = [
  {
    label: "Last 7 Days",
    getDates: () => [new Date(Date.now() - 6 * 86400000), new Date()],
  },
  {
    label: "Last 30 Days",
    getDates: () => [new Date(Date.now() - 29 * 86400000), new Date()],
  },
  {
    label: "This Month",
    getDates: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), now.getMonth(), 1), now];
    },
  },
  {
    label: "Last Month",
    getDates: () => {
      const now = new Date();
      return [
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
        new Date(now.getFullYear(), now.getMonth(), 0),
      ];
    },
  },
  {
    label: "Last 3 Months",
    getDates: () => [new Date(Date.now() - 89 * 86400000), new Date()],
  },
  {
    label: "This Year",
    getDates: () => {
      const now = new Date();
      return [new Date(now.getFullYear(), 0, 1), now];
    },
  },
];

function downloadCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          return typeof val === "string" && val.includes(",")
            ? `"${val}"`
            : val;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"sales" | "inventory">("sales");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const from = startDate ? toDateStr(startDate) : undefined;
  const to = endDate ? toDateStr(endDate) : undefined;

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ["report-sales", from, to],
    queryFn: () =>
      analyticsApi.getSalesReport({ from, to }).then((r) => r.data.data),
    enabled: reportType === "sales",
  });

  const { data: inventoryReport, isLoading: inventoryLoading } = useQuery({
    queryKey: ["report-inventory"],
    queryFn: () => analyticsApi.getInventoryReport().then((r) => r.data.data),
    enabled: reportType === "inventory",
  });

  const isLoading = reportType === "sales" ? salesLoading : inventoryLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button
          onClick={() => {
            if (reportType === "sales" && salesReport) {
              const rows = (salesReport.summaries || []).map((s: any) => ({
                Date: s.date,
                Sales: s.totalSales,
                Revenue: s.revenue || s.totalRevenue,
                Items_Sold: s.itemsSold || s.totalItemsSold || 0,
                Returns: s.totalReturns || 0,
              }));
              downloadCSV(rows, "sales_report");
            } else if (reportType === "inventory" && inventoryReport) {
              const rows = (inventoryReport.lowStock || []).map((p: any) => ({
                Name: p.name,
                SKU: p.sku,
                Stock: p.stock || p.totalStock,
                Reorder_Level: p.reorderLevel,
                Selling_Price: p.sellingPrice,
              }));
              if (rows.length) downloadCSV(rows, "inventory_report");
            }
          }}
          disabled={isLoading}
          className="btn-primary flex items-center gap-2"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Report type tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {(["sales", "inventory"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`px-4 py-2 text-sm rounded-md capitalize transition-colors ${
              reportType === type
                ? "bg-white dark:bg-slate-700 shadow-sm font-medium"
                : "hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Date filters (for sales report) */}
      {reportType === "sales" && (
        <div className="card !p-4">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={({ start, end }) => {
              setStartDate(start);
              setEndDate(end);
            }}
            presets={REPORT_PRESETS}
          />
        </div>
      )}

      {isLoading ? (
        <div className="card h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
          Loading report data...
        </div>
      ) : reportType === "sales" && salesReport ? (
        <SalesReportView data={salesReport} />
      ) : reportType === "inventory" && inventoryReport ? (
        <InventoryReportView data={inventoryReport} />
      ) : null}
    </div>
  );
}

function SalesReportView({ data }: { data: any }) {
  const { currencySymbol } = useTenant();
  const { totals, summaries, topProducts, paymentBreakdown } = data;

  const revenueOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "area", height: 300 },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: (summaries || []).map((d: any) => fmtDate(d.date)),
    },
    yaxis: {
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        formatter: (v: number) => `${currencySymbol}${v.toLocaleString()}`,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    colors: ["#3b82f6", "#10b981"],
    tooltip: {
      ...baseChartOpts.tooltip,
      y: { formatter: (v: number) => `${currencySymbol}${v.toLocaleString()}` },
    },
  };

  const salesVsReturnsOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 300 },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: (summaries || []).map((d: any) => fmtDate(d.date)),
    },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "50%" },
    },
    colors: ["#8b5cf6", "#ef4444"],
    tooltip: {
      ...baseChartOpts.tooltip,
      y: { formatter: (v: number) => `${v}` },
    },
  };

  const paymentDonutOpts: ApexOptions = {
    chart: { type: "donut", background: "transparent", fontFamily: "inherit" },
    theme: { mode: "dark" },
    labels: (paymentBreakdown || []).map((p: any) => p.method || "Unknown"),
    colors: PIE_COLORS,
    legend: {
      position: "bottom",
      labels: { colors: "#94a3b8" },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "55%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              formatter: (w: any) =>
                `${currencySymbol}${w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toLocaleString()}`,
            },
          },
        },
      },
    },
    tooltip: {
      y: { formatter: (v: number) => `${currencySymbol}${v.toLocaleString()}` },
    },
    dataLabels: { enabled: false },
  };

  const topProductsBarOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 280 },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: "55%" },
    },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: (topProducts || []).map((p: any) =>
        p.name?.length > 20 ? p.name.slice(0, 20) + "…" : p.name,
      ),
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        formatter: (v: string) =>
          `${currencySymbol}${Number(v).toLocaleString()}`,
      },
    },
    yaxis: {
      labels: { style: { colors: "#cbd5e1", fontSize: "11px" } },
    },
    colors: ["#10b981"],
    tooltip: {
      ...baseChartOpts.tooltip,
      y: { formatter: (v: number) => `${currencySymbol}${v.toLocaleString()}` },
    },
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <TrendingUp
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Sales
              </p>
              <p className="text-xl font-bold">{totals?.totalSales ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-lg">
              <TrendingUp
                size={20}
                className="text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Revenue
              </p>
              <p className="text-xl font-bold">
                {currencySymbol}
                {Math.round(totals?.totalRevenue ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
              <Package
                size={20}
                className="text-purple-600 dark:text-purple-400"
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Items Sold
              </p>
              <p className="text-xl font-bold">{totals?.totalItemsSold ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg">
              <CreditCard
                size={20}
                className="text-red-600 dark:text-red-400"
              />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Returns
              </p>
              <p className="text-xl font-bold">{totals?.totalReturns ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue & Sales Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Daily Revenue</h3>
          {summaries?.length > 0 ? (
            <Chart
              options={revenueOpts}
              series={[
                {
                  name: "Revenue",
                  data: summaries.map((d: any) => d.revenue || 0),
                },
              ]}
              type="area"
              height={300}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-12">
              No data in the selected range.
            </p>
          )}
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Sales vs Returns</h3>
          {summaries?.length > 0 ? (
            <Chart
              options={salesVsReturnsOpts}
              series={[
                {
                  name: "Sales",
                  data: summaries.map((d: any) => d.sales || 0),
                },
                {
                  name: "Returns",
                  data: summaries.map((d: any) => d.returns || 0),
                },
              ]}
              type="bar"
              height={300}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-12">
              No data in the selected range.
            </p>
          )}
        </div>
      </div>

      {/* Top Products Chart + Payment Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Top Products by Revenue</h3>
            {topProducts?.length > 0 && (
              <button
                onClick={() =>
                  downloadCSV(
                    topProducts.map((p: any) => ({
                      Name: p.name,
                      Quantity: p.quantity,
                      Revenue: p.revenue,
                    })),
                    "top_products",
                  )
                }
                className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
              >
                <Download size={14} /> CSV
              </button>
            )}
          </div>
          {topProducts?.length > 0 ? (
            <Chart
              options={topProductsBarOpts}
              series={[
                {
                  name: "Revenue",
                  data: topProducts.map((p: any) => p.revenue),
                },
              ]}
              type="bar"
              height={280}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
              No sales data.
            </p>
          )}
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
          {paymentBreakdown?.length > 0 ? (
            <Chart
              options={paymentDonutOpts}
              series={paymentBreakdown.map((p: any) => p.total)}
              type="donut"
              height={280}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
              No payment data.
            </p>
          )}
        </div>
      </div>

      {/* Top Products List */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Top Products Detail</h3>
        {topProducts?.length > 0 ? (
          <div className="space-y-3">
            {topProducts.map((p: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/[0.06] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold bg-gray-100 dark:bg-white/[0.06] rounded-full w-6 h-6 flex items-center justify-center">
                    {i + 1}
                  </span>
                  <ProductThumb src={p.image} size={28} />
                  <div>
                    {p.productId ? (
                      <Link
                        to={`/inventory/products/${p.productId}/edit`}
                        className="text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        {p.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{p.name}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {p.quantity} units sold
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold">
                  {currencySymbol}
                  {p.revenue?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
            No sales data.
          </p>
        )}
      </div>
    </div>
  );
}

function InventoryReportView({ data }: { data: any }) {
  const categoryBarOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 300 },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: (data.categoryBreakdown || []).map((c: any) => {
        const cat = c.category || "Uncategorized";
        return cat.length > 14 ? cat.slice(0, 14) + "…" : cat;
      }),
    },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "55%" },
    },
    colors: ["#8b5cf6"],
    tooltip: {
      ...baseChartOpts.tooltip,
      y: { formatter: (v: number) => `${v} products` },
    },
  };

  const stockDonutOpts: ApexOptions = {
    chart: { type: "donut", background: "transparent", fontFamily: "inherit" },
    theme: { mode: "dark" },
    labels: ["In Stock", "Low Stock", "Out of Stock"],
    colors: ["#10b981", "#f59e0b", "#ef4444"],
    legend: {
      position: "bottom",
      labels: { colors: "#94a3b8" },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "55%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              formatter: (w: any) =>
                w.globals.seriesTotals
                  .reduce((a: number, b: number) => a + b, 0)
                  .toString(),
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
  };

  const inStockCount = Math.max(
    0,
    data.totalProducts - data.lowStockCount - data.outOfStockCount,
  );
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total Products
          </p>
          <p className="text-2xl font-bold mt-1">{data.totalProducts}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock</p>
          <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {data.lowStockCount}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Out of Stock
          </p>
          <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
            {data.outOfStockCount}
          </p>
        </div>
      </div>

      {/* Category Breakdown + Stock Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Stock by Category</h3>
          {data.categoryBreakdown?.length > 0 ? (
            <Chart
              options={categoryBarOpts}
              series={[
                {
                  name: "Products",
                  data: data.categoryBreakdown.map((c: any) => c.count),
                },
              ]}
              type="bar"
              height={300}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
              No categories yet.
            </p>
          )}
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Stock Distribution</h3>
          {data.totalProducts > 0 ? (
            <Chart
              options={stockDonutOpts}
              series={[inStockCount, data.lowStockCount, data.outOfStockCount]}
              type="donut"
              height={280}
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-8">
              No products yet.
            </p>
          )}
        </div>
      </div>

      {/* Low Stock & Expiring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Low Stock Products</h3>
          {data.lowStock?.length > 0 ? (
            <div className="space-y-2">
              {data.lowStock.map((p: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/[0.06] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <ProductThumb src={p.image} size={28} />
                    <div>
                      {p._id ? (
                        <Link
                          to={`/inventory/products/${p._id}/edit`}
                          className="text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          {p.name}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">{p.name}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {p.sku}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {p.stock}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      / {p.reorderLevel} min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-600 text-sm">
              All products are above reorder levels.
            </p>
          )}
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">
            Expiring Batches (90 days)
          </h3>
          {data.expiringBatches?.length > 0 ? (
            <div className="space-y-2">
              {data.expiringBatches.map((b: any, i: number) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/[0.06] last:border-0`}
                >
                  <div>
                    <p className="text-sm font-medium">{b.batchNumber}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Qty: {b.quantity}
                    </p>
                  </div>
                  <span
                    className={
                      b.daysLeft <= 0
                        ? "badge-danger"
                        : b.daysLeft <= 30
                          ? "badge-warning"
                          : "badge-info"
                    }
                  >
                    {b.daysLeft <= 0 ? "EXPIRED" : `${b.daysLeft} days`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-600 text-sm">No batches expiring soon.</p>
          )}
        </div>
      </div>
    </div>
  );
}
