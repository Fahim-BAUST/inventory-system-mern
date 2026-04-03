import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/api/endpoints";
import { Search, Shield, ChevronLeft, ChevronRight } from "lucide-react";

const actionColors: Record<string, string> = {
  create:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  login:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  logout: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  return:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  status_change:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  import:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  export: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  other: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", search, entityFilter, actionFilter, page],
    queryFn: () =>
      analyticsApi
        .getAuditLog({
          search: search || undefined,
          entity: entityFilter || undefined,
          action: actionFilter || undefined,
          page,
          limit: 30,
        })
        .then((r) => r.data),
  });

  const logs = data?.data || [];
  const meta = data?.meta || { page: 1, pages: 1, total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={24} className="text-primary-600 dark:text-primary-400" />
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <span className="text-sm text-gray-500 ml-auto">
          {meta.total} entries
        </span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search user, description, or ID..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2332] text-sm"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2332] text-sm"
        >
          <option value="">All Entities</option>
          <option value="product">Product</option>
          <option value="sale">Sale</option>
          <option value="user">User</option>
          <option value="customer">Customer</option>
          <option value="purchase_order">Purchase Order</option>
          <option value="prescription">Prescription</option>
          <option value="supplier">Supplier</option>
          <option value="category">Category</option>
          <option value="batch">Batch</option>
          <option value="settings">Settings</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2332] text-sm"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="login">Login</option>
          <option value="return">Return</option>
          <option value="status_change">Status Change</option>
          <option value="import">Import</option>
          <option value="export">Export</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0f1729] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06] text-left text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : !logs.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No audit log entries found
                </td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr
                  key={log._id}
                  className="border-b border-gray-100 dark:border-white/[0.04]"
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {log.userName || log.userId?.toString().slice(-6)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action] || actionColors.other}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{log.entity}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                    {log.description || log.entityId || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {meta.page} of {meta.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={page >= meta.pages}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
