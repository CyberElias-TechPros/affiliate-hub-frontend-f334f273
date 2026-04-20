import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminAPI } from "@/lib/api";
import type { Withdrawal } from "@/types";
import { toast } from "sonner";

const AdminWithdrawals = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: () => AdminAPI.listWithdrawals(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Withdrawal["status"] }) =>
      AdminAPI.updateWithdrawal(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast.success("Withdrawal updated");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const withdrawals = data?.items ?? [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Withdrawals</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : withdrawals.length > 0 ? (
        <div className="space-y-3">
          {withdrawals.map((withdrawal) => (
            <div
              key={withdrawal._id}
              className="bg-card rounded-xl p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {typeof withdrawal.user === "object" ? (
                        <span className="text-muted-foreground font-medium">
                          {withdrawal.user.name.charAt(0)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">?</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {typeof withdrawal.user === "object"
                          ? withdrawal.user.name
                          : "User"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {typeof withdrawal.user === "object"
                          ? withdrawal.user.email
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium text-foreground">
                        ₦{withdrawal.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Method</p>
                      <p className="font-medium text-foreground uppercase">
                        {withdrawal.method}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Requested</p>
                      <p className="font-medium text-foreground">
                        {new Date(withdrawal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          withdrawal.status === "pending"
                            ? "bg-warning/10 text-warning"
                            : withdrawal.status === "processing"
                            ? "bg-primary/10 text-primary"
                            : withdrawal.status === "completed"
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {withdrawal.status}
                      </span>
                    </div>
                  </div>

                  {withdrawal.details && (
                    <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                      <p className="text-muted-foreground">Details:</p>
                      <pre className="text-foreground mt-1">
                        {JSON.stringify(withdrawal.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {withdrawal.status === "pending" && (
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({
                          id: withdrawal._id,
                          status: "completed",
                        })
                      }
                      disabled={updateMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        updateMutation.mutate({
                          id: withdrawal._id,
                          status: "failed",
                        })
                      }
                      disabled={updateMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No withdrawals to review</p>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;