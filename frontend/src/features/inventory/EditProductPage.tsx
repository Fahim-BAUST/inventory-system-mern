import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/api/endpoints";
import toast from "react-hot-toast";
import { useState, useRef } from "react";
import { Trash2, Power, Plus, Package, Pencil, Check, X } from "lucide-react";
import DatePicker from "rsuite/DatePicker";
import "rsuite/DatePicker/styles/index.css";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  genericName: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  manufacturer: z.string().optional(),
  dosageForm: z.string().optional(),
  strength: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).max(100).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  reorderLevel: z.coerce.number().min(0).default(10),
  drugSchedule: z
    .enum(["OTC", "prescription-only", "controlled", ""])
    .optional(),
  requiresPrescription: z.boolean().default(false),
  description: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => inventoryApi.getProduct(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => inventoryApi.getCategories().then((r) => r.data.data),
  });

  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ["batches", id],
    queryFn: () => inventoryApi.getBatches(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const [newBatch, setNewBatch] = useState({
    batchNumber: "",
    quantity: "",
    purchasePrice: "",
  });
  const [batchExpiry, setBatchExpiry] = useState<Date | null>(null);

  const batchMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.createBatch(id!, data),
    onSuccess: () => {
      toast.success("Stock added successfully");
      setNewBatch({ batchNumber: "", quantity: "", purchasePrice: "" });
      setBatchExpiry(null);
      queryClient.invalidateQueries({ queryKey: ["batches", id] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to add stock"),
  });

  const handleAddStock = () => {
    if (!newBatch.batchNumber.trim())
      return toast.error("Batch number is required");
    if (!newBatch.quantity || Number(newBatch.quantity) <= 0)
      return toast.error("Quantity must be > 0");
    if (!batchExpiry) return toast.error("Expiry date is required");
    batchMutation.mutate({
      batchNumber: newBatch.batchNumber,
      quantity: Number(newBatch.quantity),
      expiryDate: batchExpiry.toISOString(),
      purchasePrice: newBatch.purchasePrice
        ? Number(newBatch.purchasePrice)
        : undefined,
    });
  };

  const [editingBatch, setEditingBatch] = useState<string | null>(null);
  const [editBatchData, setEditBatchData] = useState({
    quantity: "",
    batchNumber: "",
    purchasePrice: "",
  });
  const [editBatchExpiry, setEditBatchExpiry] = useState<Date | null>(null);

  const updateBatchMutation = useMutation({
    mutationFn: ({ batchId, data }: { batchId: string; data: any }) =>
      inventoryApi.updateBatch(id!, batchId, data),
    onSuccess: () => {
      toast.success("Batch updated");
      setEditingBatch(null);
      queryClient.invalidateQueries({ queryKey: ["batches", id] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to update batch"),
  });

  const startEditBatch = (b: any) => {
    setEditingBatch(b._id);
    setEditBatchData({
      quantity: String(b.quantity),
      batchNumber: b.batchNumber,
      purchasePrice: b.purchasePrice ? String(b.purchasePrice) : "",
    });
    setEditBatchExpiry(new Date(b.expiryDate));
  };

  const saveEditBatch = () => {
    if (!editingBatch) return;
    if (!editBatchData.quantity || Number(editBatchData.quantity) < 0)
      return toast.error("Quantity must be >= 0");
    if (!editBatchExpiry) return toast.error("Expiry date is required");
    updateBatchMutation.mutate({
      batchId: editingBatch,
      data: {
        batchNumber: editBatchData.batchNumber,
        quantity: Number(editBatchData.quantity),
        expiryDate: editBatchExpiry.toISOString(),
        purchasePrice: editBatchData.purchasePrice
          ? Number(editBatchData.purchasePrice)
          : undefined,
      },
    });
  };

  const mutation = useMutation({
    mutationFn: (data: ProductForm) => inventoryApi.updateProduct(id!, data),
    onSuccess: () => {
      toast.success("Product updated");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/inventory/products");
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to update"),
  });

  const toggleMutation = useMutation({
    mutationFn: () => inventoryApi.toggleProductStatus(id!),
    onSuccess: (res) => {
      const msg = res.data.data.isActive
        ? "Product enabled"
        : "Product disabled";
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to update status"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    values: product
      ? {
          name: product.name || "",
          genericName: product.genericName || "",
          sku: product.sku || "",
          barcode: product.barcode || "",
          categoryId: product.categoryId || "",
          manufacturer: product.manufacturer || "",
          dosageForm: product.dosageForm || "",
          strength: product.strength || "",
          unit: product.unit || "piece",
          costPrice: product.costPrice ?? 0,
          sellingPrice: product.sellingPrice ?? 0,
          discount: product.discount ?? 0,
          taxRate: product.taxRate ?? 0,
          reorderLevel: product.reorderLevel ?? 10,
          drugSchedule: product.drugSchedule || "",
          requiresPrescription: product.requiresPrescription ?? false,
          description: product.description || "",
        }
      : undefined,
    mode: "onBlur",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentCount = product?.images?.length || 0;
    if (currentCount + files.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("images", f));
      await inventoryApi.uploadProductImages(id!, formData);
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      toast.success("Images uploaded");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload images");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageDelete = async (publicId: string) => {
    try {
      await inventoryApi.deleteProductImage(id!, publicId);
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading...
      </div>
    );
  if (!product)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Product not found
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <button
          type="button"
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            product.isActive
              ? "text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20"
              : "text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-500/10 dark:hover:bg-green-500/20"
          }`}
        >
          <Power size={16} />
          {toggleMutation.isPending
            ? "Updating..."
            : product.isActive
              ? "Disable Product"
              : "Enable Product"}
        </button>
      </div>

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-6"
      >
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Name *
              </label>
              <input {...register("name")} className="input-field" />
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
              <input {...register("genericName")} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SKU *
              </label>
              <input {...register("sku")} className="input-field" />
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
              <input {...register("barcode")} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select {...register("categoryId")} className="input-field">
                <option value="">Select category</option>
                {categoriesData?.map((cat: any) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Manufacturer
              </label>
              <input {...register("manufacturer")} className="input-field" />
            </div>
          </div>
        </div>

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
                <option value="OTC">OTC</option>
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
                Cost Price (৳) *
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
                Selling Price (৳) *
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

        {/* Stock Management */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package
                size={18}
                className="text-primary-600 dark:text-primary-400"
              />
              <h3 className="text-lg font-semibold">Stock Management</h3>
            </div>
            <span className="text-sm font-medium px-3 py-1 rounded-full bg-gray-100 dark:bg-white/[0.06] tabular-nums">
              Total Stock: {product?.totalStock ?? 0}
            </span>
          </div>

          {/* Add New Batch */}
          <div className="border border-gray-200 dark:border-white/[0.06] rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Add Stock
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Batch Number *
                </label>
                <input
                  type="text"
                  value={newBatch.batchNumber}
                  onChange={(e) =>
                    setNewBatch((p) => ({ ...p, batchNumber: e.target.value }))
                  }
                  className="input-field"
                  placeholder="e.g. BTH-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  value={newBatch.quantity}
                  onChange={(e) =>
                    setNewBatch((p) => ({ ...p, quantity: e.target.value }))
                  }
                  className="input-field"
                  placeholder="0"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expiry Date *
                </label>
                <DatePicker
                  value={batchExpiry}
                  onChange={(val) => setBatchExpiry(val)}
                  onClean={() => setBatchExpiry(null)}
                  format="dd MMM yyyy"
                  placeholder="Select date"
                  placement="bottomStart"
                  className="w-full stock-datepicker"
                  cleanable
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Purchase Price (৳)
                </label>
                <input
                  type="number"
                  value={newBatch.purchasePrice}
                  onChange={(e) =>
                    setNewBatch((p) => ({
                      ...p,
                      purchasePrice: e.target.value,
                    }))
                  }
                  className="input-field"
                  placeholder="Optional"
                  step="0.01"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddStock}
              disabled={batchMutation.isPending}
              className="btn-primary mt-3 text-sm"
            >
              <Plus size={15} />
              {batchMutation.isPending ? "Adding..." : "Add Stock"}
            </button>
          </div>

          {/* Existing Batches */}
          {batchesLoading ? (
            <p className="text-sm text-gray-400">Loading batches...</p>
          ) : batches?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/[0.06]">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Batch
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Qty
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Expiry
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Price
                    </th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b: any) => {
                    const days = Math.ceil(
                      (new Date(b.expiryDate).getTime() - Date.now()) /
                        86400000,
                    );
                    const isEditing = editingBatch === b._id;
                    return (
                      <tr
                        key={b._id}
                        className="border-b border-gray-200 dark:border-white/[0.04]"
                      >
                        {isEditing ? (
                          <>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editBatchData.batchNumber}
                                onChange={(e) =>
                                  setEditBatchData((p) => ({
                                    ...p,
                                    batchNumber: e.target.value,
                                  }))
                                }
                                className="input-field !py-1 !px-2 text-xs font-mono w-24"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={editBatchData.quantity}
                                onChange={(e) =>
                                  setEditBatchData((p) => ({
                                    ...p,
                                    quantity: e.target.value,
                                  }))
                                }
                                className="input-field !py-1 !px-2 text-xs text-right w-20"
                                min="0"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <DatePicker
                                value={editBatchExpiry}
                                onChange={(val) => setEditBatchExpiry(val)}
                                format="dd MMM yyyy"
                                placeholder="Select"
                                placement="bottomStart"
                                className="stock-datepicker w-full"
                                cleanable={false}
                                size="xs"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={editBatchData.purchasePrice}
                                onChange={(e) =>
                                  setEditBatchData((p) => ({
                                    ...p,
                                    purchasePrice: e.target.value,
                                  }))
                                }
                                className="input-field !py-1 !px-2 text-xs text-right w-20"
                                step="0.01"
                                placeholder="—"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={saveEditBatch}
                                  disabled={updateBatchMutation.isPending}
                                  className="p-1 rounded text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                                  title="Save"
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingBatch(null)}
                                  className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                                  title="Cancel"
                                >
                                  <X size={15} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-3 font-mono text-xs">
                              {b.batchNumber}
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums">
                              {b.quantity}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={
                                  days <= 0
                                    ? "text-red-500"
                                    : days <= 30
                                      ? "text-amber-500"
                                      : ""
                                }
                              >
                                {new Date(b.expiryDate).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                              {b.purchasePrice ? `৳${b.purchasePrice}` : "—"}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => startEditBatch(b)}
                                className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                                title="Edit batch"
                              >
                                <Pencil size={14} />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No batches yet. Add stock above.
            </p>
          )}
        </div>

        {/* Product Images */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Product Images</h3>
          <div className="flex flex-wrap gap-3 mb-3">
            {product?.images?.map((img: any) => (
              <div key={img.publicId} className="relative group w-24 h-24">
                <img
                  src={img.url}
                  alt="Product"
                  className="w-24 h-24 object-cover rounded-lg border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => handleImageDelete(img.publicId)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
            {(product?.images?.length || 0) < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-24 h-24 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
              >
                {uploading ? (
                  <span className="text-xs">Uploading...</span>
                ) : (
                  <>
                    <span className="text-2xl">+</span>
                    <span className="text-xs">Upload</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Max 5 images, 5MB each. JPG, PNG, WebP.
          </p>
        </div>

        <div className="card">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            {...register("description")}
            className="input-field"
            rows={3}
          />
        </div>

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
            {mutation.isPending ? "Saving..." : "Update Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
