import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/api/endpoints";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { validatePhone } from "@/utils/phone";

export default function SuppliersPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
  });
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => inventoryApi.getSuppliers().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => inventoryApi.createSupplier(form),
    onSuccess: () => {
      toast.success("Supplier added");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", company: "", address: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      inventoryApi.updateSupplier(id, data),
    onSuccess: () => {
      toast.success("Supplier updated");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setEditingSupplier(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteSupplier(id),
    onSuccess: () => {
      toast.success("Supplier deleted");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="font-semibold mb-3">New Supplier</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              placeholder="Contact name"
            />
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="input-field"
              placeholder="Company name"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field"
              placeholder="Email"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              type="tel"
              className="input-field"
              placeholder="+880 1XXX-XXXXXX"
            />
            {form.phone && validatePhone(form.phone, true) && (
              <p className="text-red-500 text-xs mt-1">
                {validatePhone(form.phone, true)}
              </p>
            )}
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input-field col-span-full"
              placeholder="Address"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? "Adding..." : "Add Supplier"}
            </button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06]">
              <th className="table-header">Name</th>
              <th className="table-header">Company</th>
              <th className="table-header">Phone</th>
              <th className="table-header">Email</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
            {isLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Loading...
                </td>
              </tr>
            ) : data?.length ? (
              data.map((s: any) => (
                <tr
                  key={s._id}
                  className="hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="table-cell font-medium">{s.name}</td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {s.company || "-"}
                  </td>
                  <td className="table-cell tabular-nums">{s.phone || "-"}</td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {s.email || "-"}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingSupplier({ ...s })}
                        className="text-primary-600 hover:text-primary-700 p-1"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${s.name}"?`))
                            deleteMutation.mutate(s._id);
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
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No suppliers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingSupplier && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditingSupplier(null)}
        >
          <div
            className="bg-white dark:bg-[#111827] rounded-xl shadow-xl w-full max-w-lg p-5 border border-transparent dark:border-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Supplier</h3>
              <button
                onClick={() => setEditingSupplier(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={editingSupplier.name}
                onChange={(e) =>
                  setEditingSupplier({
                    ...editingSupplier,
                    name: e.target.value,
                  })
                }
                className="input-field"
                placeholder="Contact name"
              />
              <input
                value={editingSupplier.company || ""}
                onChange={(e) =>
                  setEditingSupplier({
                    ...editingSupplier,
                    company: e.target.value,
                  })
                }
                className="input-field"
                placeholder="Company"
              />
              <input
                value={editingSupplier.email || ""}
                onChange={(e) =>
                  setEditingSupplier({
                    ...editingSupplier,
                    email: e.target.value,
                  })
                }
                className="input-field"
                placeholder="Email"
              />
              <input
                value={editingSupplier.phone || ""}
                onChange={(e) =>
                  setEditingSupplier({
                    ...editingSupplier,
                    phone: e.target.value,
                  })
                }
                type="tel"
                className="input-field"
                placeholder="+880 1XXX-XXXXXX"
              />
              {editingSupplier.phone &&
                validatePhone(editingSupplier.phone, true) && (
                  <p className="text-red-500 text-xs mt-1">
                    {validatePhone(editingSupplier.phone, true)}
                  </p>
                )}
              <input
                value={editingSupplier.address || ""}
                onChange={(e) =>
                  setEditingSupplier({
                    ...editingSupplier,
                    address: e.target.value,
                  })
                }
                className="input-field col-span-full"
                placeholder="Address"
              />
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setEditingSupplier(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateMutation.mutate({
                    id: editingSupplier._id,
                    data: {
                      name: editingSupplier.name,
                      company: editingSupplier.company,
                      email: editingSupplier.email,
                      phone: editingSupplier.phone,
                      address: editingSupplier.address,
                    },
                  })
                }
                disabled={!editingSupplier.name || updateMutation.isPending}
                className="btn-primary"
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
