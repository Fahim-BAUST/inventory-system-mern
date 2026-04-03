import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { analyticsApi } from "@/api/endpoints";
import { useTenant } from "@/hooks/useTenant";
import ProductThumb from "@/components/ProductThumb";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldAlert,
  Package,
  DollarSign,
  ShoppingCart,
  X,
  ArrowRight,
  Download,
  Brain,
  Activity,
  Lock,
} from "lucide-react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

const URGENCY = {
  critical: {
    label: "Critical",
    color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-500",
  },
  warning: {
    label: "Warning",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  ok: {
    label: "OK",
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    dot: "bg-green-500",
  },
};

const CONFIDENCE = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const TREND_ICON = {
  rising: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const TREND_COLOR = {
  rising: "text-green-500",
  stable: "text-gray-400",
  declining: "text-red-500",
};

function downloadCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h] ?? "";
          return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
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
  tooltip: { theme: "dark", style: { fontSize: "12px" } },
  stroke: { curve: "smooth", width: 2 },
  dataLabels: { enabled: false },
};

export default function ForecastingPage() {
  const [horizon, setHorizon] = useState(30);
  const [urgencyFilter, setUrgencyFilter] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const { tenant, currencySymbol, formatCurrency } = useTenant();
  const navigate = useNavigate();

  const planId = tenant?.subscription?.planId || "free";
  const FORECAST_PLANS = ["professional", "enterprise"];
  const hasAccess = FORECAST_PLANS.includes(planId);

  const { data, isLoading } = useQuery({
    queryKey: ["forecast", horizon],
    queryFn: () =>
      analyticsApi.getForecast({ horizon }).then((r) => r.data.data),
    enabled: hasAccess,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["forecast-detail", selectedProduct, horizon],
    queryFn: () =>
      analyticsApi
        .getProductForecast(selectedProduct!, horizon)
        .then((r) => r.data.data),
    enabled: !!selectedProduct && hasAccess,
  });

  const forecasts = data?.forecasts || [];
  const summary = data?.summary || {};

  const filtered = urgencyFilter
    ? forecasts.filter((f: any) => f.urgency === urgencyFilter)
    : forecasts;

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">AI Demand Forecasting</h1>
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center mb-4">
            <Lock size={28} className="text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Professional Feature</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
            AI Demand Forecasting is available on the Professional plan and
            above. Upgrade to unlock predictive analytics, reorder suggestions,
            and demand trend insights.
          </p>
          <button
            onClick={() => navigate("/settings/subscription")}
            className="btn-primary px-6 py-2.5"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain size={24} className="text-purple-500" />
            AI Demand Forecasting
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Predict reorder quantities from sales trends — {horizon}-day horizon
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2332] text-sm"
          >
            <option value={7}>7-day horizon</option>
            <option value={14}>14-day horizon</option>
            <option value={30}>30-day horizon</option>
            <option value={60}>60-day horizon</option>
            <option value={90}>90-day horizon</option>
          </select>
          <button
            onClick={() => {
              const rows = forecasts.map((f: any) => ({
                Product: f.productName,
                SKU: f.sku,
                Current_Stock: f.currentStock,
                Daily_Demand: f.dailyDemand,
                Days_Until_Stockout:
                  f.daysUntilStockout > 9000 ? "N/A" : f.daysUntilStockout,
                Suggested_Reorder_Qty: f.suggestedReorderQty,
                Estimated_Cost: f.estimatedCost,
                Trend: f.trend,
                Confidence: f.confidence,
                Urgency: f.urgency,
              }));
              downloadCSV(rows, "demand_forecast");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {!isLoading && data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Activity}
            iconClass="text-blue-600 dark:text-blue-400"
            bgClass="bg-blue-50 dark:bg-blue-500/10"
            label="Avg Daily Demand"
            value={`${summary.avgDailyDemand ?? 0} units`}
          />
          <KPICard
            icon={ShieldAlert}
            iconClass="text-red-600 dark:text-red-400"
            bgClass="bg-red-50 dark:bg-red-500/10"
            label="Critical (≤7 days)"
            value={summary.criticalCount ?? 0}
          />
          <KPICard
            icon={AlertTriangle}
            iconClass="text-amber-600 dark:text-amber-400"
            bgClass="bg-amber-50 dark:bg-amber-500/10"
            label="Warning (≤21 days)"
            value={summary.warningCount ?? 0}
          />
          <KPICard
            icon={DollarSign}
            iconClass="text-green-600 dark:text-green-400"
            bgClass="bg-green-50 dark:bg-green-500/10"
            label="Total Reorder Cost"
            value={formatCurrency(summary.totalReorderCost ?? 0)}
          />
        </div>
      )}

      {/* Urgency filter pills */}
      <div className="flex gap-2 flex-wrap">
        {["", "critical", "warning", "ok"].map((u) => (
          <button
            key={u}
            onClick={() => setUrgencyFilter(u)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              urgencyFilter === u
                ? "bg-primary-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {u === ""
              ? `All (${forecasts.length})`
              : `${u.charAt(0).toUpperCase() + u.slice(1)} (${forecasts.filter((f: any) => f.urgency === u).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0f1729] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06] text-left text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium text-right">Stock</th>
              <th className="px-4 py-3 font-medium text-right">Daily Demand</th>
              <th className="px-4 py-3 font-medium text-right">
                Days to Stockout
              </th>
              <th className="px-4 py-3 font-medium text-right">
                Suggested Qty
              </th>
              <th className="px-4 py-3 font-medium text-right">Est. Cost</th>
              <th className="px-4 py-3 font-medium text-center">Trend</th>
              <th className="px-4 py-3 font-medium text-center">Confidence</th>
              <th className="px-4 py-3 font-medium text-center">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Brain
                      size={32}
                      className="animate-pulse text-purple-400"
                    />
                    <span>Analyzing sales patterns...</span>
                  </div>
                </td>
              </tr>
            ) : !filtered.length ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  No products match this filter
                </td>
              </tr>
            ) : (
              filtered.map((f: any) => {
                const TrendIcon =
                  TREND_ICON[f.trend as keyof typeof TREND_ICON] || Minus;
                const u =
                  URGENCY[f.urgency as keyof typeof URGENCY] || URGENCY.ok;
                return (
                  <tr
                    key={f.productId}
                    onClick={() => setSelectedProduct(f.productId)}
                    className="border-b border-gray-100 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProductThumb src={f.image} size={28} />
                        <div>
                          <p className="font-medium leading-tight">
                            {f.productName}
                          </p>
                          <p className="text-[11px] text-gray-400">{f.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span
                        className={
                          f.currentStock <= 0
                            ? "text-red-500"
                            : f.currentStock <= f.reorderLevel
                              ? "text-amber-500"
                              : ""
                        }
                      >
                        {f.currentStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {f.dailyDemand}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span
                        className={`font-semibold ${f.daysUntilStockout <= 7 ? "text-red-500" : f.daysUntilStockout <= 21 ? "text-amber-500" : ""}`}
                      >
                        {f.daysUntilStockout > 9000
                          ? "∞"
                          : `${f.daysUntilStockout}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {f.suggestedReorderQty > 0 ? f.suggestedReorderQty : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.estimatedCost > 0
                        ? formatCurrency(f.estimatedCost)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <TrendIcon
                        size={16}
                        className={
                          TREND_COLOR[f.trend as keyof typeof TREND_COLOR] || ""
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${CONFIDENCE[f.confidence as keyof typeof CONFIDENCE] || ""}`}
                      >
                        {f.confidence}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.color}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
                        {u.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedProduct && (
        <DetailModal
          detail={detail}
          loading={detailLoading}
          horizon={horizon}
          currencySymbol={currencySymbol}
          formatCurrency={formatCurrency}
          onClose={() => setSelectedProduct(null)}
          onCreatePO={(productId: string, qty: number, supplierId?: string) => {
            navigate(
              `/inventory/purchase-orders?prefill=${productId}&qty=${qty}${supplierId ? `&supplier=${supplierId}` : ""}`,
            );
          }}
        />
      )}
    </div>
  );
}

// ────── Sub-components ──────

function KPICard({
  icon: Icon,
  iconClass,
  bgClass,
  label,
  value,
}: {
  icon: any;
  iconClass: string;
  bgClass: string;
  label: string;
  value: any;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgClass}`}>
          <Icon size={20} className={iconClass} />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DetailModal({
  detail,
  loading,
  horizon,
  currencySymbol,
  formatCurrency,
  onClose,
  onCreatePO,
}: {
  detail: any;
  loading: boolean;
  horizon: number;
  currencySymbol: string;
  formatCurrency: (n: number) => string;
  onClose: () => void;
  onCreatePO: (pid: string, qty: number, supplierId?: string) => void;
}) {
  if (loading || !detail) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <div className="bg-white dark:bg-[#1a2332] rounded-xl shadow-xl w-full max-w-3xl mx-4 p-8 text-center">
          <Brain
            size={32}
            className="mx-auto mb-2 animate-pulse text-purple-400"
          />
          <p className="text-gray-400">Analyzing product demand...</p>
        </div>
      </div>
    );
  }

  const { product, forecast, lastSupplier } = detail;
  const fc = forecast;

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    });

  // History + Projected chart
  const historyDates = (fc.history || []).map((d: any) => fmtDate(d.date));
  const projectedDates = (fc.projected || []).map((d: any) => fmtDate(d.date));
  const allDates = [...historyDates, ...projectedDates];

  const historyQty = (fc.history || []).map((d: any) => d.quantity);
  const projectedQty = (fc.projected || []).map(
    (d: any) => Math.round(d.quantity * 10) / 10,
  );

  // Build two series: actual (full length, null for projected) and forecast (null for history, values for projected)
  const actualSeries = [
    ...historyQty,
    ...new Array(projectedQty.length).fill(null),
  ];
  const forecastSeries = [
    ...new Array(historyQty.length).fill(null),
    ...projectedQty,
  ];

  const demandChartOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "area", height: 260 },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: allDates,
      tickAmount: 15,
    },
    colors: ["#3b82f6", "#a855f7"],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    legend: {
      labels: { colors: "#94a3b8" },
    },
    annotations: {
      xaxis: [
        {
          x: historyDates[historyDates.length - 1],
          borderColor: "#8b5cf6",
          strokeDashArray: 4,
          label: {
            text: "Today",
            orientation: "vertical",
            style: {
              background: "#8b5cf6",
              color: "#fff",
              fontSize: "10px",
            },
          },
        },
      ],
    },
  };

  // Stock depletion chart
  const depletionDates = (fc.depletionTimeline || []).map((d: any) =>
    fmtDate(d.date),
  );
  const depletionStock = (fc.depletionTimeline || []).map((d: any) => d.stock);

  const depletionChartOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "area", height: 200 },
    xaxis: {
      ...baseChartOpts.xaxis,
      categories: depletionDates,
      tickAmount: 10,
    },
    colors: ["#ef4444"],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        formatter: (v: number) => `${Math.round(v)}`,
      },
    },
    annotations: {
      yaxis: [
        {
          y: product.reorderLevel,
          borderColor: "#f59e0b",
          strokeDashArray: 4,
          label: {
            text: `Reorder Level (${product.reorderLevel})`,
            style: {
              background: "#f59e0b",
              color: "#000",
              fontSize: "10px",
            },
          },
        },
      ],
    },
  };

  // Day-of-week seasonality chart
  const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const seasonality = fc.seasonality || [1, 1, 1, 1, 1, 1, 1];

  const dowChartOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 180 },
    xaxis: { ...baseChartOpts.xaxis, categories: dowLabels },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } },
    colors: ["#10b981"],
    yaxis: {
      labels: {
        style: { colors: "#9ca3af", fontSize: "11px" },
        formatter: (v: number) => `${v.toFixed(1)}x`,
      },
    },
  };

  const suggestedQty = Math.max(
    0,
    Math.ceil(horizon * fc.dailyDemand * 1.5 - product.currentStock),
  );

  const TrendIcon = TREND_ICON[fc.trend as keyof typeof TREND_ICON] || Minus;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1a2332] rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <ProductThumb src={product.image} size={36} />
            <div>
              <h2 className="font-semibold text-lg">{product.name}</h2>
              <p className="text-xs text-gray-500">
                {product.sku} · Stock: {product.currentStock} · Reorder at:{" "}
                {product.reorderLevel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Quick stats row */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-gray-50 dark:bg-white/[0.02] rounded-lg p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">
                Daily Demand
              </p>
              <p className="text-lg font-bold mt-0.5">{fc.dailyDemand}</p>
            </div>
            <div className="bg-gray-50 dark:bg-white/[0.02] rounded-lg p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">
                Days Left
              </p>
              <p
                className={`text-lg font-bold mt-0.5 ${fc.dailyDemand > 0 ? (Math.round(product.currentStock / fc.dailyDemand) <= 7 ? "text-red-500" : Math.round(product.currentStock / fc.dailyDemand) <= 21 ? "text-amber-500" : "") : ""}`}
              >
                {fc.dailyDemand > 0
                  ? `${Math.round(product.currentStock / fc.dailyDemand)}d`
                  : "∞"}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-white/[0.02] rounded-lg p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">
                Trend
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendIcon
                  size={16}
                  className={
                    TREND_COLOR[fc.trend as keyof typeof TREND_COLOR] || ""
                  }
                />
                <span className="text-sm font-medium capitalize">
                  {fc.trend}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-white/[0.02] rounded-lg p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">
                Confidence
              </p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${CONFIDENCE[fc.confidence as keyof typeof CONFIDENCE] || ""}`}
              >
                {fc.confidence}
              </span>
            </div>
          </div>

          {/* Demand chart: historical + projected */}
          <div>
            <h3 className="text-sm font-semibold mb-2">
              Sales History & Projected Demand
            </h3>
            <Chart
              options={demandChartOpts}
              series={[
                { name: "Actual Sales", data: actualSeries },
                { name: "Forecast", data: forecastSeries },
              ]}
              type="area"
              height={260}
            />
          </div>

          {/* Stock depletion */}
          <div>
            <h3 className="text-sm font-semibold mb-2">
              Stock Depletion Timeline
            </h3>
            <Chart
              options={depletionChartOpts}
              series={[{ name: "Stock", data: depletionStock }]}
              type="area"
              height={200}
            />
          </div>

          {/* Day-of-week seasonality */}
          <div>
            <h3 className="text-sm font-semibold mb-2">
              Day-of-Week Demand Pattern
            </h3>
            <Chart
              options={dowChartOpts}
              series={[{ name: "Seasonality Index", data: seasonality }]}
              type="bar"
              height={180}
            />
          </div>

          {/* Reorder suggestion */}
          {suggestedQty > 0 && (
            <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl p-4">
              <div>
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Suggested Reorder
                </p>
                <p className="text-2xl font-bold mt-1">{suggestedQty} units</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                  Estimated cost:{" "}
                  {formatCurrency(suggestedQty * product.costPrice)}
                  {lastSupplier && (
                    <span> · Last supplier: {lastSupplier.supplierName}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() =>
                  onCreatePO(
                    product._id,
                    suggestedQty,
                    lastSupplier?.supplierId?.toString(),
                  )
                }
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
              >
                <ShoppingCart size={16} /> Create PO
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
