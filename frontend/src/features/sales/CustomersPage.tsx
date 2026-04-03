import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerApi } from "@/api/endpoints";
import { useTenant } from "@/hooks/useTenant";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  Phone,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";

export default function CustomersPage() {
  const { currencySymbol } = useTenant();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: () =>
      customerApi.getAll(search || undefined).then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => customerApi.create(form),
    onSuccess: () => {
      toast.success("Customer added");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setShowForm(false);
      setForm({ name: "", phone: "", email: "", address: "", notes: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: () => customerApi.update(editingCustomer._id, form),
    onSuccess: () => {
      toast.success("Customer updated");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setEditingCustomer(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerApi.delete(id),
    onSuccess: () => {
      toast.success("Customer removed");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const startEdit = (c: any) => {
    setEditingCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
    });
  };

  const customers = data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={15}
        />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9 !py-2"
        />
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card">
          <h3 className="font-semibold mb-3">New Customer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              placeholder="Customer name *"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              type="tel"
              className="input-field"
              placeholder="Phone"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              className="input-field"
              placeholder="Email"
            />
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input-field"
              placeholder="Address"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.name || createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? "Adding..." : "Add Customer"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Customer List */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06]">
              <th className="table-header">Customer</th>
              <th className="table-header">Contact</th>
              <th className="table-header text-right">Purchases</th>
              <th className="table-header text-right">Total Spent</th>
              <th className="table-header">Last Visit</th>
              <th className="table-header w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-200 dark:border-white/[0.04]"
                >
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="table-cell">
                      <div className="h-4 bg-gray-100 dark:bg-white/5 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : customers.length > 0 ? (
              customers.map((c: any) => (
                <tr
                  key={c._id}
                  className="border-b border-gray-200 dark:border-white/[0.04] hover:bg-gray-100/50 dark:hover:bg-white/[0.02]"
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
                        <Users
                          size={14}
                          className="text-primary-600 dark:text-primary-400"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        {c.address && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {c.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm space-y-0.5">
                      {c.phone && (
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Phone size={12} /> {c.phone}
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Mail size={12} /> {c.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-right tabular-nums">
                    {c.totalPurchases || 0}
                  </td>
                  <td className="table-cell text-right font-semibold tabular-nums">
                    {currencySymbol}
                    {(c.totalSpent || 0).toLocaleString()}
                  </td>
                  <td className="table-cell text-sm text-gray-600 dark:text-gray-400">
                    {c.lastVisit
                      ? new Date(c.lastVisit).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Remove this customer?"))
                            deleteMutation.mutate(c._id);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="table-cell py-16 text-center text-gray-600 dark:text-gray-400"
                >
                  {search
                    ? "No customers match your search."
                    : "No customers yet. Add your first customer above."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingCustomer && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditingCustomer(null)}
        >
          <div
            className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-white/[0.06]">
              <h3 className="font-semibold">Edit Customer</h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  type="tel"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Email
                </label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Address
                </label>
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-field"
                  rows={2}
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-200 dark:border-white/[0.06] flex gap-2">
              <button
                onClick={() => updateMutation.mutate()}
                disabled={!form.name || updateMutation.isPending}
                className="btn-primary flex-1"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditingCustomer(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
