import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { analyticsApi } from "@/api/endpoints";
import DateRangePicker, { type DatePreset } from "@/components/DateRangePicker";
import ProductThumb from "@/components/ProductThumb";
import {
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useTenant } from "@/hooks/useTenant";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

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

const DASHBOARD_PRESETS: DatePreset[] = [
  { label: "Today", getDates: () => [new Date(), new Date()] },
  {
    label: "7 Days",
    getDates: () => [new Date(Date.now() - 6 * 86400000), new Date()],
  },
  {
    label: "30 Days",
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
];

export default function DashboardPage() {
  const { currencySymbol } = useTenant();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const from = startDate ? toDateStr(startDate) : undefined;
  const to = endDate ? toDateStr(endDate) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", from, to],
    queryFn: () =>
      analyticsApi.getDashboard({ from, to }).then((r) => r.data.data),
  });

  const stats = [
    {
      label: "Sales",
      value: data?.todaySales ?? 0,
      change: data?.salesChange ?? 0,
      icon: ShoppingCart,
      bgClass: "bg-blue-50 dark:bg-blue-950",
      iconClass: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Revenue",
      value: `${currencySymbol}${Math.round(data?.todayRevenue ?? 0).toLocaleString()}`,
      change: data?.revenueChange ?? 0,
      icon: DollarSign,
      bgClass: "bg-green-50 dark:bg-green-950",
      iconClass: "text-green-600 dark:text-green-400",
    },
    {
      label: "Total Products",
      value: data?.totalProducts ?? 0,
      icon: Package,
      bgClass: "bg-purple-50 dark:bg-purple-950",
      iconClass: "text-purple-600 dark:text-purple-400",
      link: "/inventory/products",
    },
    {
      label: "Low Stock Items",
      value: data?.lowStockCount ?? 0,
      icon: AlertTriangle,
      bgClass: "bg-red-50 dark:bg-red-950",
      iconClass: "text-red-600 dark:text-red-400",
      link: "/inventory/products?stock=low",
    },
    {
      label: "Returns",
      value: data?.todayReturns ?? 0,
      icon: RotateCcw,
      bgClass: "bg-orange-50 dark:bg-orange-950",
      iconClass: "text-orange-600 dark:text-orange-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const trendData = data?.trend ?? [];
  const topProducts = data?.topProducts ?? [];
  const recentSales = data?.recentSales ?? [];
  const alerts = data?.alerts ?? [];
  const paymentMethods = data?.paymentMethods ?? [];
  const hourlySales = data?.hourlySales ?? [];
  const categoryPerformance = data?.categoryPerformance ?? [];

  // Revenue & Returns Area Chart
  const revenueChartOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "area", height: 260 },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: trendData.map((d: any) => fmtDate(d.date)),
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
    colors: ["#3b82f6", "#ef4444"],
    tooltip: {
      ...baseChartOpts.tooltip,
      y: { formatter: (v: number) => `${currencySymbol}${v.toLocaleString()}` },
    },
  };

  // Sales Count Bar Chart
  const salesCountOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 260 },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: trendData.map((d: any) => fmtDate(d.date)),
    },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "55%" },
    },
    colors: ["#8b5cf6"],
    tooltip: {
      ...baseChartOpts.tooltip,
      y: { formatter: (v: number) => `${v} sales` },
    },
  };

  // Top Products Horizontal Bar
  const topProductsOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 260 },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: "60%" },
    },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: topProducts.map((p: any) =>
        p.name?.length > 18 ? p.name.slice(0, 18) + "…" : p.name,
      ),
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        formatter: (v: string) =>
          `${currencySymbol}${Number(v).toLocaleString()}`,
      },
    },
    yaxis: {
      labels: { style: { colors: "#cbd5e1", fontSize: "12px" } },
    },
    colors: ["#10b981"],
    tooltip: {
      ...baseChartOpts.tooltip,
      y: { formatter: (v: number) => `${currencySymbol}${v.toLocaleString()}` },
    },
  };

  // Payment Method Donut Chart
  const paymentDonutOpts: ApexOptions = {
    chart: {
      type: "donut",
      background: "transparent",
      fontFamily: "inherit",
    },
    theme: { mode: "dark" },
    labels: paymentMethods.map((p: any) => p.method),
    colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"],
    legend: {
      position: "bottom",
      labels: { colors: "#9ca3af" },
      fontSize: "12px",
    },
    tooltip: {
      theme: "dark",
      y: { formatter: (v: number) => `${currencySymbol}${v.toLocaleString()}` },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              color: "#9ca3af",
              formatter: (w: any) =>
                `${currencySymbol}${Math.round(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)).toLocaleString()}`,
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: false },
  };

  // Hourly Sales Bar Chart
  const hourlyLabels = Array.from({ length: 24 }, (_, i) => {
    const h = i % 12 || 12;
    return `${h}${i < 12 ? "am" : "pm"}`;
  });
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = hourlySales.find((h: any) => h.hour === i);
    return found ? found.count : 0;
  });
  const hourlySalesOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 260 },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: hourlyLabels,
      labels: { style: { colors: "#9ca3af", fontSize: "10px" }, rotate: -45 },
    },
    plotOptions: {
      bar: { borderRadius: 3, columnWidth: "65%" },
    },
    colors: ["#06b6d4"],
    tooltip: {
      ...baseChartOpts.tooltip,
      y: { formatter: (v: number) => `${v} sales` },
    },
  };

  // Category Performance Horizontal Bar
  const categoryOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 260 },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, barHeight: "55%" },
    },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: categoryPerformance.map((c: any) =>
        c.category?.length > 18 ? c.category.slice(0, 18) + "…" : c.category,
      ),
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        formatter: (v: string) =>
          `${currencySymbol}${Number(v).toLocaleString()}`,
      },
    },
    yaxis: {
      labels: { style: { colors: "#cbd5e1", fontSize: "12px" } },
    },
    colors: ["#f59e0b"],
    tooltip: {
      ...baseChartOpts.tooltip,
      y: { formatter: (v: number) => `${currencySymbol}${v.toLocaleString()}` },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={({ start, end }) => {
            setStartDate(start);
            setEndDate(end);
          }}
          presets={DASHBOARD_PRESETS}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const content = (
            <>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                {stat.change !== undefined && (
                  <div
                    className={`flex items-center gap-1 mt-2 text-sm ${stat.change >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {stat.change >= 0 ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    <span>{Math.abs(stat.change)}% vs prev period</span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-lg ${stat.bgClass}`}>
                <stat.icon size={20} className={stat.iconClass} />
              </div>
            </>
          );
          return stat.link ? (
            <Link
              key={stat.label}
              to={stat.link}
              className="card flex items-start justify-between hover:ring-1 hover:ring-primary-500/30 transition-all"
            >
              {content}
            </Link>
          ) : (
            <div
              key={stat.label}
              className="card flex items-start justify-between"
            >
              {content}
            </div>
          );
        })}
      </div>

      {/* Charts Row 1: Revenue & Returns + Daily Sales Count */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Revenue & Returns</h3>
          {trendData.length > 0 ? (
            <Chart
              options={revenueChartOpts}
              series={[
                { name: "Revenue", data: trendData.map((d: any) => d.revenue) },
                {
                  name: "Returns",
                  data: trendData.map((d: any) => d.returnAmount ?? 0),
                },
              ]}
              type="area"
              height={260}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No sales data yet. Make some sales to see the trend.
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Daily Sales Count</h3>
          {trendData.length > 0 ? (
            <Chart
              options={salesCountOpts}
              series={[
                { name: "Sales", data: trendData.map((d: any) => d.sales) },
              ]}
              type="bar"
              height={260}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No sales data yet.
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Top Products Chart + List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">
            Top Products by Revenue
          </h3>
          {topProducts.length > 0 ? (
            <Chart
              options={topProductsOpts}
              series={[
                {
                  name: "Revenue",
                  data: topProducts.map((p: any) => p.revenue),
                },
              ]}
              type="bar"
              height={260}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No sales data yet.
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Top Selling Products</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-1">
              {topProducts.map((p: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold bg-gray-100 dark:bg-white/[0.06] rounded-full w-6 h-6 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <ProductThumb src={p.image} size={32} />
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
                      <p className="text-[11px] text-gray-600 dark:text-gray-400">
                        {p.quantity} units sold
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {currencySymbol}
                    {p.revenue?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No sales data yet.
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
            Recent Sales
          </h3>
          {recentSales.length > 0 ? (
            <div className="space-y-1">
              {recentSales.map((sale: any) => (
                <div
                  key={sale._id}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                      <ShoppingCart size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {sale.invoiceNumber}
                      </p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(sale.createdAt).toLocaleString("en", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {currencySymbol}
                      {sale.totalAmount?.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                      {sale.itemCount} items &bull; {sale.paymentMethod}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-6">
              No sales yet. Start selling from the POS terminal.
            </p>
          )}
        </div>

        {/* Alerts */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
            Alerts
          </h3>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert: any, idx: number) => (
                <Link
                  key={idx}
                  to={
                    alert.type === "low_stock" && alert.productId
                      ? `/inventory/products/${alert.productId}/edit`
                      : alert.type === "expiry"
                        ? "/inventory/expiry-tracker"
                        : "#"
                  }
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:opacity-80 ${
                    alert.severity === "danger"
                      ? "bg-red-50/50 dark:bg-red-500/5 border-red-200 dark:border-red-500/10"
                      : "bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/10"
                  }`}
                >
                  <AlertCircle
                    size={16}
                    className={
                      alert.severity === "danger"
                        ? "text-red-500 mt-0.5 shrink-0"
                        : "text-amber-500 mt-0.5 shrink-0"
                    }
                  />
                  <div>
                    <span
                      className={
                        alert.type === "low_stock"
                          ? "badge-warning"
                          : "badge-danger"
                      }
                    >
                      {alert.type === "low_stock" ? "Low Stock" : "Expiry"}
                    </span>
                    <p className="text-sm mt-1">{alert.message}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-6">
              All stock levels and expiry dates are healthy.
            </p>
          )}
        </div>
      </div>

      {/* Charts Row 3: Payment Methods + Hourly Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Payment Methods</h3>
          {paymentMethods.length > 0 ? (
            <Chart
              options={paymentDonutOpts}
              series={paymentMethods.map((p: any) => p.amount)}
              type="donut"
              height={280}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No sales data yet.
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Sales by Hour</h3>
          {hourlySales.length > 0 ? (
            <Chart
              options={hourlySalesOpts}
              series={[{ name: "Sales", data: hourlyData }]}
              type="bar"
              height={260}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No sales data yet.
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 4: Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">Revenue by Category</h3>
          {categoryPerformance.length > 0 ? (
            <Chart
              options={categoryOpts}
              series={[
                {
                  name: "Revenue",
                  data: categoryPerformance.map((c: any) => c.revenue),
                },
              ]}
              type="bar"
              height={260}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No sales data yet.
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
          {categoryPerformance.length > 0 ? (
            <div className="space-y-1">
              {categoryPerformance.map((c: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold bg-gray-100 dark:bg-white/[0.06] rounded-full w-6 h-6 flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{c.category}</p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400">
                        {c.quantity} units sold
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {currencySymbol}
                    {Math.round(c.revenue).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No sales data yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
