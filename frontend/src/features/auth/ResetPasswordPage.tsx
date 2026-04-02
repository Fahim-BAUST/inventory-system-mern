import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "@/api/endpoints";
import toast from "react-hot-toast";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4 text-red-500">
          Invalid Reset Link
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          This password reset link is invalid or has expired.
        </p>
        <Link
          to="/forgot-password"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: ResetForm) => {
    setLoading(true);
    try {
      await authApi.resetPassword({
        resetToken: token,
        newPassword: data.newPassword,
      });
      toast.success("Password reset successfully!");
      navigate("/login");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Reset failed. Link may have expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-center mb-2">Reset Password</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            New Password
          </label>
          <input
            {...register("newPassword")}
            type="password"
            className="input-field"
            placeholder="Minimum 8 characters"
          />
          {errors.newPassword && (
            <p className="text-red-500 text-xs mt-1">
              {errors.newPassword.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Confirm Password
          </label>
          <input
            {...register("confirmPassword")}
            type="password"
            className="input-field"
            placeholder="Re-enter password"
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Resetting..." : "Reset Password"}
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
