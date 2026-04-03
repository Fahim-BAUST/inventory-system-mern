import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/api/endpoints";
import { useTenant } from "@/hooks/useTenant";
import {
  Plus,
  X,
  Search,
  Trash2,
  Send,
  PackageCheck,
  Ban,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  ordered: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  partial:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  received:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export default function PurchaseOrdersPage() {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [productSearch, setProductSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const queryClient = useQueryClient();
  const { formatCurrency } = useTenant();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["purchase-orders", statusFilter, search],
    queryFn: () =>
      inventoryApi
        .getPurchaseOrders({
          status: statusFilter || undefined,
          search: search || undefined,
        })
        .then((r) => r.data.data),
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => inventoryApi.getSuppliers().then((r) => r.data.data),
  });

  const { data: products } = useQuery({
    queryKey: ["products-search", productSearch],
    queryFn: () =>
      inventoryApi
        .getProducts({ search: productSearch, limit: 20 })
        .then((r) => r.data.data),
    enabled: productSearch.length > 1,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => inventoryApi.createPurchaseOrder(data),
    onSuccess: () => {
      toast.success("Purchase order created");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      inventoryApi.updatePurchaseOrderStatus(id, data),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setSelectedPO(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deletePurchaseOrder(id),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  function resetForm() {
    setShowForm(false);
    setItems([]);
    setSupplierId("");
    setNotes("");
    setExpectedDate("");
    setProductSearch("");
  }

  function addItem(product: any) {
    if (items.find((i) => i.productId === product._id)) return;
    setItems([
      ...items,
      {
        productId: product._id,
        productName: product.name,
        quantity: 1,
        unitCost: product.costPrice || 0,
      },
    ]);
    setProductSearch("");
  }

  function updateItem(idx: number, field: string, value: number) {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function handleCreate() {
    if (!supplierId) return toast.error("Select a supplier");
    if (!items.length) return toast.error("Add at least one item");
    createMutation.mutate({
      supplierId,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })),
      notes,
      expectedDate: expectedDate || undefined,
    });
  }

  function handleReceive(po: any) {
    const receivedItems = po.items.map((i: any) => ({
      productId: i.productId,
      receivedQty: i.quantity - (i.receivedQty || 0),
    }));
    statusMutation.mutate({
      id: po._id,
      data: { status: "received", receivedItems },
    });
  }

  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          <Plus size={16} /> New Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO# or supplier..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2332] text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2332] text-sm"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="ordered">Ordered</option>
          <option value="partial">Partial</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0f1729] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06] text-left text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 font-medium">PO #</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : !orders?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No purchase orders found
                </td>
              </tr>
            ) : (
              orders.map((po: any) => (
                <tr
                  key={po._id}
                  className="border-b border-gray-100 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => setSelectedPO(po)}
                >
                  <td className="px-4 py-3 font-mono font-medium">
                    {po.poNumber}
                  </td>
                  <td className="px-4 py-3">{po.supplierName}</td>
                  <td className="px-4 py-3">{po.items?.length || 0}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(po.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[po.status] || ""}`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(po.createdAt).toLocaleDateString()}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-1">
                      {po.status === "draft" && (
                        <>
                          <button
                            onClick={() =>
                              statusMutation.mutate({
                                id: po._id,
                                data: { status: "ordered" },
                              })
                            }
                            className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"
                            title="Mark as Ordered"
                          >
                            <Send size={14} />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(po._id)}
                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {(po.status === "ordered" || po.status === "partial") && (
                        <button
                          onClick={() => handleReceive(po)}
                          className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                          title="Mark Received"
                        >
                          <PackageCheck size={14} />
                        </button>
                      )}
                      {po.status !== "cancelled" &&
                        po.status !== "received" && (
                          <button
                            onClick={() =>
                              statusMutation.mutate({
                                id: po._id,
                                data: { status: "cancelled" },
                              })
                            }
                            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                            title="Cancel"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#1a2332] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/[0.06]">
              <h2 className="font-semibold">{selectedPO.poNumber}</h2>
              <button
                onClick={() => setSelectedPO(null)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier</span>
                <span>{selectedPO.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedPO.status]}`}
                >
                  {selectedPO.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-medium">
                  {formatCurrency(selectedPO.totalAmount)}
                </span>
              </div>
              {selectedPO.expectedDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Expected</span>
                  <span>
                    {new Date(selectedPO.expectedDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {selectedPO.notes && (
                <div>
                  <span className="text-gray-500 block mb-1">Notes</span>
                  <p className="text-gray-700 dark:text-gray-300">
                    {selectedPO.notes}
                  </p>
                </div>
              )}
              <div className="pt-2">
                <span className="text-gray-500 block mb-2">Items</span>
                <div className="space-y-1">
                  {selectedPO.items?.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between py-1 border-b border-gray-100 dark:border-white/[0.04]"
                    >
                      <span>{item.productName}</span>
                      <span className="text-gray-500">
                        {item.receivedQty || 0}/{item.quantity} ×{" "}
                        {formatCurrency(item.unitCost)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#1a2332] rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/[0.06]">
              <h2 className="font-semibold">New Purchase Order</h2>
              <button
                onClick={resetForm}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Supplier Select */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Supplier *
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                >
                  <option value="">Select supplier</option>
                  {suppliers
                    ?.filter((s: any) => s.isActive !== false)
                    .map((s: any) => (
                      <option key={s._id} value={s._id}>
                        {s.name} {s.company ? `(${s.company})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              {/* Add Products */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Products *
                </label>
                <div className="relative">
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products by name or SKU..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                  />
                  {productSearch.length > 1 && products?.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-auto">
                      {products.map((p: any) => (
                        <button
                          key={p._id}
                          onClick={() => addItem(p)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/[0.03] flex justify-between"
                        >
                          <span>{p.name}</span>
                          <span className="text-gray-400">{p.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              {items.length > 0 && (
                <div className="border border-gray-200 dark:border-white/[0.06] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-white/[0.02] text-gray-500 text-left">
                        <th className="px-3 py-2 font-medium">Product</th>
                        <th className="px-3 py-2 font-medium w-24">Qty</th>
                        <th className="px-3 py-2 font-medium w-28">
                          Unit Cost
                        </th>
                        <th className="px-3 py-2 font-medium w-24">Total</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-t border-gray-100 dark:border-white/[0.04]"
                        >
                          <td className="px-3 py-2">{item.productName}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  idx,
                                  "quantity",
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) =>
                                updateItem(
                                  idx,
                                  "unitCost",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {formatCurrency(item.quantity * item.unitCost)}
                          </td>
                          <td className="px-1 py-2">
                            <button
                              onClick={() => removeItem(idx)}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-end px-3 py-2 bg-gray-50 dark:bg-white/[0.02] font-medium text-sm">
                    Total: {formatCurrency(totalAmount)}
                  </div>
                </div>
              )}

              {/* Extra fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Expected Date
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes
                  </label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-white/[0.06]">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
