import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminAPI, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

const AdminUsers = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => AdminAPI.listUsers({ limit: 100 }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "user" | "admin" }) =>
      AdminAPI.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: AdminAPI.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  const users = data?.items ?? [];

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this user? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Users</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="p-4 text-sm font-medium text-muted-foreground">User</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Role</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Joined</th>
                <th className="p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-border last:border-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        {user.country && (
                          <p className="text-sm text-muted-foreground">{user.country}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-foreground">{user.email}</td>
                  <td className="p-4">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateRoleMutation.mutate({
                          id: user._id,
                          role: e.target.value as "user" | "admin",
                        })
                      }
                      className="p-2 rounded-lg border border-input bg-background text-foreground text-sm"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-4 text-foreground">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(user._id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;