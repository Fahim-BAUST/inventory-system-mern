import { useQuery } from "@tanstack/react-query";
import { tenantApi, paymentApi } from "@/api/endpoints";
import { Check } from "lucide-react";

const plans = [
  {
    id: "free",
    name: "Free Trial",
    price: "৳0",
    period: "30 days",
    features: ["1 User", "100 Products", "Basic Reports", "POS Terminal"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "৳499",
    period: "/month",
    features: [
      "5 Users",
      "1,000 Products",
      "Full Reports",
      "PDF/CSV Export",
      "Email Alerts",
    ],
    popular: true,
  },
  {
    id: "professional",
    name: "Professional",
    price: "৳999",
    period: "/month",
    features: [
      "20 Users",
      "Unlimited Products",
      "Advanced Analytics",
      "All Notifications",
      "Priority Support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Unlimited Users",
      "Unlimited Products",
      "API Access",
      "Dedicated Support",
      "Custom Integrations",
    ],
  },
];

export default function SubscriptionPage() {
  const { data: tenant } = useQuery({
    queryKey: ["tenant-me"],
    queryFn: () => tenantApi.getMe().then((r) => r.data.data),
  });

  const currentPlan = tenant?.subscription?.planId || "free";

  const handleUpgrade = async (planId: string) => {
    if (planId === "enterprise") {
      window.open(
        "mailto:support@pharmasaas.com?subject=Enterprise Plan Inquiry",
        "_blank",
      );
      return;
    }
    try {
      const res = await paymentApi.initPayment(planId);
      // SSLCommerz will return a redirect URL
      if (res.data.data?.gatewayUrl) {
        window.location.href = res.data.data.gatewayUrl;
      }
    } catch {
      // handle error
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscription</h1>

      {/* Current plan info */}
      <div className="card">
        <h3 className="font-semibold mb-2">Current Plan</h3>
        <p className="text-lg font-bold capitalize">{currentPlan}</p>
        {tenant?.subscription?.status === "trial" && (
          <p className="text-sm text-yellow-600 mt-1">
            Trial ends:{" "}
            {new Date(tenant.subscription.trialEndsAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`card relative ${plan.popular ? "ring-2 ring-primary-500" : ""}`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-3 py-1 rounded-full">
                Popular
              </span>
            )}
            <h3 className="font-semibold text-lg">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {plan.period}
              </span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check size={16} className="text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(plan.id)}
              disabled={plan.id === currentPlan}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                plan.id === currentPlan
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : plan.popular
                    ? "btn-primary"
                    : "btn-secondary"
              }`}
            >
              {plan.id === currentPlan
                ? "Current Plan"
                : plan.id === "enterprise"
                  ? "Contact Us"
                  : "Upgrade"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
