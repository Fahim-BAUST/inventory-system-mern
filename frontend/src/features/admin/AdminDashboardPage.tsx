import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/endpoints";
import {
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.getStats().then((r) => r.data.data),
  });

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => adminApi.getTenants().then((r) => r.data),
  });

  const tenants = tenantsData?.data || [];
  const recentTenants = [...tenants].slice(0, 5);

  const planMap: Record<string, string> = {
    free: "Free Trial",
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };

  const planBadge = (planId: string) => {
    if (planId === "professional" || planId === "enterprise")
      return "badge-info";
    if (planId === "starter") return "badge-success";
    return "badge-neutral";
  };

  const statusBadge = (status: string) => {
    if (status === "active") return "badge-success";
    if (status === "trial") return "badge-info";
    if (status === "expired") return "badge-danger";
    if (status === "cancelled") return "badge-neutral";
    return "badge-neutral";
  };

  const isLoading = statsLoading || tenantsLoading;

  const stats = [
    {
      label: "Total Tenants",
      value: statsData?.totalTenants ?? 0,
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Active Tenants",
      value: statsData?.activeTenants ?? 0,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-500/10",
    },
    {
      label: "On Trial",
      value: statsData?.trialTenants ?? 0,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      label: "Total Users",
      value: statsData?.totalUsers ?? 0,
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-500/10",
    },
    {
      label: "Shop Owners",
      value: statsData?.totalOwners ?? 0,
      icon: ShieldCheck,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-500/10",
    },
    {
      label: "Suspended",
      value: statsData?.suspendedTenants ?? 0,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Platform-wide overview
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card flex flex-col gap-3">
            <div
              className={`w-9 h-9 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}
            >
              <stat.icon size={18} />
            </div>
            <div>
              {isLoading ? (
                <div className="h-7 w-12 bg-gray-200 dark:bg-white/10 rounded animate-pulse mb-1" />
              ) : (
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Plan breakdown + recent tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan breakdown */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
            Plan Breakdown
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 bg-gray-100 dark:bg-white/5 rounded animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(statsData?.planBreakdown || {}).length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No tenants yet
                </p>
              ) : (
                Object.entries(statsData?.planBreakdown || {}).map(
                  ([plan, count]) => {
                    const total = statsData?.totalTenants || 1;
                    const pct = Math.round(((count as number) / total) * 100);
                    return (
                      <div key={plan}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="capitalize font-medium">
                            {planMap[plan] || plan}
                          </span>
                          <span className="tabular-nums text-gray-500 dark:text-gray-400">
                            {count as number} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </div>
          )}

          {/* Subscription status summary */}
          <div className="mt-5 pt-4 border-t border-gray-200 dark:border-white/[0.06] grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-500/10">
              <p className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                {statsData?.activeTenants ?? 0}
              </p>
              <p className="text-[10px] text-green-600/70 dark:text-green-500 uppercase tracking-wide font-medium">
                Active
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {statsData?.trialTenants ?? 0}
              </p>
              <p className="text-[10px] text-amber-600/70 dark:text-amber-500 uppercase tracking-wide font-medium">
                Trial
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-500/10">
              <p className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">
                {statsData?.expiredTenants ?? 0}
              </p>
              <p className="text-[10px] text-red-600/70 dark:text-red-500 uppercase tracking-wide font-medium">
                Expired
              </p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-100 dark:bg-white/[0.04]">
              <p className="text-lg font-bold tabular-nums">
                {statsData?.suspendedTenants ?? 0}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                Suspended
              </p>
            </div>
          </div>
        </div>

        {/* Recent tenants */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Recent Tenants
            </h3>
            <Link
              to="/admin/tenants"
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              View all
            </Link>
          </div>
          {tenantsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : recentTenants.length ? (
            <div className="space-y-1">
              {recentTenants.map((t: any) => (
                <Link
                  key={t._id}
                  to={`/admin/tenants/${t._id}`}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-700/20 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {t.name}
                      </p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 capitalize">
                        {t.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={planBadge(t.subscription?.planId)}>
                      {planMap[t.subscription?.planId] ||
                        t.subscription?.planId ||
                        "free"}
                    </span>
                    <span className={statusBadge(t.subscription?.status)}>
                      {t.subscription?.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 py-4 text-center">
              No tenants yet.
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/admin/tenants"
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/[0.06] hover:border-primary-300 dark:hover:border-primary-500/30 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-all group"
          >
            <Building2
              size={18}
              className="text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400"
            />
            <span className="text-sm font-medium">Manage Tenants</span>
          </Link>
          <Link
            to="/admin/subscriptions"
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/[0.06] hover:border-primary-300 dark:hover:border-primary-500/30 hover:bg-primary-50/50 dark:hover:bg-primary-500/5 transition-all group"
          >
            <CreditCard
              size={18}
              className="text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400"
            />
            <span className="text-sm font-medium">Subscriptions</span>
          </Link>
          <Link
            to="/admin/tenants?action=create"
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/[0.06] hover:border-green-300 dark:hover:border-green-500/30 hover:bg-green-50/50 dark:hover:bg-green-500/5 transition-all group"
          >
            <TrendingUp
              size={18}
              className="text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400"
            />
            <span className="text-sm font-medium">New Tenant</span>
          </Link>
          <Link
            to="/admin/subscriptions?filter=expired"
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-white/[0.06] hover:border-red-300 dark:hover:border-red-500/30 hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-all group"
          >
            <AlertTriangle
              size={18}
              className="text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400"
            />
            <span className="text-sm font-medium">Expired Plans</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
