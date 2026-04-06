import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, type LinkedAccount } from "@/store/authStore";
import {
  ChevronDown,
  LogOut,
  UserPlus,
  Check,
  X,
  ArrowLeftRight,
} from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  owner: "from-purple-400 to-purple-600",
  admin: "from-blue-400 to-blue-600",
  manager: "from-sky-400 to-sky-600",
  pharmacist: "from-emerald-400 to-emerald-600",
  cashier: "from-amber-400 to-amber-600",
  super_admin: "from-red-400 to-red-600",
};

export default function AccountSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {
    user,
    linkedAccounts,
    switchAccount,
    removeAccount,
    logout,
    setAddAccountMode,
  } = useAuthStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const otherAccounts = linkedAccounts.filter((a) => a.user._id !== user?._id);

  const initials = (u: LinkedAccount["user"]) =>
    `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`;

  const gradientFor = (role: string) =>
    ROLE_COLORS[role] || "from-primary-400 to-primary-600";

  const handleAddAccount = () => {
    setOpen(false);
    setAddAccountMode(true);
    navigate("/login?addAccount=1");
  };

  const handleSwitch = (userId: string) => {
    setOpen(false);
    switchAccount(userId);
    // Force a page reload to reset queries for the new account
    window.location.href = "/dashboard";
  };

  const handleRemove = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    removeAccount(userId);
    // If the removed account was current, store handles auto-switching
    if (userId === user?._id) {
      const remaining = linkedAccounts.filter((a) => a.user._id !== userId);
      if (remaining.length === 0) {
        navigate("/login");
      }
    }
  };

  const handleLogoutAll = () => {
    setOpen(false);
    // Clear everything
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenantId: null,
      tenantSlug: null,
      isAuthenticated: false,
      linkedAccounts: [],
    });
    navigate("/login");
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger — compact user card */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors text-left"
      >
        <div
          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradientFor(user?.role || "")} text-white flex items-center justify-center text-xs font-bold shadow-sm relative`}
        >
          {initials(user!)}
          {otherAccounts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#0f1729]">
              {otherAccounts.length + 1}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate capitalize">
            {user?.role?.replace("_", " ")}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Current account */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
              Current Account
            </p>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradientFor(user?.role || "")} text-white flex items-center justify-center text-xs font-bold`}
              >
                {initials(user!)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
              <Check size={14} className="text-primary-500 shrink-0" />
            </div>
          </div>

          {/* Other accounts */}
          {otherAccounts.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                Switch To
              </p>
              <div className="space-y-1">
                {otherAccounts.map((account) => (
                  <button
                    key={account.user._id}
                    onClick={() => handleSwitch(account.user._id)}
                    className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors group"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradientFor(account.user.role)} text-white flex items-center justify-center text-xs font-bold`}
                    >
                      {initials(account.user)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">
                        {account.user.firstName} {account.user.lastName}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {account.user.email} ·{" "}
                        <span className="capitalize">
                          {account.user.role?.replace("_", " ")}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ArrowLeftRight
                        size={12}
                        className="text-gray-400 group-hover:text-primary-500 transition-colors"
                      />
                      <button
                        onClick={(e) => handleRemove(e, account.user._id)}
                        className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove account"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-3 py-2 space-y-0.5">
            <button
              onClick={handleAddAccount}
              className="w-full flex items-center gap-2.5 px-2 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <UserPlus size={15} />
              Add Another Account
            </button>
            <button
              onClick={() => {
                setOpen(false);
                logout();
                const remaining = linkedAccounts.filter(
                  (a) => a.user._id !== user?._id,
                );
                if (remaining.length === 0) navigate("/login");
              }}
              className="w-full flex items-center gap-2.5 px-2 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
            {linkedAccounts.length > 1 && (
              <button
                onClick={handleLogoutAll}
                className="w-full flex items-center gap-2.5 px-2 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <LogOut size={15} />
                Sign Out All Accounts
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
