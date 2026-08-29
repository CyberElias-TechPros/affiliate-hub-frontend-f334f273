import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { 
  LayoutDashboard, Users, DollarSign, 
  Package, LifeBuoy, LogOut, ChevronLeft 
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/products", icon: Package, label: "Products" },
  { path: "/admin/users", icon: Users, label: "Users" },
  { path: "/admin/withdrawals", icon: DollarSign, label: "Withdrawals" },
  { path: "/admin/tickets", icon: LifeBuoy, label: "Tickets" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => navigate("/admin")}
              className="text-lg font-bold text-foreground hover:text-primary transition-colors"
            >
              Admin Panel
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Back to app"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          <nav className="flex overflow-x-auto scrollbar-hide px-2 pb-2 gap-1">
            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar (desktop) */}
        <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
          <div className="p-4 border-b border-border">
            <button onClick={() => navigate("/admin")} className="text-lg font-bold text-foreground hover:text-primary transition-colors">
              Admin Panel
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {adminNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border space-y-1">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back to App</span>
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLayout;