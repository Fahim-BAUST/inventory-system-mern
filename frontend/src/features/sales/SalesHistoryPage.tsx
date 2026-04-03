import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { salesApi, analyticsApi } from "@/api/endpoints";
import { useTenant } from "@/hooks/useTenant";
import DateRangePicker, { type DatePreset } from "@/components/DateRangePicker";
import toast from "react-hot-toast";
import {
  X,
  Receipt,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  RotateCcw,
} from "lucide-react";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

const SALES_PRESETS: DatePreset[] = [
  { label: "Today", getDates: () => [new Date(), new Date()] },
  {
    label: "Yesterday",
    getDates: () => {
      const d = new Date(Date.now() - 86400000);
      return [d, d];
    },
  },
  {
    label: "This Week",
    getDates: () => {
      const now = new Date();
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return [start, now];
    },
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

export default function SalesHistoryPage() {
  const { currencySymbol } = useTenant();
  const [page, setPage] = useState(1);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [returnConfirm, setReturnConfirm] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  const returnMutation = useMutation({
    mutationFn: (saleId: string) => salesApi.createReturn(saleId, {}),
    onSuccess: () => {
      toast.success("Return processed — stock restored");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      analyticsApi
        .createAuditLog({
          action: "return",
          entity: "sale",
          entityId: selectedSale?._id,
          description: `Return on ${selectedSale?.invoiceNumber}`,
        })
        .catch(() => {});
      setSelectedSale((prev: any) =>
        prev ? { ...prev, isReturned: true } : null,
      );
      setReturnConfirm(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Return failed"),
  });

  const handleDownloadPDF = () => {
    if (!selectedSale) return;

    const sale = selectedSale;
    const dateStr = new Date(sale.createdAt).toLocaleDateString("en", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = new Date(sale.createdAt).toLocaleTimeString("en", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemRows = (sale.items || [])
      .map((item: any, i: number) => {
        const qty = item.quantity || 0;
        const price = item.unitPrice || item.price || 0;
        const total = qty * price;
        return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px;">
            <strong>${item.productName || item.name}</strong><br/>
            <span style="color:#999;font-size:11px;">${qty} × ${currencySymbol}${price.toFixed(2)}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600;white-space:nowrap;">
            ${currencySymbol}${total.toFixed(2)}
          </td>
        </tr>`;
      })
      .join("");

    const subtotal = sale.subtotal ?? sale.totalAmount ?? 0;
    const discount = sale.discount ?? 0;
    const tax = sale.taxAmount ?? 0;

    let summaryRows = `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#888;">Subtotal</td>
        <td style="padding:6px 0;text-align:right;font-size:13px;">${currencySymbol}${subtotal.toFixed(2)}</td>
      </tr>`;
    if (discount > 0) {
      summaryRows += `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#888;">Discount</td>
        <td style="padding:6px 0;text-align:right;font-size:13px;color:#ef4444;">−${currencySymbol}${discount.toFixed(2)}</td>
      </tr>`;
    }
    if (tax > 0) {
      summaryRows += `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#888;">Tax</td>
        <td style="padding:6px 0;text-align:right;font-size:13px;">${currencySymbol}${tax.toFixed(2)}</td>
      </tr>`;
    }

    const statusColor =
      sale.paymentStatus === "paid"
        ? "#15803d"
        : sale.paymentStatus === "partial"
          ? "#a16207"
          : "#dc2626";
    const statusBg =
      sale.paymentStatus === "paid"
        ? "#dcfce7"
        : sale.paymentStatus === "partial"
          ? "#fef3c7"
          : "#fee2e2";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${sale.invoiceNumber}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1a1a1a; max-width:420px; margin:0 auto; padding:32px 24px; }
    @media print { @page { margin:12mm; } body { padding:0; } }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="text-align:center;padding-bottom:24px;">
    <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);margin:0 auto 14px;display:flex;align-items:center;justify-content:center;">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>
    </div>
    <div style="font-size:22px;font-weight:700;letter-spacing:-0.5px;">${sale.invoiceNumber}</div>
    <div style="font-size:12px;color:#9ca3af;margin-top:4px;">${dateStr} · ${timeStr}</div>
    ${sale.isReturned ? '<div style="margin-top:8px;"><span style="background:#fee2e2;color:#dc2626;font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;">RETURNED</span></div>' : ""}
  </div>

  <!-- Separator -->
  <hr style="border:none;border-top:2px dashed #e5e7eb;margin:0 0 16px;"/>

  <!-- Items -->
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr>
        <th style="text-align:left;font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:8px;">Item</th>
        <th style="text-align:right;font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:8px;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Separator -->
  <hr style="border:none;border-top:2px dashed #e5e7eb;margin:16px 0;"/>

  <!-- Totals -->
  <table style="width:100%;border-collapse:collapse;">
    ${summaryRows}
    <tr>
      <td colspan="2" style="padding:8px 0 0;"><hr style="border:none;border-top:1px solid #e5e7eb;"/></td>
    </tr>
    <tr>
      <td style="padding:10px 0;font-size:16px;font-weight:700;">Total</td>
      <td style="padding:10px 0;text-align:right;font-size:20px;font-weight:700;color:#2563eb;">${currencySymbol}${(sale.totalAmount ?? 0).toFixed(2)}</td>
    </tr>
  </table>

  <!-- Separator -->
  <hr style="border:none;border-top:2px dashed #e5e7eb;margin:8px 0 16px;"/>

  <!-- Payment Info -->
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:6px 0;width:50%;vertical-align:top;">
        <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Payment Method</div>
        <div style="font-size:13px;font-weight:500;text-transform:capitalize;">${sale.paymentMethod}</div>
      </td>
      <td style="padding:6px 0;width:50%;vertical-align:top;">
        <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Status</div>
        <span style="background:${statusBg};color:${statusColor};font-size:11px;font-weight:600;padding:2px 10px;border-radius:99px;text-transform:capitalize;">${sale.paymentStatus}</span>
      </td>
    </tr>
    <tr>
      ${sale.cashier ? `<td style="padding:10px 0;vertical-align:top;"><div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Cashier</div><div style="font-size:13px;font-weight:500;">${sale.cashier}</div></td>` : "<td></td>"}
      <td style="padding:10px 0;vertical-align:top;">
        <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Items</div>
        <div style="font-size:13px;font-weight:500;">${sale.items?.length ?? 0} product(s)</div>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <div style="margin-top:24px;text-align:center;font-size:11px;color:#c0c0c0;">Thank you for your purchase!</div>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=500,height=700");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const dateFrom = startDate ? toDateStr(startDate) : undefined;
  const dateTo = endDate ? toDateStr(endDate) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["sales", page, dateFrom, dateTo],
    queryFn: () =>
      salesApi
        .getSales({
          page,
          limit: 20,
          from: dateFrom,
          to: dateTo,
        })
        .then((r) => r.data),
  });

  // Client-side filtering
  const filteredSales = (data?.data ?? []).filter((sale: any) => {
    if (
      search &&
      !sale.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (paymentFilter && sale.paymentMethod !== paymentFilter) return false;
    if (statusFilter && sale.paymentStatus !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales History</h1>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {data?.meta?.total ?? 0} total sales
        </span>
      </div>

      {/* Filters */}
      <div className="card !p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={15}
            />
            <input
              type="text"
              placeholder="Search invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 !py-2"
            />
          </div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="input-field !w-auto !py-2 min-w-[140px]"
          >
            <option value="">All Payments</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile">Mobile</option>
            <option value="credit">Credit</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field !w-auto !py-2 min-w-[130px]"
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={({ start, end }) => {
              setStartDate(start);
              setEndDate(end);
              setPage(1);
            }}
            presets={SALES_PRESETS}
          />
          {(search ||
            paymentFilter ||
            statusFilter ||
            startDate ||
            endDate) && (
            <button
              onClick={() => {
                setSearch("");
                setPaymentFilter("");
                setStatusFilter("");
                setStartDate(null);
                setEndDate(null);
              }}
              className="btn-ghost text-xs"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                <th className="table-header">Invoice</th>
                <th className="table-header">Date & Time</th>
                <th className="table-header text-right">Items</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-center">Payment</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center w-20">View</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-200 dark:border-white/[0.04]"
                  >
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="table-cell">
                        <div className="h-4 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredSales.length ? (
                filteredSales.map((sale: any) => (
                  <tr
                    key={sale._id}
                    className="border-b border-gray-200 dark:border-white/[0.04] hover:bg-gray-100/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="table-cell">
                      <span className="font-mono text-xs font-semibold bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">
                        {sale.invoiceNumber}
                      </span>
                      {sale.isReturned && (
                        <span className="badge-danger ml-2 text-[10px]">
                          Returned
                        </span>
                      )}
                    </td>
                    <td className="table-cell text-gray-600 dark:text-gray-400">
                      <div>{new Date(sale.createdAt).toLocaleDateString()}</div>
                      <div className="text-[11px]">
                        {new Date(sale.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="table-cell text-right tabular-nums">
                      {sale.items?.length ?? 0}
                    </td>
                    <td className="table-cell text-right font-semibold tabular-nums">
                      {currencySymbol}
                      {sale.totalAmount?.toFixed(2)}
                    </td>
                    <td className="table-cell text-center">
                      <span className="badge-neutral capitalize">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span
                        className={
                          sale.paymentStatus === "paid"
                            ? "badge-success"
                            : sale.paymentStatus === "partial"
                              ? "badge-warning"
                              : "badge-danger"
                        }
                      >
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="table-cell py-16 text-center text-gray-600 dark:text-gray-400"
                  >
                    {search || paymentFilter || statusFilter
                      ? "No sales match your filters."
                      : "No sales recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-white/[0.06]">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Page {data.meta.page} of {data.meta.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost !p-1.5 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.meta.totalPages}
                className="btn-ghost !p-1.5 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Modal — Receipt Style */}
      {selectedSale && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSale(null)}
        >
          <div
            className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-white/[0.06] flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Toolbar (hidden in print) */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/[0.06] print-hide">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Sale Details
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDownloadPDF()}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                  title="Download PDF"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Receipt Area */}
            <div className="overflow-y-auto flex-1">
              {/* Receipt Header */}
              <div className="px-6 pt-6 pb-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary-500/20">
                  <Receipt size={22} className="text-white" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">
                  {selectedSale.invoiceNumber}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(selectedSale.createdAt).toLocaleDateString("en", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {" · "}
                  {new Date(selectedSale.createdAt).toLocaleTimeString("en", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {selectedSale.isReturned && (
                  <span className="badge-danger mt-2 inline-block">
                    Returned
                  </span>
                )}
              </div>

              {/* Dashed separator */}
              <div className="mx-6 border-t-2 border-dashed border-gray-200 dark:border-white/[0.08]" />

              {/* Items */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Item
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </span>
                </div>
                <div className="space-y-0">
                  {selectedSale.items?.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start justify-between py-2.5 border-b border-gray-200 dark:border-white/[0.04] last:border-0"
                    >
                      <div className="flex-1 pr-4">
                        <Link
                          to={`/inventory/products/${item.productId}/edit`}
                          className="text-sm font-medium leading-tight hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          {item.productName || item.name}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
                          {item.quantity} × {currencySymbol}
                          {(item.unitPrice || item.price || 0).toFixed(2)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums shrink-0">
                        {currencySymbol}
                        {(
                          (item.quantity || 0) *
                          (item.unitPrice || item.price || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dashed separator */}
              <div className="mx-6 border-t-2 border-dashed border-gray-200 dark:border-white/[0.08]" />

              {/* Totals */}
              <div className="px-6 py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Subtotal
                  </span>
                  <span className="tabular-nums">
                    {currencySymbol}
                    {(
                      selectedSale.subtotal ?? selectedSale.totalAmount
                    )?.toFixed(2)}
                  </span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Discount
                    </span>
                    <span className="text-red-500 tabular-nums">
                      −{currencySymbol}
                      {selectedSale.discount?.toFixed(2)}
                    </span>
                  </div>
                )}
                {(selectedSale.taxAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Tax
                    </span>
                    <span className="tabular-nums">
                      {currencySymbol}
                      {selectedSale.taxAmount?.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="h-px bg-gray-200 dark:bg-white/[0.06]" />
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold">Total</span>
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">
                    {currencySymbol}
                    {selectedSale.totalAmount?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Dashed separator */}
              <div className="mx-6 border-t-2 border-dashed border-gray-200 dark:border-white/[0.08]" />

              {/* Payment Info */}
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                      Payment Method
                    </span>
                    <p className="text-sm font-medium capitalize">
                      {selectedSale.paymentMethod}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                      Status
                    </span>
                    <span
                      className={
                        selectedSale.paymentStatus === "paid"
                          ? "badge-success"
                          : selectedSale.paymentStatus === "partial"
                            ? "badge-warning"
                            : "badge-danger"
                      }
                    >
                      {selectedSale.paymentStatus}
                    </span>
                  </div>
                  {selectedSale.cashier && (
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                        Cashier
                      </span>
                      <p className="text-sm font-medium">
                        {selectedSale.cashier}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
                      Items
                    </span>
                    <p className="text-sm font-medium tabular-nums">
                      {selectedSale.items?.length ?? 0} product(s)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer action (hidden in print) */}
            <div className="px-5 py-3 border-t border-gray-200 dark:border-white/[0.06] print-hide flex gap-2">
              <button
                onClick={() => handleDownloadPDF()}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Download PDF
              </button>
              {!selectedSale.isReturned &&
                (returnConfirm ? (
                  <div className="flex-1 flex gap-2">
                    <button
                      onClick={() => returnMutation.mutate(selectedSale._id)}
                      disabled={returnMutation.isPending}
                      className="flex-1 py-2 px-3 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {returnMutation.isPending
                        ? "Processing..."
                        : "Confirm Return"}
                    </button>
                    <button
                      onClick={() => setReturnConfirm(false)}
                      className="btn-secondary !py-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setReturnConfirm(true)}
                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <RotateCcw size={16} />
                    Return
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
