import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/endpoints";
import {
  ArrowLeft,
  UserPlus,
  Users,
  Copy,
  Check,
  Eye,
  EyeOff,
  Building2,
  CreditCard,
  ShieldCheck,
  ShieldOff,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

const PLANS = ["free", "starter", "professional", "enterprise"];
const PLAN_LABELS: Record<string, string> = {
  free: "Free Trial",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};
const SUB_STATUSES = ["trial", "active", "expired", "cancelled"];

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSubEdit, setShowSubEdit] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [subForm, setSubForm] = useState({
    planId: "",
    status: "",
    trialEndsAt: "",
    currentPeriodEnd: "",
  });
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });

  const { data: tenantData, isLoading: tenantLoading } = useQuery({
    queryKey: ["admin-tenant", tenantId],
    queryFn: () => adminApi.getTenant(tenantId!).then((r) => r.data.data),
    enabled: !!tenantId,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-tenant-users", tenantId],
    queryFn: () => adminApi.getTenantUsers(tenantId!).then((r) => r.data),
    enabled: !!tenantId,
  });

  const createOwnerMutation = useMutation({
    mutationFn: () => adminApi.createTenantOwner(tenantId!, form),
    onSuccess: () => {
      toast.success("Tenant owner created. Password setup email sent.");
      queryClient.invalidateQueries({
        queryKey: ["admin-tenant-users", tenantId],
      });
      setShowCreate(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const statusMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      adminApi.updateTenantStatus(tenantId!, isActive),
    onSuccess: (_, isActive) => {
      toast.success(`Tenant ${isActive ? "activated" : "suspended"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const subMutation = useMutation({
    mutationFn: () =>
      adminApi.updateTenantSubscription(tenantId!, {
        planId: subForm.planId || undefined,
        status: subForm.status || undefined,
        trialEndsAt: subForm.trialEndsAt || null,
        currentPeriodEnd: subForm.currentPeriodEnd || null,
      }),
    onSuccess: () => {
      toast.success("Subscription updated");
      queryClient.invalidateQueries({ queryKey: ["admin-tenant", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setShowSubEdit(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const copyTenantId = () => {
    navigator.clipboard.writeText(tenantId || "");
    setCopied(true);
    toast.success("Tenant ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const openSubEdit = () => {
    if (tenantData) {
      setSubForm({
        planId: tenantData.subscription?.planId || "free",
        status: tenantData.subscription?.status || "trial",
        trialEndsAt: tenantData.subscription?.trialEndsAt
          ? new Date(tenantData.subscription.trialEndsAt)
              .toISOString()
              .split("T")[0]
          : "",
        currentPeriodEnd: tenantData.subscription?.currentPeriodEnd
          ? new Date(tenantData.subscription.currentPeriodEnd)
              .toISOString()
              .split("T")[0]
          : "",
      });
    }
    setShowSubEdit(true);
  };

  const tenant = tenantData;
  const users = usersData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/tenants")}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {tenant?.name || "Tenant Details"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <code className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded font-mono">
              {tenantId}
            </code>
            <button
              onClick={copyTenantId}
              className="text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={16} /> Create Owner
        </button>
      </div>

      {/* Tenant profile + subscription */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shop info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 text-primary-600 dark:text-primary-400 flex items-center justify-center text-lg font-bold">
              {tenant?.name?.charAt(0).toUpperCase() || "T"}
            </div>
            <div>
              <p className="font-semibold">{tenant?.name || "—"}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {tenant?.type}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Email</span>
              <span className="font-medium truncate max-w-[160px]">
                {tenant?.email || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Phone</span>
              <span className="font-medium">{tenant?.phone || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Currency</span>
              <span className="font-medium">
                {tenant?.settings?.currency || "BDT"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Tax Rate</span>
              <span className="font-medium">
                {tenant?.settings?.taxRate ?? 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Slug</span>
              <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                {tenant?.slug}
              </span>
            </div>
          </div>

          {/* Activate / Suspend */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
            {tenantLoading ? (
              <div className="h-9 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
            ) : tenant?.isActive ? (
              <button
                onClick={() => statusMutation.mutate(false)}
                disabled={statusMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors border border-amber-200 dark:border-amber-500/20"
              >
                <ShieldOff size={15} />
                {statusMutation.isPending ? "Suspending..." : "Suspend Tenant"}
              </button>
            ) : (
              <button
                onClick={() => statusMutation.mutate(true)}
                disabled={statusMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors border border-green-200 dark:border-green-500/20"
              >
                <ShieldCheck size={15} />
                {statusMutation.isPending ? "Activating..." : "Activate Tenant"}
              </button>
            )}
          </div>
        </div>

        {/* Subscription */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard
                size={16}
                className="text-gray-500 dark:text-gray-400"
              />
              <h3 className="font-semibold">Subscription</h3>
            </div>
            <button
              onClick={openSubEdit}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              Edit <ChevronDown size={13} />
            </button>
          </div>

          {tenantLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Plan
                </p>
                <p className="text-base font-bold capitalize">
                  {PLAN_LABELS[tenant?.subscription?.planId] ||
                    tenant?.subscription?.planId ||
                    "Free"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Status
                </p>
                <span
                  className={
                    tenant?.subscription?.status === "active"
                      ? "badge-success"
                      : tenant?.subscription?.status === "trial"
                        ? "badge-info"
                        : tenant?.subscription?.status === "expired"
                          ? "badge-danger"
                          : "badge-neutral"
                  }
                >
                  {tenant?.subscription?.status || "trial"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Trial Ends
                </p>
                <p className="text-sm font-medium">
                  {tenant?.subscription?.trialEndsAt
                    ? new Date(
                        tenant.subscription.trialEndsAt,
                      ).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Period End
                </p>
                <p className="text-sm font-medium">
                  {tenant?.subscription?.currentPeriodEnd
                    ? new Date(
                        tenant.subscription.currentPeriodEnd,
                      ).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          )}

          {/* Edit subscription inline */}
          {showSubEdit && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
              <p className="text-sm font-medium mb-3">Update Subscription</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Plan
                  </label>
                  <select
                    value={subForm.planId}
                    onChange={(e) =>
                      setSubForm({ ...subForm, planId: e.target.value })
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
                    value={subForm.status}
                    onChange={(e) =>
                      setSubForm({ ...subForm, status: e.target.value })
                    }
                    className="input-field text-sm"
                  >
                    {SUB_STATUSES.map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Trial Ends At
                  </label>
                  <input
                    type="date"
                    value={subForm.trialEndsAt}
                    onChange={(e) =>
                      setSubForm({ ...subForm, trialEndsAt: e.target.value })
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
                    value={subForm.currentPeriodEnd}
                    onChange={(e) =>
                      setSubForm({
                        ...subForm,
                        currentPeriodEnd: e.target.value,
                      })
                    }
                    className="input-field text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => subMutation.mutate()}
                  disabled={subMutation.isPending}
                  className="btn-primary text-sm"
                >
                  {subMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setShowSubEdit(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Owner Form */}
      {showCreate && (
        <div className="card border-2 border-primary-200 dark:border-primary-500/20">
          <h3 className="font-semibold mb-1">Create Tenant Owner</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Share the Tenant ID, email, and password with the owner so they can
            log in.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                First Name
              </label>
              <input
                value={form.firstName}
                onChange={(e) =>
                  setForm({ ...form, firstName: e.target.value })
                }
                className="input-field"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Last Name
              </label>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="input-field"
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Email
              </label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                type="email"
                placeholder="owner@shop.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="input-field pr-10"
                  type={showOwnerPassword ? "text" : "password"}
                  placeholder="StrongPass123!"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={
                    showOwnerPassword ? "Hide password" : "Show password"
                  }
                >
                  {showOwnerPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Min 8 characters
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Phone (optional)
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                type="tel"
                className="input-field"
                placeholder="+880 1XXX-XXXXXX"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => createOwnerMutation.mutate()}
              disabled={
                createOwnerMutation.isPending ||
                !form.firstName ||
                !form.lastName ||
                !form.email ||
                !form.password
              }
              className="btn-primary"
            >
              {createOwnerMutation.isPending ? "Creating..." : "Create Owner"}
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

      {/* Users table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-white/[0.06] flex items-center gap-2">
          <Users size={16} className="text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold">Tenant Users</h3>
          <span className="badge-neutral ml-auto">{users.length}</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06]">
              <th className="table-header">Name</th>
              <th className="table-header">Email</th>
              <th className="table-header text-center">Role</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/[0.04]">
            {usersLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="table-cell text-center text-gray-500 dark:text-gray-400 py-8"
                >
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="table-cell text-center text-gray-600 dark:text-gray-400 py-10"
                >
                  No users yet. Create an owner to get started.
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr
                  key={user._id}
                  className="hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="table-cell font-medium">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400 text-xs">
                    {user.email}
                  </td>
                  <td className="table-cell text-center">
                    <span className="badge-info capitalize">
                      {user.role?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span
                      className={
                        user.isActive ? "badge-success" : "badge-danger"
                      }
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600 dark:text-gray-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
