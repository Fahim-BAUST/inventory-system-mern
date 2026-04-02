import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { inventoryApi } from "@/api/endpoints";
import { AlertTriangle, Clock, Search, Filter } from "lucide-react";

export default function ExpiryTrackerPage() {
  const [filter, setFilter] = useState<"all" | "expired" | "30days" | "60days">(
    "all",
  );
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["expiry-batches"],
    queryFn: () => inventoryApi.getExpiringBatches(90).then((r) => r.data.data),
  });

  const getDaysUntilExpiry = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpiryBadge = (days: number) => {
    if (days <= 0) return "badge-danger";
    if (days <= 30) return "badge-danger";
    if (days <= 60) return "badge-warning";
    return "badge-info";
  };

  const filtered = (data || []).filter((batch: any) => {
    const days = getDaysUntilExpiry(batch.expiryDate);
    if (filter === "expired" && days > 0) return false;
    if (filter === "30days" && (days <= 0 || days > 30)) return false;
    if (filter === "60days" && (days <= 0 || days > 60)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (batch.productName || "").toLowerCase().includes(q) ||
        (batch.batchNumber || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expiry Tracker</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-red-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="text-red-500" size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Expired
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">
                {data?.filter((b: any) => getDaysUntilExpiry(b.expiryDate) <= 0)
                  .length ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <Clock className="text-amber-500" size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Within 30 days
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {data?.filter((b: any) => {
                  const d = getDaysUntilExpiry(b.expiryDate);
                  return d > 0 && d <= 30;
                }).length ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-orange-500">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center">
              <Clock className="text-orange-500" size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Within 90 days
              </p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                {data?.length ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
              placeholder="Search product or batch..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500 dark:text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="input-field w-auto"
            >
              <option value="all">All Batches</option>
              <option value="expired">Expired</option>
              <option value="30days">Within 30 Days</option>
              <option value="60days">Within 60 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch list */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06]">
              <th className="table-header">Product</th>
              <th className="table-header">Batch No</th>
              <th className="table-header text-right">Quantity</th>
              <th className="table-header">Expiry Date</th>
              <th className="table-header text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
            {isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="table-cell text-center text-gray-600 dark:text-gray-400 py-8"
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((batch: any) => {
                const days = getDaysUntilExpiry(batch.expiryDate);
                const badgeClass = getExpiryBadge(days);
                return (
                  <tr
                    key={batch._id}
                    className="hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="table-cell font-medium">
                      <Link
                        to={`/inventory/products/${batch.productId?._id || batch.productId}/edit`}
                        className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        {batch.productName || batch.productId}
                      </Link>
                    </td>
                    <td className="table-cell font-mono text-xs">
                      {batch.batchNumber}
                    </td>
                    <td className="table-cell text-right tabular-nums">
                      {batch.quantity}
                    </td>
                    <td className="table-cell">
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="table-cell text-center">
                      <span className={badgeClass}>
                        {days <= 0 ? "Expired" : `${days}d left`}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="table-cell text-center text-gray-600 dark:text-gray-400 py-8"
                >
                  {search || filter !== "all"
                    ? "No batches match your filters."
                    : "No expiring batches found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
