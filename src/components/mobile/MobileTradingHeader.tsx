import { useTranslation } from "@/hooks/useTranslation";
import { Menu, RefreshCw, Wallet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformCustomization } from "@/contexts/PlatformCustomizationContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TradingSidebar } from "@/components/TradingSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClickSound } from "@/hooks/useClickSound";

interface MobileTradingHeaderProps {
  selectedAsset: {
    name: string;
    icon_url: string;
  };
}

export function MobileTradingHeader({ selectedAsset }: MobileTradingHeaderProps) {
  const { t } = useTranslation();
  const { customization } = usePlatformCustomization();
  const { isDemoMode, currentBalance, balanceUpdating, toggleDemoMode } = useDemoMode();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { withClickSound, playClickSound } = useClickSound();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchProfile();
  }, [user]);

  const getUserInitials = () => {
    if (!user?.user_metadata?.full_name) return "US";
    const names = user.user_metadata.full_name.split(" ");
    return names.length > 1 
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0].substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-2.5" style={{ paddingTop: 'max(0.625rem, min(env(safe-area-inset-top), 12px))' }}>
      <div className="flex items-center justify-between gap-2">
        {/* Left Section: Menu + Logo */}
        <div className="flex items-center gap-2">
          <Sheet open={showMenu} onOpenChange={setShowMenu}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[85vw] max-w-[320px]">
              <div className="py-6 px-6 border-b border-border bg-background/95 backdrop-blur-sm">
                <h2 className="text-lg font-semibold">{t("menu", "Menu")}</h2>
                <p className="text-xs text-muted-foreground mt-1">{t("all_features", "Acesse todas as funcionalidades")}</p>
              </div>
              <TradingSidebar isMobileSheet={true} />
            </SheetContent>
          </Sheet>

          {customization.currentLogo && (
            <img 
              src={customization.currentLogo} 
              alt="Logo" 
              style={{ height: `${customization.logoHeight}px` }}
              className="w-auto object-contain cursor-pointer"
              onClick={withClickSound(() => navigate('/'))}
            />
          )}
        </div>

        {/* Center Section: Refresh (only demo) + Balance */}
        <div className="flex items-center gap-2">
          {isDemoMode && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full bg-muted/50"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          <div className="flex flex-col items-start">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                  <span className="text-[10px] text-muted-foreground">
                    {isDemoMode ? t("demo_account", "Conta demo") : t("real_account", "Conta real")}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover backdrop-blur-xl border-border">
                <DropdownMenuItem onClick={withClickSound(toggleDemoMode)}>
                  {isDemoMode ? t("switch_to_real", "Trocar para Conta Real") : t("switch_to_demo", "Trocar para Conta Demo")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className={`text-base font-bold leading-tight ${!isDemoMode ? 'text-green-500' : ''} ${balanceUpdating ? 'animate-pulse' : ''} transition-all duration-300`}>
              R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Right Section: Deposit + Avatar */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90"
            onClick={() => navigate('/deposit')}
            disabled={isDemoMode}
          >
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </Button>

          <Avatar 
            className="h-9 w-9 bg-muted cursor-pointer hover:opacity-80 transition-opacity"
            onClick={withClickSound(() => navigate('/profile'))}
          >
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
            <AvatarFallback className="text-xs font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
