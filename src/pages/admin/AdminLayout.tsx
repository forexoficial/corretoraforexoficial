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
  Lock,
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
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  { icon: Bell, label: "Pop-ups", path: "/admin/popups" },
  { icon: Zap, label: "Boosters", path: "/admin/boosters" },
  { icon: UserCheck, label: "Afiliados", path: "/admin/affiliates" },
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);

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
      
      // Check if password is already verified in session
      const verified = sessionStorage.getItem("admin_password_verified");
      if (verified === "true") {
        setPasswordVerified(true);
      } else {
        setPasswordDialogOpen(true);
      }
    };

    checkAdmin();

    // Cleanup: Clear password verification when leaving admin panel
    return () => {
      sessionStorage.removeItem("admin_password_verified");
    };
  }, [user, navigate]);

  const handleVerifyPassword = async () => {
    if (!password) {
      toast.error("Digite a senha");
      return;
    }

    setVerifyingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "verify-admin-password",
        {
          body: { password },
        }
      );

      if (error) {
        toast.error("Erro ao verificar senha");
        setVerifyingPassword(false);
        return;
      }

      if (data?.success) {
        sessionStorage.setItem("admin_password_verified", "true");
        setPasswordVerified(true);
        setPasswordDialogOpen(false);
        toast.success("Acesso autorizado!");
      } else {
        toast.error("Senha incorreta");
        setPassword("");
      }
    } catch (err) {
      toast.error("Erro ao verificar senha");
      console.error(err);
    }

    setVerifyingPassword(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleLogout = () => {
    // Clear admin password verification
    sessionStorage.removeItem("admin_password_verified");
    signOut();
  };

  // Show password dialog if not verified
  if (!passwordVerified) {
    return (
      <Dialog open={passwordDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-6 w-6 text-primary" />
              <DialogTitle>Acesso ao Painel Admin</DialogTitle>
            </div>
            <DialogDescription>
              Digite a senha do painel administrativo para continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Senha de Acesso</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleVerifyPassword();
                  }
                }}
                placeholder="Digite a senha"
                disabled={verifyingPassword}
              />
            </div>
            <Button
              onClick={handleVerifyPassword}
              disabled={verifyingPassword}
              className="w-full"
            >
              {verifyingPassword ? (
                <>
                  <Lock className="h-4 w-4 mr-2 animate-pulse" />
                  Verificando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Verificar Senha
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                signOut();
                navigate("/");
              }}
              className="w-full"
            >
              Voltar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r border-border flex flex-col transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20"
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
                    !sidebarOpen && "justify-center"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <Icon className="h-5 w-5" />
                  {sidebarOpen && <span>{item.label}</span>}
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
              !sidebarOpen && "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-8">
            <Outlet />
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
