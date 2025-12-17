import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformCustomization } from "@/contexts/PlatformCustomizationContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Users,
  Shield,
  CreditCard,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  DollarSign,
  FileText,
  Zap,
  BarChart3,
  Palette,
  Wrench,
  Coins,
  Wallet,
  Bell,
  KeyRound,
  RefreshCw,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: BarChart3, label: "Gráficos OTC", path: "/admin/charts" },
  { icon: Palette, label: "Aparência Gráfico", path: "/admin/chart-appearance" },
  { icon: Wrench, label: "Gerenciar Trades", path: "/admin/trade-management" },
  { icon: Shield, label: "Verificações", path: "/admin/verifications" },
  { icon: Users, label: "Usuários", path: "/admin/users" },
  { icon: CreditCard, label: "Transações", path: "/admin/transactions" },
  { icon: RefreshCw, label: "Recuperar Depósitos", path: "/admin/transaction-recovery" },
  { icon: TrendingUp, label: "Negociações", path: "/admin/trades" },
  { icon: Coins, label: "Ativos", path: "/admin/assets" },
  { icon: Wallet, label: "Gateways", path: "/admin/gateways" },
  { icon: Mail, label: "Email Marketing", path: "/admin/email-marketing" },
  { icon: Bell, label: "Notificações Push", path: "/admin/push-notifications" },
  { icon: Bell, label: "Pop-ups", path: "/admin/popups" },
  { icon: Zap, label: "Boosters", path: "/admin/boosters" },
  { icon: UserCheck, label: "Afiliados", path: "/admin/affiliates" },
  { icon: Users, label: "Copy Trade", path: "/admin/copy-trade" },
  { icon: DollarSign, label: "Saques", path: "/admin/withdrawals" },
  { icon: FileText, label: "Documentos Legais", path: "/admin/legal" },
  { icon: KeyRound, label: "Login Social", path: "/admin/social-auth" },
  { icon: Settings, label: "Configurações", path: "/admin/settings" },
];

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { customization } = usePlatformCustomization();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (error || !data) {
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Menu Toggle Button */}
      {isMobile && !sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-card border border-border shadow-lg"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r border-border flex flex-col transition-all duration-300",
          isMobile 
            ? cn(
                "fixed inset-y-0 left-0 z-50 w-64",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              )
            : sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Header */}
        <div className={cn(
          "p-4 border-b border-border flex items-center",
          sidebarOpen ? "justify-between" : "justify-center"
        )}>
          {sidebarOpen && customization.currentLogo && (
            <div className="flex flex-col gap-1">
              <img 
                src={customization.currentLogo}
                alt="Logo" 
                className="h-5 cursor-pointer transition-opacity hover:opacity-80"
                onClick={() => navigate('/')}
              />
              <span className="text-[10px] text-muted-foreground font-medium">Admin Panel</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Menu Items */}
        <ScrollArea className="flex-1">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-12",
                    !sidebarOpen && !isMobile && "justify-center"
                  )}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setSidebarOpen(false);
                  }}
                >
                  <Icon className="h-5 w-5" />
                  {(sidebarOpen || isMobile) && <span>{item.label}</span>}
                </Button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-12 text-destructive hover:text-destructive",
              !sidebarOpen && !isMobile && "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {(sidebarOpen || isMobile) && <span>Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-hidden",
        isMobile && "w-full"
      )}>
        <ScrollArea className="h-full">
          <div className={cn("p-4 md:p-8", isMobile && "pt-14")}>
            <Outlet />
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
