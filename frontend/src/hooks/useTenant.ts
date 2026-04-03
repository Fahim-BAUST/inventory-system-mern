import { useQuery } from "@tanstack/react-query";
import { tenantApi } from "@/api/endpoints";
import { useAuthStore } from "@/store/authStore";

export function useTenant() {
  const { user } = useAuthStore();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-me"],
    queryFn: () => tenantApi.getMe().then((r) => r.data.data),
    enabled: !!user?.tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const settings = tenant?.settings || {};
  const currency = settings.currency || "BDT";
  const taxRate = settings.taxRate || 0;
  const lowStockThreshold = settings.lowStockThreshold || 10;
  const expiryAlertDays = settings.expiryAlertDays || 90;

  const currencySymbol =
    currency === "BDT"
      ? "৳"
      : currency === "USD"
        ? "$"
        : currency === "EUR"
          ? "€"
          : currency === "INR"
            ? "₹"
            : currency;

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return `${currencySymbol}0`;
    return `${currencySymbol}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  return {
    tenant,
    isLoading,
    settings,
    currency,
    currencySymbol,
    taxRate,
    lowStockThreshold,
    expiryAlertDays,
    formatCurrency,
  };
}
