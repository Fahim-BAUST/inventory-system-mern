import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Ban } from "lucide-react";

export default function PaymentResultPage() {
  const [params] = useSearchParams();
  const status = params.get("status");
  const tranId = params.get("tran_id");

  const config = {
    success: {
      icon: CheckCircle2,
      iconClass: "text-green-500",
      title: "Payment Successful!",
      message:
        "Your subscription has been activated. You can now enjoy all premium features.",
      bgClass: "bg-green-50 dark:bg-green-500/10",
    },
    failed: {
      icon: XCircle,
      iconClass: "text-red-500",
      title: "Payment Failed",
      message:
        "Something went wrong with your payment. Please try again or contact support.",
      bgClass: "bg-red-50 dark:bg-red-500/10",
    },
    cancelled: {
      icon: Ban,
      iconClass: "text-amber-500",
      title: "Payment Cancelled",
      message: "You cancelled the payment. No charges were made.",
      bgClass: "bg-amber-50 dark:bg-amber-500/10",
    },
  };

  const c = config[status as keyof typeof config] || config.failed;
  const Icon = c.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-[#0b1120]">
      <div className="card max-w-md w-full text-center py-10 px-8">
        <div
          className={`w-16 h-16 rounded-full ${c.bgClass} flex items-center justify-center mx-auto mb-5`}
        >
          <Icon size={32} className={c.iconClass} />
        </div>

        <h1 className="text-2xl font-bold mb-2">{c.title}</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{c.message}</p>

        {tranId && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Transaction ID: {tranId}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/settings/subscription" className="btn-primary">
            Go to Subscription
          </Link>
          <Link to="/" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
