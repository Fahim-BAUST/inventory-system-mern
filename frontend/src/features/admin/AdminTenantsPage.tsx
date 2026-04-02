import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/endpoints";
import {
  Building2,
  Plus,
  Eye,
  Trash2,
  Search,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  professional: "Pro",
  enterprise: "Enterprise",
};

export default function AdminTenantsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "pharmacy",
    email: "",
    phone: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => adminApi.getTenants().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createTenant(form),
    onSuccess: () => {
      toast.success("Tenant created");
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setShowCreate(false);
      setForm({ name: "", type: "pharmacy", email: "", phone: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteTenant(id),
    onSuccess: (res: any) => {
      toast.success(res.data?.message || "Tenant deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setDeleteConfirm(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to delete"),
  });

  const tenants = (data?.data || []).filter(
    (t: any) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {data?.data?.length ?? 0} total shops/pharmacies
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> New Tenant
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card border-2 border-primary-200 dark:border-primary-500/20">
          <h3 className="font-semibold mb-4">Create New Tenant</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shop Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="My Pharmacy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input-field"
              >
                <option value="pharmacy">Pharmacy</option>
                <option value="grocery">Grocery</option>
                <option value="electronics">Electronics</option>
                <option value="general">General Store</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                type="email"
                placeholder="shop@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
                placeholder="01700000000"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !form.name ||
                !form.email ||
                !form.phone
              }
              className="btn-primary"
            >
              {createMutation.isPending ? "Creating..." : "Create Tenant"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
          placeholder="Search by name or email..."
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06]">
              <th className="table-header">Shop</th>
              <th className="table-header">Type</th>
              <th className="table-header">Email</th>
              <th className="table-header text-center">Plan</th>
              <th className="table-header text-center">Sub Status</th>
              <th className="table-header text-center">Active</th>
              <th className="table-header text-center">Created</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/[0.04]">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="table-cell">
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : tenants.length ? (
              tenants.map((tenant: any) => (
                <tr
                  key={tenant._id}
                  className="hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-700/20 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold shrink-0">
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {tenant.name}
                        </p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 font-mono">
                          {tenant.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell capitalize text-gray-500 dark:text-gray-400">
                    {tenant.type}
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400 text-xs">
                    {tenant.email}
                  </td>
                  <td className="table-cell text-center">
                    <span
                      className={
                        tenant.subscription?.planId === "professional" ||
                        tenant.subscription?.planId === "enterprise"
                          ? "badge-info"
                          : tenant.subscription?.planId === "starter"
                            ? "badge-success"
                            : "badge-neutral"
                      }
                    >
                      {PLAN_LABELS[tenant.subscription?.planId] || "Free"}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span
                      className={
                        tenant.subscription?.status === "active"
                          ? "badge-success"
                          : tenant.subscription?.status === "trial"
                            ? "badge-info"
                            : tenant.subscription?.status === "expired"
                              ? "badge-danger"
                              : "badge-neutral"
                      }
                    >
                      {tenant.subscription?.status || "trial"}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span
                      className={
                        tenant.isActive ? "badge-success" : "badge-danger"
                      }
                    >
                      {tenant.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="table-cell text-center text-gray-600 dark:text-gray-400 text-xs">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      {deleteConfirm === tenant._id ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-red-500 font-medium">
                            Delete?
                          </span>
                          <button
                            onClick={() => deleteMutation.mutate(tenant._id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 font-semibold"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setDeleteConfirm(tenant._id)}
                            className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                          <Link
                            to={`/admin/tenants/${tenant._id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            Manage <ChevronRight size={12} />
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="table-cell py-14 text-center text-gray-600 dark:text-gray-400"
                >
                  {search
                    ? "No tenants match your search."
                    : "No tenants yet. Create one to get started."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
