import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

// Initialize theme from localStorage before render
const stored = JSON.parse(localStorage.getItem("pharmacy-theme") || "{}");
const theme = stored?.state?.theme ?? "dark";
document.documentElement.classList.toggle("dark", theme === "dark");
document.documentElement.classList.toggle("rs-theme-dark", theme === "dark");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: theme === "dark" ? "#1e293b" : "#fff",
              color: theme === "dark" ? "#f1f5f9" : "#1f2937",
              border: `1px solid ${theme === "dark" ? "#334155" : "#e5e7eb"}`,
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
