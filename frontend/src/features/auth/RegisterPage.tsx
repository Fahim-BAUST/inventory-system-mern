import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { authApi, tenantApi } from "@/api/endpoints";
import toast from "react-hot-toast";

const registerSchema = z
  .object({
    shopName: z.string().min(2, "Shop name is required"),
    shopType: z.enum([
      "pharmacy",
      "grocery",
      "electronics",
      "general",
      "other",
    ]),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email required"),
    phone: z.string().min(6, "Phone number is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Shop info, 2: Account info
  const navigate = useNavigate();
  const { setAuth, setTenant } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { shopType: "pharmacy" },
    mode: "onBlur",
  });

  const nextStep = async () => {
    const valid = await trigger(["shopName", "shopType", "phone"]);
    if (valid) setStep(2);
  };

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      // 1. Create tenant
      const tenantRes = await tenantApi.create({
        name: data.shopName,
        type: data.shopType,
        email: data.email,
        phone: data.phone,
      });
      const tenant = tenantRes.data.data;

      // 2. Register user under that tenant
      const authRes = await authApi.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        tenantId: tenant._id,
        phone: data.phone,
      });

      const { user, tokens } = authRes.data.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      setTenant(tenant._id, tenant.slug);

      toast.success("Registration successful! Welcome aboard.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-center mb-6">Create Account</h2>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? "bg-primary-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
        >
          1
        </div>
        <div
          className={`w-12 h-0.5 ${step >= 2 ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-700"}`}
        />
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? "bg-primary-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
        >
          2
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shop Name
              </label>
              <input
                {...register("shopName")}
                className="input-field"
                placeholder="My Pharmacy"
              />
              {errors.shopName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.shopName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shop Type
              </label>
              <select {...register("shopType")} className="input-field">
                <option value="pharmacy">Pharmacy</option>
                <option value="grocery">Grocery</option>
                <option value="electronics">Electronics</option>
                <option value="general">General Store</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                {...register("phone")}
                className="input-field"
                placeholder="+880 1XXX-XXXXXX"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={nextStep}
              className="btn-primary w-full"
            >
              Next
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input {...register("firstName")} className="input-field" />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input {...register("lastName")} className="input-field" />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
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
                <p className="text-red-500 text-xs mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                className="input-field"
                placeholder="Min 8 characters"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
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
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary flex-1"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </>
        )}
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
