import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { notificationApi } from "@/api/endpoints";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Users,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Pill,
  Tags,
  Truck,
  AlertTriangle,
  History,
  Shield,
  Store,
  CreditCard,
  Sun,
  Moon,
  Bell,
  Search,
  CheckCheck,
  Package2,
  Zap,
  UserPlus,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  {
    label: "Inventory",
    icon: Package,
    children: [
      { label: "Products", path: "/inventory/products", icon: Pill },
      { label: "Categories", path: "/inventory/categories", icon: Tags },
      { label: "Suppliers", path: "/inventory/suppliers", icon: Truck },
      {
        label: "Expiry Tracker",
        path: "/inventory/expiry-tracker",
        icon: AlertTriangle,
      },
    ],
  },
  {
    label: "Sales",
    icon: ShoppingCart,
    children: [
      { label: "POS Terminal", path: "/sales/pos", icon: ShoppingCart },
      { label: "Sales History", path: "/sales/history", icon: History },
    ],
  },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { label: "Users", path: "/settings/users", icon: Users },
      { label: "Roles", path: "/settings/roles", icon: Shield },
      { label: "Shop", path: "/settings/shop", icon: Store },
      { label: "Billing", path: "/settings/subscription", icon: CreditCard },
    ],
  },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([
    "Inventory",
    "Sales",
  ]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.getAll(1, 10).then((r) => r.data),
    refetchInterval: 30000, // poll every 30s
  });

  const notifications = notifData?.data || [];
  const unreadCount = notifData?.meta?.unreadCount ?? 0;

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const notifIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <AlertTriangle size={14} className="text-amber-400" />;
      case "expiry_warning":
        return <AlertTriangle size={14} className="text-red-400" />;
      case "payment":
      case "subscription":
        return <CreditCard size={14} className="text-blue-400" />;
      case "user":
        return <UserPlus size={14} className="text-green-400" />;
      default:
        return <Zap size={14} className="text-gray-400" />;
    }
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label],
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Check if any child route is active (to auto-highlight parent)
  const isGroupActive = (children: { path: string }[]) =>
    children.some((c) => location.pathname.startsWith(c.path));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-[#0b1120]">
      {/* Sidebar Overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0
        fixed lg:static inset-y-0 left-0 z-30 w-[260px] flex flex-col
        bg-white dark:bg-[#0f1729] border-r border-gray-200 dark:border-white/[0.06]
        shadow-sm dark:shadow-none transition-transform duration-200 ease-out`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-gray-200 dark:border-white/[0.06] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Pill size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
            PharmaSaaS
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-colors
                      ${
                        isGroupActive(item.children)
                          ? "text-primary-600 dark:text-primary-400 font-medium"
                          : "text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <item.icon size={16} strokeWidth={1.8} />
                      {item.label}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${expandedMenus.includes(item.label) ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      expandedMenus.includes(item.label)
                        ? "max-h-48 opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="ml-3 pl-3 border-l-2 border-gray-200 dark:border-white/[0.06] mt-0.5 space-y-0.5">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                              isActive
                                ? "text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 font-medium"
                                : "text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                            }`
                          }
                        >
                          <child.icon size={14} strokeWidth={1.8} />
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <NavLink
                  to={item.path!}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-colors ${
                      isActive
                        ? "text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 font-medium"
                        : "text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                    }`
                  }
                >
                  <item.icon size={16} strokeWidth={1.8} />
                  {item.label}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-gray-200 dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate capitalize">
                {user?.role?.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white/90 dark:bg-[#0f1729]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.06] flex items-center px-4 lg:px-6 gap-3 shrink-0 z-10 shadow-sm dark:shadow-none">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center text-sm text-gray-500 dark:text-gray-400">
            {location.pathname
              .split("/")
              .filter(Boolean)
              .map((seg, i, arr) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="mx-1.5">/</span>}
                  <span
                    className={
                      i === arr.length - 1
                        ? "text-gray-700 dark:text-gray-300 font-medium capitalize"
                        : "capitalize"
                    }
                  >
                    {seg.replace(/-/g, " ")}
                  </span>
                </span>
              ))}
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/5 transition-colors"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((prev) => !prev)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/5 transition-colors relative"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-[#111827] border border-gray-200/80 dark:border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        <CheckCheck size={12} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-white/[0.04]">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n: any) => (
                        <button
                          key={n._id}
                          onClick={() => {
                            if (!n.isRead) markReadMutation.mutate(n._id);
                          }}
                          className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors ${
                            !n.isRead
                              ? "bg-primary-50/50 dark:bg-primary-500/5"
                              : ""
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {notifIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-[13px] leading-snug ${
                                !n.isRead
                                  ? "font-medium text-gray-900 dark:text-gray-100"
                                  : "text-gray-600 dark:text-gray-400"
                              }`}
                            >
                              {n.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!n.isRead && (
                            <span className="shrink-0 w-2 h-2 mt-1.5 bg-primary-500 rounded-full" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-white/[0.06]">
            <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 flex items-center justify-center text-[11px] font-bold">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-400">
              {user?.email}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
