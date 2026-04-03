import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/api/endpoints";
import { useTenant } from "@/hooks/useTenant";
import toast from "react-hot-toast";
import { useState, useRef } from "react";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  genericName: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  manufacturer: z.string().optional(),
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  costPrice: z.coerce.number().min(0, "Cost price must be >= 0"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be >= 0"),
  discount: z.coerce.number().min(0).max(100).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  reorderLevel: z.coerce.number().min(0).default(10),
  drugSchedule: z.enum(["OTC", "prescription-only", "controlled"]).optional(),
  requiresPrescription: z.boolean().default(false),
  description: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function AddProductPage() {
  const navigate = useNavigate();
  const { currencySymbol } = useTenant();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => inventoryApi.getCategories().then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const res = await inventoryApi.createProduct(data);
      const productId = res.data.data._id;

      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((f) => formData.append("images", f));
        await inventoryApi.uploadProductImages(productId, formData);
      }

      return res;
    },
    onSuccess: () => {
      toast.success("Product created successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/inventory/products");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create product");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const total = selectedFiles.length + files.length;
    if (total > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      unit: "piece",
      taxRate: 0,
      discount: 0,
      reorderLevel: 10,
      requiresPrescription: false,
    },
    mode: "onBlur",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add New Product</h1>
      </div>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-6"
      >
        {/* Basic Info */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Name *
              </label>
              <input
                {...register("name")}
                className="input-field"
                placeholder="e.g. Paracetamol 500mg"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Generic Name
              </label>
              <input
                {...register("genericName")}
                className="input-field"
                placeholder="e.g. Acetaminophen"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SKU *
              </label>
              <input
                {...register("sku")}
                className="input-field"
                placeholder="e.g. MED-0001"
              />
              {errors.sku && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.sku.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Barcode
              </label>
              <input
                {...register("barcode")}
                className="input-field"
                placeholder="Scan or enter barcode"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select {...register("categoryId")} className="input-field">
                <option value="">Select category</option>
                {categoriesData?.map((cat: any) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.categoryId.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Manufacturer
              </label>
              <input {...register("manufacturer")} className="input-field" />
            </div>
          </div>
        </div>

        {/* Pharmacy Details */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Pharmacy Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dosage Form
              </label>
              <select {...register("dosageForm")} className="input-field">
                <option value="">Select</option>
                <option value="tablet">Tablet</option>
                <option value="capsule">Capsule</option>
                <option value="syrup">Syrup</option>
                <option value="injection">Injection</option>
                <option value="cream">Cream/Ointment</option>
                <option value="drops">Drops</option>
                <option value="inhaler">Inhaler</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Strength
              </label>
              <input
                {...register("strength")}
                className="input-field"
                placeholder="e.g. 500mg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Drug Schedule
              </label>
              <select {...register("drugSchedule")} className="input-field">
                <option value="">N/A</option>
                <option value="OTC">OTC (Over The Counter)</option>
                <option value="prescription-only">Prescription Only</option>
                <option value="controlled">Controlled</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                {...register("requiresPrescription")}
                type="checkbox"
                className="rounded border-gray-300"
              />
              Requires Prescription
            </label>
          </div>
        </div>

        {/* Pricing */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Pricing & Stock</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit *
              </label>
              <select {...register("unit")} className="input-field">
                <option value="piece">Piece</option>
                <option value="strip">Strip</option>
                <option value="box">Box</option>
                <option value="bottle">Bottle</option>
                <option value="tube">Tube</option>
                <option value="vial">Vial</option>
                <option value="kg">Kg</option>
                <option value="liter">Liter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cost Price ({currencySymbol}) *
              </label>
              <input
                {...register("costPrice")}
                type="number"
                step="0.01"
                className="input-field"
              />
              {errors.costPrice && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.costPrice.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Selling Price ({currencySymbol}) *
              </label>
              <input
                {...register("sellingPrice")}
                type="number"
                step="0.01"
                className="input-field"
              />
              {errors.sellingPrice && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.sellingPrice.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Discount (%)
              </label>
              <input
                {...register("discount")}
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="input-field"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reorder Level
              </label>
              <input
                {...register("reorderLevel")}
                type="number"
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Product Images */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Product Images</h3>
          <div className="flex flex-wrap gap-3 mb-3">
            {previews.map((src, i) => (
              <div key={i} className="relative group w-24 h-24">
                <img
                  src={src}
                  alt={`Preview ${i + 1}`}
                  className="w-24 h-24 object-cover rounded-lg border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
            {selectedFiles.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
              >
                <span className="text-2xl">+</span>
                <span className="text-xs">Upload</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Max 5 images, 5MB each. JPG, PNG, WebP.
          </p>
        </div>

        {/* Description */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            {...register("description")}
            className="input-field"
            rows={3}
            placeholder="Optional product description..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? "Saving..." : "Save Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
