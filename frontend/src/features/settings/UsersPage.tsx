import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, roleApi } from "@/api/endpoints";
import { UserPlus, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { validatePhone } from "@/utils/phone";

export default function UsersPage() {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    role: "",
    isActive: true,
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => userApi.getAll().then((r) => r.data),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => roleApi.getAll().then((r) => r.data.data),
  });

  const inviteMutation = useMutation({
    mutationFn: () => userApi.invite(inviteForm),
    onSuccess: () => {
      toast.success("User invited. Password setup email sent.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowInvite(false);
      setInviteForm({ firstName: "", lastName: "", email: "", role: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: () => userApi.update(editingUser._id, editForm),
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditingUser(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => {
      toast.success("User deactivated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: user.phone || "",
      role: user.role || "",
      isActive: user.isActive ?? true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={18} /> Invite User
        </button>
      </div>

      {showInvite && (
        <div className="card">
          <h3 className="font-semibold mb-3">Invite New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={inviteForm.firstName}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, firstName: e.target.value })
              }
              className="input-field"
              placeholder="First name"
            />
            <input
              value={inviteForm.lastName}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, lastName: e.target.value })
              }
              className="input-field"
              placeholder="Last name"
            />
            <input
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, email: e.target.value })
              }
              className="input-field"
              placeholder="Email"
              type="email"
            />
            <select
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, role: e.target.value })
              }
              className="input-field"
            >
              <option value="">Select role</option>
              {roles?.map((r: any) => (
                <option key={r._id} value={r.name}>
                  {r.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowInvite(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => inviteMutation.mutate()}
              disabled={
                !inviteForm.email ||
                !inviteForm.role ||
                inviteMutation.isPending
              }
              className="btn-primary"
            >
              {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit User</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    First Name
                  </label>
                  <input
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Last Name
                  </label>
                  <input
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Phone
                </label>
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  type="tel"
                  className="input-field"
                  placeholder="+880 1XXX-XXXXXX"
                />
                {editForm.phone && validatePhone(editForm.phone, true) && (
                  <p className="text-red-500 text-xs mt-1">
                    {validatePhone(editForm.phone, true)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                  className="input-field"
                >
                  {roles?.map((r: any) => (
                    <option key={r._id} value={r.name}>
                      {r.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={editForm.isActive}
                  onChange={(e) =>
                    setEditForm({ ...editForm, isActive: e.target.checked })
                  }
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label
                  htmlFor="userActive"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Active
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => setEditingUser(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="btn-primary"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
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
              <th className="table-header">Email</th>
              <th className="table-header">Role</th>
              <th className="table-header text-center">Status</th>
              <th className="table-header">Last Login</th>
              <th className="table-header text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/[0.06]">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  Loading...
                </td>
              </tr>
            ) : data?.data?.length ? (
              data.data.map((user: any) => (
                <tr
                  key={user._id}
                  className="hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="table-cell font-medium">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {user.email}
                  </td>
                  <td className="table-cell capitalize">
                    {user.role.replace("_", " ")}
                  </td>
                  <td className="table-cell text-center">
                    <span
                      className={
                        user.isActive ? "badge-success" : "badge-neutral"
                      }
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500 dark:text-gray-400">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        title="Edit user"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Deactivate ${user.firstName} ${user.lastName}?`,
                            )
                          ) {
                            deleteMutation.mutate(user._id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Deactivate user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
