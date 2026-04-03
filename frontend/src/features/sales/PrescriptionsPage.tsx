import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { prescriptionApi, customerApi, salesApi } from "@/api/endpoints";
import { useTenant } from "@/hooks/useTenant";
import {
  Plus,
  Search,
  X,
  FileText,
  Copy,
  Pencil,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Stethoscope,
  Phone,
  ClipboardList,
  ShoppingCart,
} from "lucide-react";
import toast from "react-hot-toast";

const statusConfig: Record<
  string,
  { color: string; icon: any; label: string }
> = {
  active: {
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    icon: CheckCircle2,
    label: "Active",
  },
  dispensed: {
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    icon: ShoppingCart,
    label: "Dispensed",
  },
  expired: {
    color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
    icon: Clock,
    label: "Expired",
  },
};

export default function PrescriptionsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    patientName: "",
    doctorName: "",
    doctorPhone: "",
    notes: "",
    medications: "",
    diagnosis: "",
  });
  const [selectedRx, setSelectedRx] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const queryClient = useQueryClient();
  const { formatCurrency } = useTenant();

  const { data: prescriptions, isLoading } = useQuery({
    queryKey: ["prescriptions", search, statusFilter],
    queryFn: () =>
      prescriptionApi
        .getAll({
          search: search || undefined,
          status: statusFilter || undefined,
        })
        .then((r) => r.data.data),
  });

  const { data: customers } = useQuery({
    queryKey: ["rx-customers", customerSearch],
    queryFn: () =>
      customerApi.getAll(customerSearch || undefined).then((r) => r.data.data),
    enabled: customerSearch.length > 0,
  });

  // Fetch linked sales when viewing detail
  const { data: linkedSales } = useQuery({
    queryKey: ["rx-sales", selectedRx?._id],
    queryFn: async () => {
      if (!selectedRx?.saleIds?.length) return [];
      const results = await Promise.all(
        selectedRx.saleIds.slice(0, 10).map((id: string) =>
          salesApi
            .getSale(id)
            .then((r) => r.data.data)
            .catch(() => null),
        ),
      );
      return results.filter(Boolean);
    },
    enabled: !!selectedRx?.saleIds?.length,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => prescriptionApi.create(data),
    onSuccess: (res) => {
      const rx = res.data?.data;
      toast.success(`Prescription ${rx?.prescriptionNumber || ""} created`);
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      resetForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      prescriptionApi.update(id, data),
    onSuccess: (res) => {
      toast.success("Prescription updated");
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      setSelectedRx(res.data?.data || null);
      setEditMode(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  function resetForm() {
    setShowForm(false);
    setEditMode(false);
    setForm({
      patientName: "",
      doctorName: "",
      doctorPhone: "",
      notes: "",
      medications: "",
      diagnosis: "",
    });
    setSelectedCustomer(null);
    setCustomerSearch("");
  }

  function openEdit() {
    if (!selectedRx) return;
    setForm({
      patientName: selectedRx.patientName || "",
      doctorName: selectedRx.doctorName || "",
      doctorPhone: selectedRx.doctorPhone || "",
      notes: selectedRx.notes || "",
      medications: selectedRx.medications || "",
      diagnosis: selectedRx.diagnosis || "",
    });
    setEditMode(true);
  }

  function handleSaveEdit() {
    if (!selectedRx) return;
    updateMutation.mutate({ id: selectedRx._id, data: form });
  }

  function handleCreate() {
    if (!form.patientName.trim())
      return toast.error("Patient name is required");
    createMutation.mutate({
      ...form,
      customerId: selectedCustomer?._id || undefined,
    });
  }

  function copyRxNumber(rxNum: string) {
    navigator.clipboard.writeText(rxNum);
    toast.success(`Copied ${rxNum}`);
  }

  // Stats
  const totalActive =
    prescriptions?.filter((r: any) => r.status === "active").length || 0;
  const totalDispensed =
    prescriptions?.filter((r: any) => r.status === "dispensed").length || 0;
  const totalExpired =
    prescriptions?.filter((r: any) => r.status === "expired").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText size={24} className="text-purple-500" />
            Prescriptions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and track patient prescriptions
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          <Plus size={16} /> New Prescription
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Active",
            count: totalActive,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-900/20",
          },
          {
            label: "Dispensed",
            count: totalDispensed,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            label: "Expired",
            count: totalExpired,
            color: "text-gray-500 dark:text-gray-400",
            bg: "bg-gray-50 dark:bg-gray-800/30",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} rounded-xl p-4 border border-gray-200 dark:border-white/[0.06]`}
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
              {stat.count}
            </p>
          </div>
        ))}
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
            placeholder="Search patient, doctor, or Rx#..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2332] text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2332] text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="dispensed">Dispensed</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0f1729] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/[0.06] text-left text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 font-medium">Rx #</th>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Doctor</th>
              <th className="px-4 py-3 font-medium">Diagnosis</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Sales</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : !prescriptions?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  No prescriptions found
                </td>
              </tr>
            ) : (
              prescriptions.map((rx: any) => {
                const cfg = statusConfig[rx.status] || statusConfig.active;
                return (
                  <tr
                    key={rx._id}
                    className="border-b border-gray-100 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => {
                      setSelectedRx(rx);
                      setEditMode(false);
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                          {rx.prescriptionNumber}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyRxNumber(rx.prescriptionNumber);
                          }}
                          className="p-0.5 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Copy Rx#"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{rx.patientName}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {rx.doctorName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">
                      {rx.diagnosis || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
                      >
                        <cfg.icon size={10} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">{rx.saleIds?.length || 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedRx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setSelectedRx(null);
            setEditMode(false);
          }}
        >
          <div
            className="bg-white dark:bg-[#1a2332] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                  <FileText
                    size={16}
                    className="text-purple-600 dark:text-purple-400"
                  />
                </div>
                <div>
                  <h2 className="font-semibold">
                    {selectedRx.prescriptionNumber}
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Created {new Date(selectedRx.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedRx.status === "active" && !editMode && (
                  <button
                    onClick={openEdit}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyRxNumber(selectedRx.prescriptionNumber);
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400"
                  title="Copy Rx#"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => {
                    setSelectedRx(null);
                    setEditMode(false);
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {editMode ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Patient Name
                    </label>
                    <input
                      value={form.patientName}
                      onChange={(e) =>
                        setForm({ ...form, patientName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Doctor Name
                      </label>
                      <input
                        value={form.doctorName}
                        onChange={(e) =>
                          setForm({ ...form, doctorName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Doctor Phone
                      </label>
                      <input
                        value={form.doctorPhone}
                        onChange={(e) =>
                          setForm({ ...form, doctorPhone: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Diagnosis
                    </label>
                    <input
                      value={form.diagnosis}
                      onChange={(e) =>
                        setForm({ ...form, diagnosis: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Medications / Items
                    </label>
                    <textarea
                      value={form.medications}
                      onChange={(e) =>
                        setForm({ ...form, medications: e.target.value })
                      }
                      rows={3}
                      placeholder="List medications, dosages, instructions..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const cfg =
                        statusConfig[selectedRx.status] || statusConfig.active;
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}
                        >
                          <cfg.icon size={12} /> {cfg.label}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Patient & Doctor info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <User size={12} /> Patient
                      </div>
                      <p className="font-medium">{selectedRx.patientName}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <Stethoscope size={12} /> Doctor
                      </div>
                      <p className="font-medium">
                        {selectedRx.doctorName || "—"}
                      </p>
                      {selectedRx.doctorPhone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone size={10} /> {selectedRx.doctorPhone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Diagnosis */}
                  {selectedRx.diagnosis && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                        <AlertCircle size={12} /> Diagnosis
                      </div>
                      <p className="text-sm bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/20 rounded-lg px-3 py-2 text-orange-800 dark:text-orange-300">
                        {selectedRx.diagnosis}
                      </p>
                    </div>
                  )}

                  {/* Medications */}
                  {selectedRx.medications && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                        <ClipboardList size={12} /> Medications / Items
                      </div>
                      <div className="text-sm bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/20 rounded-lg px-3 py-2 text-purple-800 dark:text-purple-300 whitespace-pre-wrap">
                        {selectedRx.medications}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedRx.notes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/[0.02] rounded-lg px-3 py-2">
                        {selectedRx.notes}
                      </p>
                    </div>
                  )}

                  {/* Linked Sales */}
                  {selectedRx.saleIds?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                        Linked Sales ({selectedRx.saleIds.length})
                      </p>
                      <div className="space-y-1.5">
                        {linkedSales?.map((sale: any) => (
                          <div
                            key={sale._id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 text-sm"
                          >
                            <div>
                              <span className="font-mono font-medium text-blue-700 dark:text-blue-300">
                                {sale.invoiceNumber}
                              </span>
                              <span className="text-gray-500 text-xs ml-2">
                                {new Date(sale.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <span className="font-semibold">
                              {formatCurrency(sale.totalAmount)}
                            </span>
                          </div>
                        )) || (
                          <p className="text-xs text-gray-400">
                            Loading sales...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer actions */}
            {!editMode && (
              <div className="flex justify-between gap-2 p-4 border-t border-gray-200 dark:border-white/[0.06]">
                <div className="flex gap-2">
                  {selectedRx.status === "expired" && (
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: selectedRx._id,
                          data: { status: "active" },
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-green-300 dark:border-green-600 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      <RefreshCw size={12} /> Reactivate
                    </button>
                  )}
                  {selectedRx.status === "dispensed" && (
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: selectedRx._id,
                          data: { status: "active" },
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-green-300 dark:border-green-600 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      <RefreshCw size={12} /> Reactivate
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedRx.status === "active" && (
                    <>
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: selectedRx._id,
                            data: { status: "dispensed" },
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <ShoppingCart size={12} /> Mark Dispensed
                      </button>
                      <button
                        onClick={() =>
                          updateMutation.mutate({
                            id: selectedRx._id,
                            data: { status: "expired" },
                          })
                        }
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500"
                      >
                        Mark Expired
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={resetForm}
        >
          <div
            className="bg-white dark:bg-[#1a2332] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/[0.06]">
              <h2 className="font-semibold">New Prescription</h2>
              <button
                onClick={resetForm}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Patient Name *
                </label>
                <input
                  value={form.patientName}
                  onChange={(e) =>
                    setForm({ ...form, patientName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                  placeholder="Enter patient name"
                />
              </div>

              {/* Customer link */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Link Customer (optional)
                </label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
                    <span className="text-sm font-medium">
                      {selectedCustomer.name}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch("");
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search by name or phone..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                    />
                    {customerSearch && customers?.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/[0.06] rounded-lg shadow-lg overflow-hidden">
                        {customers.slice(0, 5).map((c: any) => (
                          <button
                            key={c._id}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustomerSearch("");
                              setForm((f) => ({
                                ...f,
                                patientName: f.patientName || c.name,
                              }));
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-500/10 text-sm border-b border-gray-100 dark:border-white/[0.04] last:border-0"
                          >
                            <span className="font-medium">{c.name}</span>
                            {c.phone && (
                              <span className="text-gray-400 ml-2">
                                {c.phone}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Doctor Name
                  </label>
                  <input
                    value={form.doctorName}
                    onChange={(e) =>
                      setForm({ ...form, doctorName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                    placeholder="Dr. ..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Doctor Phone
                  </label>
                  <input
                    value={form.doctorPhone}
                    onChange={(e) =>
                      setForm({ ...form, doctorPhone: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                    placeholder="+880..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Diagnosis
                </label>
                <input
                  value={form.diagnosis}
                  onChange={(e) =>
                    setForm({ ...form, diagnosis: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                  placeholder="e.g. Bacterial infection, Hypertension..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Medications / Items
                </label>
                <textarea
                  value={form.medications}
                  onChange={(e) =>
                    setForm({ ...form, medications: e.target.value })
                  }
                  rows={3}
                  placeholder="List medications with dosages and instructions, one per line...&#10;e.g. Amoxicillin 500mg - 1 tab 3x daily for 7 days&#10;Paracetamol 500mg - PRN for pain"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f1729] text-sm"
                  placeholder="Any additional notes..."
                />
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
                disabled={!form.patientName || createMutation.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending
                  ? "Creating..."
                  : "Create Prescription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
