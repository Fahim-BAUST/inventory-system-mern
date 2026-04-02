import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/endpoints";
import { CreditCard, Search, Filter, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const PLANS = ["free", "starter", "professional", "enterprise"];
const PLAN_LABELS: Record<string, string> = {
  free: "Free Trial",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export default function AdminSubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    planId: "",
    status: "",
    trialEndsAt: "",
    currentPeriodEnd: "",
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => adminApi.getTenants().then((r) => r.data),
  });

  const subMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: typeof editForm }) =>
      adminApi.updateTenantSubscription(id, {
        planId: form.planId || undefined,
        status: form.status || undefined,
        trialEndsAt: form.trialEndsAt || null,
        currentPeriodEnd: form.currentPeriodEnd || null,
      }),
    onSuccess: () => {
      toast.success("Subscription updated");
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setEditingId(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const extendTrialMutation = useMutation({
    mutationFn: ({
      id,
      currentTrialEnd,
    }: {
      id: string;
      currentTrialEnd?: string;
    }) => {
      const base = currentTrialEnd ? new Date(currentTrialEnd) : new Date();
      const newDate = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
      return adminApi.updateTenantSubscription(id, {
        status: "trial",
        trialEndsAt: newDate.toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("Trial extended by 30 days");
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const tenants = (data?.data || []).filter((t: any) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (statusFilter && t.subscription?.status !== statusFilter) return false;
    if (planFilter && t.subscription?.planId !== planFilter) return false;
    return true;
  });

  const openEdit = (tenant: any) => {
    setEditForm({
      planId: tenant.subscription?.planId || "free",
      status: tenant.subscription?.status || "trial",
      trialEndsAt: tenant.subscription?.trialEndsAt
        ? new Date(tenant.subscription.trialEndsAt).toISOString().split("T")[0]
        : "",
      currentPeriodEnd: tenant.subscription?.currentPeriodEnd
        ? new Date(tenant.subscription.currentPeriodEnd)
            .toISOString()
            .split("T")[0]
        : "",
    });
    setEditingId(tenant._id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage subscription plans and billing status for all tenants
        </p>
      </div>

      {/* Filters */}
      <div className="card !p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 !py-2"
              placeholder="Search tenant..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-gray-500 dark:text-gray-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field !py-2 !w-auto min-w-[130px]"
            >
              <option value="">All Status</option>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="input-field !py-2 !w-auto min-w-[130px]"
            >
              <option value="">All Plans</option>
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {PLAN_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          {(search || statusFilter || planFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPlanFilter("");
              }}
              className="btn-ghost text-xs"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06]">
              <th className="table-header">Tenant</th>
              <th className="table-header text-center">Current Plan</th>
              <th className="table-header text-center">Sub Status</th>
              <th className="table-header text-center">Trial / Expiry</th>
              <th className="table-header text-center">Active</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/[0.04]">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="table-cell">
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : tenants.length ? (
              tenants.map((tenant: any) => {
                const isEditing = editingId === tenant._id;
                const trialEndsAt = tenant.subscription?.trialEndsAt;
                const periodEnd = tenant.subscription?.currentPeriodEnd;
                const displayDate = periodEnd || trialEndsAt;
                const daysLeft = displayDate
                  ? Math.ceil(
                      (new Date(displayDate).getTime() - Date.now()) / 86400000,
                    )
                  : null;

                return (
                  <>
                    <tr
                      key={tenant._id}
                      className="hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-700/20 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {tenant.name.charAt(0).toUpperCase()}
                          </div>
                          <Link
                            to={`/admin/tenants/${tenant._id}`}
                            className="text-sm font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                          >
                            {tenant.name}
                          </Link>
                        </div>
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
                        {displayDate ? (
                          <div>
                            <p className="text-xs tabular-nums">
                              {new Date(displayDate).toLocaleDateString()}
                            </p>
                            {daysLeft !== null && (
                              <p
                                className={`text-[10px] font-medium ${daysLeft <= 0 ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-gray-600 dark:text-gray-400"}`}
                              >
                                {daysLeft <= 0
                                  ? "Expired"
                                  : `${daysLeft}d left`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400 text-xs">
                            —
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        <span
                          className={
                            tenant.isActive ? "badge-success" : "badge-danger"
                          }
                        >
                          {tenant.isActive ? "Yes" : "Suspended"}
                        </span>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              extendTrialMutation.mutate({
                                id: tenant._id,
                                currentTrialEnd: trialEndsAt,
                              })
                            }
                            disabled={extendTrialMutation.isPending}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                            title="Extend trial by 30 days"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button
                            onClick={() =>
                              isEditing ? setEditingId(null) : openEdit(tenant)
                            }
                            className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${isEditing ? "bg-gray-100 dark:bg-white/5 text-gray-500" : "text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10"}`}
                          >
                            {isEditing ? "Cancel" : "Edit Plan"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr
                        key={`${tenant._id}-edit`}
                        className="bg-primary-50/30 dark:bg-primary-500/5"
                      >
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Plan
                              </label>
                              <select
                                value={editForm.planId}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    planId: e.target.value,
                                  })
                                }
                                className="input-field text-sm"
                              >
                                {PLANS.map((p) => (
                                  <option key={p} value={p}>
                                    {PLAN_LABELS[p]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Status
                              </label>
                              <select
                                value={editForm.status}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    status: e.target.value,
                                  })
                                }
                                className="input-field text-sm"
                              >
                                <option value="trial">Trial</option>
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Trial Ends
                              </label>
                              <input
                                type="date"
                                value={editForm.trialEndsAt}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    trialEndsAt: e.target.value,
                                  })
                                }
                                className="input-field text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Period End
                              </label>
                              <input
                                type="date"
                                value={editForm.currentPeriodEnd}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    currentPeriodEnd: e.target.value,
                                  })
                                }
                                className="input-field text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() =>
                                subMutation.mutate({
                                  id: tenant._id,
                                  form: editForm,
                                })
                              }
                              disabled={subMutation.isPending}
                              className="btn-primary text-sm"
                            >
                              {subMutation.isPending ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn-secondary text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="table-cell py-14 text-center text-gray-600 dark:text-gray-400"
                >
                  {search || statusFilter || planFilter
                    ? "No tenants match your filters."
                    : "No tenants yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
