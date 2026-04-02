import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { authApi } from "@/api/endpoints";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Valid email required"),
  tenantId: z.string().min(1, "Tenant ID is required"),
});

type ForgotForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ForgotForm) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(data);
      setSent(true);
      toast.success("Reset link sent if email is registered");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Check Your Email</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          If an account exists with that email, you'll receive a password reset
          link.
        </p>
        <Link
          to="/login"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-center mb-2">
        Forgot Password
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
        Enter your email and we'll send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tenant ID
          </label>
          <input
            {...register("tenantId")}
            className="input-field"
            placeholder="Your shop ID"
          />
          {errors.tenantId && (
            <p className="text-red-500 text-xs mt-1">
              {errors.tenantId.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            {...register("email")}
            type="email"
            className="input-field"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        <Link
          to="/login"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
