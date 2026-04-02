import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi } from "@/api/endpoints";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

export default function ShopSettingsPage() {
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant-me"],
    queryFn: () => tenantApi.getMe().then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => tenantApi.update(data),
    onSuccess: () => {
      toast.success("Settings updated");
      queryClient.invalidateQueries({ queryKey: ["tenant-me"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const { register, handleSubmit } = useForm({
    values: tenant || {},
    mode: "onBlur",
  });

  if (isLoading)
    return (
      <div className="card text-center text-gray-500 dark:text-gray-400 py-8">
        Loading...
      </div>
    );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Shop Settings</h1>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-6"
      >
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">General</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shop Name
              </label>
              <input {...register("name")} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input {...register("phone")} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                License Number
              </label>
              <input {...register("licenseNumber")} className="input-field" />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              {...register("address.street")}
              className="input-field col-span-full"
              placeholder="Street"
            />
            <input
              {...register("address.city")}
              className="input-field"
              placeholder="City"
            />
            <input
              {...register("address.state")}
              className="input-field"
              placeholder="State"
            />
            <input
              {...register("address.zipCode")}
              className="input-field"
              placeholder="ZIP Code"
            />
            <input
              {...register("address.country")}
              className="input-field"
              placeholder="Country"
            />
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <select
                {...register("settings.currency")}
                className="input-field"
              >
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Rate (%)
              </label>
              <input
                {...register("settings.taxRate")}
                type="number"
                step="0.01"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Low Stock Threshold
              </label>
              <input
                {...register("settings.lowStockThreshold")}
                type="number"
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
