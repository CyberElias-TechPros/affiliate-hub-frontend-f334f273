import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminAPI, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-warning/10 text-warning",
  in_progress: "bg-primary/10 text-primary",
  resolved: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
};

const AdminTickets = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: AdminAPI.listTickets,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "in_progress" | "resolved" | "closed" }) =>
      AdminAPI.updateTicket(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      toast.success("Ticket updated");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const tickets = data?.items ?? [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Support Tickets</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : tickets.length > 0 ? (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div key={ticket._id} className="bg-card rounded-xl p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground">{ticket.subject}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status] || STATUS_STYLES.open}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ticket.name} &lt;{ticket.email}&gt; · {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">{ticket.message}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                {ticket.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: ticket._id, status: "in_progress" })}>
                    Start
                  </Button>
                )}
                {ticket.status !== "resolved" && ticket.status !== "closed" && (
                  <Button size="sm" onClick={() => updateMutation.mutate({ id: ticket._id, status: "resolved" })}>
                    Mark Resolved
                  </Button>
                )}
                {ticket.status === "resolved" && (
                  <Button size="sm" variant="ghost" onClick={() => updateMutation.mutate({ id: ticket._id, status: "closed" })}>
                    Close
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <LifeBuoy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
          <p className="text-muted-foreground">No support tickets yet</p>
        </div>
      )}
    </div>
  );
};

export default AdminTickets;
