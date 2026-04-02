import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { inventoryApi } from "@/api/endpoints";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

export default function CategoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingCat, setEditingCat] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => inventoryApi.getCategories().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => inventoryApi.createCategory({ name, description }),
    onSuccess: () => {
      toast.success("Category created");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowForm(false);
      setName("");
      setDescription("");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      inventoryApi.updateCategory(id, data),
    onSuccess: () => {
      toast.success("Category updated");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingCat(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="font-semibold mb-3">New Category</h3>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Category name"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="Description (optional)"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!name || createMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06]">
              <th className="table-header">Name</th>
              <th className="table-header">Description</th>
              <th className="table-header text-right">Products</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Loading...
                </td>
              </tr>
            ) : data?.length ? (
              data.map((cat: any) => (
                <tr
                  key={cat._id}
                  className="hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="table-cell font-medium">{cat.name}</td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {cat.description || "-"}
                  </td>
                  <td className="table-cell text-right tabular-nums">
                    <Link
                      to={`/inventory/products?category=${cat._id}`}
                      className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {cat.productCount ?? 0}
                    </Link>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingCat({ ...cat })}
                        className="text-primary-600 hover:text-primary-700 p-1"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${cat.name}"?`))
                            deleteMutation.mutate(cat._id);
                        }}
                        className="text-red-500 hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingCat && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditingCat(null)}
        >
          <div
            className="bg-white dark:bg-[#111827] rounded-xl shadow-xl w-full max-w-md p-5 border border-transparent dark:border-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Category</h3>
              <button
                onClick={() => setEditingCat(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={editingCat.name}
                onChange={(e) =>
                  setEditingCat({ ...editingCat, name: e.target.value })
                }
                className="input-field"
                placeholder="Category name"
              />
              <input
                value={editingCat.description || ""}
                onChange={(e) =>
                  setEditingCat({ ...editingCat, description: e.target.value })
                }
                className="input-field"
                placeholder="Description"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingCat(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    updateMutation.mutate({
                      id: editingCat._id,
                      data: {
                        name: editingCat.name,
                        description: editingCat.description,
                      },
                    })
                  }
                  disabled={!editingCat.name || updateMutation.isPending}
                  className="btn-primary"
                >
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
