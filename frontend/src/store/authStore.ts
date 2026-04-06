import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissions: string[];
  tenantId: string;
}

// A saved account snapshot (everything needed to restore a session)
export interface LinkedAccount {
  user: User;
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  tenantSlug: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenantId: string | null;
  tenantSlug: string | null;
  isAuthenticated: boolean;

  /** All linked accounts (including the currently active one) */
  linkedAccounts: LinkedAccount[];
  /** Whether the login page should add an account instead of replacing */
  addAccountMode: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setTenant: (tenantId: string, slug: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;

  /** Add another account (logs in without logging out current) */
  addAccount: (user: User, accessToken: string, refreshToken: string) => void;
  /** Switch to a different linked account by user _id */
  switchAccount: (userId: string) => void;
  /** Remove a linked account by user _id */
  removeAccount: (userId: string) => void;
  /** Enter/exit add-account mode */
  setAddAccountMode: (mode: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenantId: null,
      tenantSlug: null,
      isAuthenticated: false,
      linkedAccounts: [],
      addAccountMode: false,

      setAuth: (user, accessToken, refreshToken) => {
        const state = get();

        // If in add-account mode, save current session first, then switch
        if (state.addAccountMode && state.user && state.accessToken) {
          const accounts = _upsertAccount(state.linkedAccounts, {
            user: state.user,
            accessToken: state.accessToken,
            refreshToken: state.refreshToken!,
            tenantId: state.tenantId!,
            tenantSlug: state.tenantSlug,
          });
          // Also add the new account
          const finalAccounts = _upsertAccount(accounts, {
            user,
            accessToken,
            refreshToken,
            tenantId: user.tenantId,
            tenantSlug: null,
          });
          set({
            user,
            accessToken,
            refreshToken,
            tenantId: user.tenantId,
            isAuthenticated: true,
            linkedAccounts: finalAccounts,
            addAccountMode: false,
          });
          return;
        }

        // Normal login — replace active + upsert into linked
        const accounts = _upsertAccount(state.linkedAccounts, {
          user,
          accessToken,
          refreshToken,
          tenantId: user.tenantId,
          tenantSlug: null,
        });
        set({
          user,
          accessToken,
          refreshToken,
          tenantId: user.tenantId,
          isAuthenticated: true,
          linkedAccounts: accounts,
          addAccountMode: false,
        });
      },

      setTokens: (accessToken, refreshToken) => {
        const state = get();
        // Also update the linked account entry
        if (state.user) {
          const accounts = _upsertAccount(state.linkedAccounts, {
            user: state.user,
            accessToken,
            refreshToken,
            tenantId: state.tenantId!,
            tenantSlug: state.tenantSlug,
          });
          set({ accessToken, refreshToken, linkedAccounts: accounts });
        } else {
          set({ accessToken, refreshToken });
        }
      },

      setTenant: (tenantId, slug) => {
        const state = get();
        if (state.user) {
          const accounts = state.linkedAccounts.map((a) =>
            a.user._id === state.user!._id
              ? { ...a, tenantId, tenantSlug: slug }
              : a,
          );
          set({ tenantId, tenantSlug: slug, linkedAccounts: accounts });
        } else {
          set({ tenantId, tenantSlug: slug });
        }
      },

      logout: () => {
        const state = get();
        // Remove current account from linked list
        const remaining = state.linkedAccounts.filter(
          (a) => a.user._id !== state.user?._id,
        );

        if (remaining.length > 0) {
          // Switch to the first remaining account instead of full logout
          const next = remaining[0];
          set({
            user: next.user,
            accessToken: next.accessToken,
            refreshToken: next.refreshToken,
            tenantId: next.tenantId,
            tenantSlug: next.tenantSlug,
            isAuthenticated: true,
            linkedAccounts: remaining,
          });
        } else {
          // No accounts left — full logout
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            tenantId: null,
            tenantSlug: null,
            isAuthenticated: false,
            linkedAccounts: [],
          });
        }
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        return user.permissions.includes(permission);
      },

      addAccount: (user, accessToken, refreshToken) => {
        const state = get();
        // Save current active session
        let accounts = state.linkedAccounts;
        if (state.user && state.accessToken) {
          accounts = _upsertAccount(accounts, {
            user: state.user,
            accessToken: state.accessToken,
            refreshToken: state.refreshToken!,
            tenantId: state.tenantId!,
            tenantSlug: state.tenantSlug,
          });
        }
        // Add new account and switch to it
        accounts = _upsertAccount(accounts, {
          user,
          accessToken,
          refreshToken,
          tenantId: user.tenantId,
          tenantSlug: null,
        });
        set({
          user,
          accessToken,
          refreshToken,
          tenantId: user.tenantId,
          isAuthenticated: true,
          linkedAccounts: accounts,
          addAccountMode: false,
        });
      },

      switchAccount: (userId: string) => {
        const state = get();
        const target = state.linkedAccounts.find((a) => a.user._id === userId);
        if (!target || target.user._id === state.user?._id) return;

        // Save current session tokens before switching
        let accounts = state.linkedAccounts;
        if (state.user && state.accessToken) {
          accounts = _upsertAccount(accounts, {
            user: state.user,
            accessToken: state.accessToken,
            refreshToken: state.refreshToken!,
            tenantId: state.tenantId!,
            tenantSlug: state.tenantSlug,
          });
        }

        set({
          user: target.user,
          accessToken: target.accessToken,
          refreshToken: target.refreshToken,
          tenantId: target.tenantId,
          tenantSlug: target.tenantSlug,
          isAuthenticated: true,
          linkedAccounts: accounts,
        });
      },

      removeAccount: (userId: string) => {
        const state = get();
        const remaining = state.linkedAccounts.filter(
          (a) => a.user._id !== userId,
        );

        // If removing the active account, switch to another or logout
        if (state.user?._id === userId) {
          if (remaining.length > 0) {
            const next = remaining[0];
            set({
              user: next.user,
              accessToken: next.accessToken,
              refreshToken: next.refreshToken,
              tenantId: next.tenantId,
              tenantSlug: next.tenantSlug,
              isAuthenticated: true,
              linkedAccounts: remaining,
            });
          } else {
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              tenantId: null,
              tenantSlug: null,
              isAuthenticated: false,
              linkedAccounts: [],
            });
          }
        } else {
          set({ linkedAccounts: remaining });
        }
      },

      setAddAccountMode: (mode: boolean) => set({ addAccountMode: mode }),
    }),
    {
      name: "pharmacy-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tenantId: state.tenantId,
        tenantSlug: state.tenantSlug,
        isAuthenticated: state.isAuthenticated,
        linkedAccounts: state.linkedAccounts,
      }),
    },
  ),
);

/** Upsert a linked account (max 5 accounts) */
function _upsertAccount(
  accounts: LinkedAccount[],
  entry: LinkedAccount,
): LinkedAccount[] {
  const filtered = accounts.filter((a) => a.user._id !== entry.user._id);
  // Prepend the new/updated entry, cap at 5
  return [entry, ...filtered].slice(0, 5);
}
