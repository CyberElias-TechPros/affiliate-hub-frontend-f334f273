import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationAPI } from "@/lib/api";

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => NotificationAPI.list(false),
  });

  const markAllReadMutation = useMutation({
    mutationFn: NotificationAPI.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = data?.unread ?? 0;

  const handleClick = () => {
    if (unreadCount > 0) markAllReadMutation.mutate();
    navigate("/notifications");
  };

  return (
    <button
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      className={`relative p-2 rounded-full bg-card shadow-sm hover:bg-muted transition-colors ${className ?? ""}`}
      onClick={handleClick}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <Bell className="h-5 w-5 text-muted-foreground" />
      )}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};