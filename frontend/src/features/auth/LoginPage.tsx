import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/api/endpoints";
import toast from "react-hot-toast";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
  tenantId: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    setAuth,
    addAccountMode,
    setAddAccountMode,
    user: currentUser,
  } = useAuthStore();

  // Check if we're in add-account mode (from URL param or store)
  const isAddMode = addAccountMode || searchParams.get("addAccount") === "1";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const handleCancel = () => {
    setAddAccountMode(false);
    navigate(-1);
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const payload: any = { email: data.email, password: data.password };
      if (data.tenantId) payload.tenantId = data.tenantId;
      const res = await authApi.login(payload);
      const { user, tokens } = res.data.data;

      // Prevent adding the same account twice
      if (isAddMode && currentUser && user._id === currentUser._id) {
        toast.error("This account is already active");
        setLoading(false);
        return;
      }

      setAuth(user, tokens.accessToken, tokens.refreshToken);

      if (isAddMode) {
        toast.success(`Switched to ${user.firstName} ${user.lastName}`);
      } else {
        toast.success("Welcome back!");
      }

      if (user.role === "super_admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {isAddMode && (
        <div className="mb-4">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to dashboard
          </button>
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Add Another Account
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              Sign in with a different account. You can switch between accounts
              without logging out.
              {currentUser && (
                <span>
                  {" "}
                  Currently signed in as{" "}
                  <strong>
                    {currentUser.firstName} {currentUser.lastName}
                  </strong>
                  .
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold text-center mb-6">
        {isAddMode ? "Add Account" : "Sign In"}
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tenant ID / Shop ID
          </label>
          <input
            {...register("tenantId")}
            className="input-field"
            placeholder="Leave empty for Super Admin"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Super Admins: leave this empty
          </p>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              className="input-field pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex justify-between items-center text-sm">
          <Link
            to="/forgot-password"
            className="text-primary-600 hover:text-primary-700"
          >
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
