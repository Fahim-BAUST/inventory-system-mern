import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, roleApi } from "@/api/endpoints";
import { Plus, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

export default function UsersPage() {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
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
      toast.success("User invited");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowInvite(false);
      setInviteForm({ firstName: "", lastName: "", email: "", role: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

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
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      Edit
                    </button>
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
