import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { 
  LayoutDashboard, Users, ShoppingCart, DollarSign, 
  Package, Settings, LogOut, ChevronLeft 
} from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/products", icon: Package, label: "Products" },
  { path: "/admin/users", icon: Users, label: "Users" },
  { path: "/admin/withdrawals", icon: DollarSign, label: "Withdrawals" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
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