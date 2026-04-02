import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roleApi } from "@/api/endpoints";
import { useAuthStore } from "@/store/authStore";
import { Shield, X, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";

const ALL_PERMISSIONS = [
  {
    group: "Inventory",
    permissions: [
      "inventory:read",
      "inventory:create",
      "inventory:update",
      "inventory:delete",
    ],
  },
  {
    group: "Sales",
    permissions: ["sales:read", "sales:create", "sales:return"],
  },
  { group: "Reports", permissions: ["reports:view", "reports:export"] },
  {
    group: "Users",
    permissions: ["users:read", "users:create", "users:update", "users:delete"],
  },
  { group: "Settings", permissions: ["settings:read", "settings:update"] },
  { group: "Subscription", permissions: ["subscription:manage"] },
];

export default function RolesPage() {
  const { user } = useAuthStore();
  const isTenantOwner = user?.role === "tenant_owner";
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleApi.getAll().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      roleApi.create({
        name: formName.toLowerCase().replace(/\s+/g, "_"),
        displayName: formDisplayName,
        permissions: formPermissions,
      }),
    onSuccess: () => {
      toast.success("Role created");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      resetForm();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to create role"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      roleApi.update(id, data),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      resetForm();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleApi.delete(id),
    onSuccess: () => {
      toast.success("Role deleted");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to delete role"),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingRole(null);
    setFormName("");
    setFormDisplayName("");
    setFormPermissions([]);
  };

  const openEdit = (role: any) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDisplayName(role.displayName);
    setFormPermissions([...role.permissions]);
    setShowForm(true);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const togglePermission = (perm: string) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const toggleGroupAll = (permissions: string[]) => {
    const allSelected = permissions.every((p) => formPermissions.includes(p));
    if (allSelected) {
      setFormPermissions((prev) =>
        prev.filter((p) => !permissions.includes(p)),
      );
    } else {
      setFormPermissions((prev) => [...new Set([...prev, ...permissions])]);
    }
  };

  const handleSubmit = () => {
    if (editingRole) {
      updateMutation.mutate({
        id: editingRole._id,
        data: { displayName: formDisplayName, permissions: formPermissions },
      });
    } else {
      createMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        {isTenantOwner && (
          <button
            onClick={openCreate}
            className="btn-primary flex items-center gap-2"
          >
            <Shield size={18} /> Create Custom Role
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingRole
                ? `Edit ${editingRole.displayName} Permissions`
                : "Create Custom Role"}
            </h3>
            <button
              onClick={resetForm}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {(!editingRole || !editingRole.isSystem) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {!editingRole && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role Name *
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="input-field"
                    placeholder="e.g. senior_pharmacist"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name *
                </label>
                <input
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Senior Pharmacist"
                />
              </div>
            </div>
          )}

          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Permissions
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            {ALL_PERMISSIONS.map(({ group, permissions }) => {
              const allSelected = permissions.every((p) =>
                formPermissions.includes(p),
              );
              return (
                <div key={group}>
                  <button
                    type="button"
                    onClick={() => toggleGroupAll(permissions)}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {group} {allSelected ? "✓" : ""}
                  </button>
                  {permissions.map((perm) => (
                    <label
                      key={perm}
                      className="flex items-center gap-1.5 mb-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formPermissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="w-3 h-3 rounded-sm accent-green-500"
                      />
                      <span className="text-xs">{perm.split(":")[1]}</span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                (!editingRole && (!formName || !formDisplayName)) ||
                formPermissions.length === 0 ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              className="btn-primary"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingRole
                  ? "Update Role"
                  : "Create Role"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card text-center text-gray-500 dark:text-gray-400 py-8">
          Loading roles...
        </div>
      ) : (
        <div className="space-y-4">
          {roles?.map((role: any) => (
            <div key={role._id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">{role.displayName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {role.isSystem ? "System role" : "Custom role"} ·{" "}
                    {role.permissions.length} permissions
                  </p>
                </div>
                {isTenantOwner && role.name !== "tenant_owner" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(role)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                      title="Edit permissions"
                    >
                      <Pencil size={15} />
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Delete role "${role.displayName}"? Users with this role will need to be reassigned.`,
                            )
                          )
                            deleteMutation.mutate(role._id);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        title="Delete role"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {ALL_PERMISSIONS.map(({ group, permissions }) => (
                  <div key={group}>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      {group}
                    </p>
                    {permissions.map((perm) => (
                      <div
                        key={perm}
                        className="flex items-center gap-1.5 mb-1"
                      >
                        <div
                          className={`w-3 h-3 rounded-sm ${role.permissions.includes(perm) ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`}
                        />
                        <span className="text-xs">{perm.split(":")[1]}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
