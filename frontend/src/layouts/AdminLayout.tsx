import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import AccountSwitcher from "@/components/AccountSwitcher";
import {
  Building2,
  LayoutDashboard,
  CreditCard,
  Menu,
  X,
  Sun,
  Moon,
  Shield,
  ChevronRight,
} from "lucide-react";

const adminNavItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Tenants", path: "/admin/tenants", icon: Building2 },
  { label: "Subscriptions", path: "/admin/subscriptions", icon: CreditCard },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-[#0b1120] transition-colors">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "translate-x-0 w-60" : "-translate-x-full w-60"} fixed lg:translate-x-0 lg:static inset-y-0 left-0 z-30 flex flex-col transition-all duration-300`}
        style={{
          background: "linear-gradient(180deg, #0f1623 0%, #111827 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 h-16 px-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Super Admin</p>
            <p className="text-[10px] text-gray-500">Platform Control</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-150 group ${
                  isActive
                    ? "bg-red-500/10 text-red-400 font-medium shadow-sm border border-red-500/10"
                    : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={17}
                    className={
                      isActive
                        ? "text-red-400"
                        : "text-gray-500 group-hover:text-gray-300"
                    }
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="text-red-400/60" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User — account switcher */}
        <div
          className="p-3 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <AccountSwitcher />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="h-14 flex items-center px-4 lg:px-6 gap-3 border-b bg-white/90 dark:bg-white/[0.02] backdrop-blur-sm shadow-sm dark:shadow-none transition-colors"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 lg:hidden transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
              System Online
            </span>
          </div>
          <div className="flex-1" />
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden md:block">
            {user?.email}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
