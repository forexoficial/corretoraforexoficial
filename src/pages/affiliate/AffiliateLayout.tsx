import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLink } from "@/components/NavLink";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AffiliateSidebar } from "@/components/affiliate/AffiliateSidebar";

export default function AffiliateLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen w-full flex bg-background">
        {/* Sidebar - Desktop Only */}
        <div className="hidden lg:block">
          <AffiliateSidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-30 h-16">
            <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="hidden lg:flex" />
                <div className="flex items-center gap-2 lg:hidden">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <LogOut className="w-4 h-4 text-primary" />
                  </div>
                  <h1 className="text-base font-bold">Afiliados</h1>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="ghost" onClick={handleLogout} size="sm">
                  <LogOut className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Mobile Navigation - Only visible on mobile */}
          <nav className="border-b bg-card sticky top-16 z-20 lg:hidden">
            <div className="px-2 overflow-x-auto">
              <div className="flex gap-1">
                <NavLink
                  to="/affiliate"
                  end
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent whitespace-nowrap"
                  activeClassName="text-primary border-primary"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden xs:inline">Dashboard</span>
                </NavLink>
                <NavLink
                  to="/affiliate/referrals"
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors border-b-2 border-transparent whitespace-nowrap"
                  activeClassName="text-primary border-primary"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden xs:inline">Referidos</span>
                </NavLink>
              </div>
            </div>
          </nav>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-8 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
