import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Share2, 
  Settings,
  Wallet
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/affiliate" },
  { icon: Users, label: "Meus Referidos", path: "/affiliate/referrals" },
  { icon: DollarSign, label: "Comissões", path: "/affiliate/commissions" },
  { icon: Share2, label: "Ferramentas", path: "/affiliate/tools" },
  { icon: Wallet, label: "Saques", path: "/affiliate/withdrawals" },
  { icon: Settings, label: "Configurações", path: "/affiliate/settings" },
];

export function AffiliateSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/affiliate") {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar
      className={state === "collapsed" ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent>
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            {state !== "collapsed" && (
              <div>
                <h2 className="font-bold text-sm">Afiliados</h2>
                <p className="text-xs text-muted-foreground">Painel de Controle</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive(item.path)}>
                    <NavLink
                      to={item.path}
                      end={item.path === "/affiliate"}
                      className="hover:bg-accent"
                      activeClassName="bg-accent text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5" />
                      {state !== "collapsed" && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
