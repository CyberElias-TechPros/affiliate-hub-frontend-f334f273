import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Users, Package, DollarSign, Loader2, ArrowUpRight, LifeBuoy } from "lucide-react";
import { AdminAPI } from "@/lib/api";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: AdminAPI.metrics,
  });

  const metrics = data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: metrics?.users ?? 0,
      icon: Users,
      color: "text-primary",
      onClick: () => navigate("/admin/users")
    },
    {
      label: "Active Products",
      value: metrics?.products ?? 0,
      icon: Package,
      color: "text-success",
      onClick: () => navigate("/admin/products")
    },
    {
      label: "Total Earnings",
      value: `₦${(metrics?.totalEarnings ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-accent"
    },
    {
      label: "Pending Withdrawals",
      value: metrics?.pendingWithdrawals ?? 0,
      icon: ArrowUpRight,
      color: "text-warning",
      onClick: () => navigate("/admin/withdrawals")
    },
    {
      label: "Open Support Tickets",
      value: metrics?.openTickets ?? 0,
      icon: LifeBuoy,
      color: "text-primary",
      onClick: () => navigate("/admin/tickets")
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className="bg-card rounded-xl p-4 shadow-card text-left hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;