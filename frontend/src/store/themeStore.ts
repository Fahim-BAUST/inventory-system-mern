import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  theme: "dark" | "light";
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === "dark" ? "light" : "dark";
          document.documentElement.classList.toggle("dark", next === "dark");
          document.documentElement.classList.toggle("rs-theme-dark", next === "dark");
          return { theme: next };
        }),
      setTheme: (theme) => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.classList.toggle("rs-theme-dark", theme === "dark");
        set({ theme });
      },
    }),
    {
      name: "pharmacy-theme",
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle(
            "dark",
            state.theme === "dark",
          );
          document.documentElement.classList.toggle(
            "rs-theme-dark",
            state.theme === "dark",
          );
        }
      },
    },
  ),
);
