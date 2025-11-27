import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, LogOut, User as UserIcon } from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformCustomization } from "@/contexts/PlatformCustomizationContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDemoMode } from "@/hooks/useDemoMode";
import DemoModeToggle from "./DemoModeToggle";
import { FirstDepositDialog } from "./FirstDepositDialog";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VerificationProgress } from "./VerificationProgress";
import { useIsMobile } from "@/hooks/use-mobile";
import { DesktopAssetSelector } from "./DesktopAssetSelector";

interface Asset {
  id: string;
  name: string;
  symbol: string;
  icon_url: string;
  payout_percentage: number;
}

interface TradingHeaderProps {
  selectedAssets?: Asset[];
  currentAssetId?: string;
  onAssetSelect?: (asset: Asset) => void;
  onAssetRemove?: (assetId: string) => void;
}

export const TradingHeader = ({ 
  selectedAssets = [],
  currentAssetId,
  onAssetSelect, 
  onAssetRemove 
}: TradingHeaderProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { customization } = usePlatformCustomization();
  const { settings } = usePlatformSettings();
  const { 
    isDemoMode, 
    currentBalance, 
    demoBalance, 
    realBalance,
    toggleDemoMode, 
    resetDemoBalance,
    showFirstDepositDialog,
    setShowFirstDepositDialog,
  } = useDemoMode();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);

  const userInitials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "U";

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, verification_status')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setAvatarUrl(data.avatar_url);
        setVerificationStatus(data.verification_status);
      }
    };

    fetchProfile();
  }, [user]);

  // Don't render on mobile - mobile has its own header
  if (isMobile) {
    return null;
  }
  
  return (
    <>
      <FirstDepositDialog 
        open={showFirstDepositDialog}
        onOpenChange={setShowFirstDepositDialog}
      />
      
      <header className="flex items-center justify-between px-4 py-3 bg-background border-b border-border">
        <div className="flex items-center gap-4">
          {customization.currentLogo && (
            <img 
              src={customization.currentLogo}
              alt="Logo" 
              style={{ height: `${customization.logoHeight}px` }}
              className="cursor-pointer transition-opacity hover:opacity-80 object-contain"
              onClick={() => navigate('/')}
            />
          )}
          
          {/* Asset Selector */}
          {onAssetSelect && onAssetRemove && (
            <DesktopAssetSelector
              selectedAssets={selectedAssets}
              currentAssetId={currentAssetId}
              onAssetSelect={onAssetSelect}
              onAssetRemove={onAssetRemove}
            />
          )}
        </div>

        <div className="flex items-center gap-4">
          {verificationStatus === 'approved' ? (
            <Avatar className="h-12 w-12 cursor-pointer" onClick={() => navigate('/profile')}>
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.user_metadata?.full_name || "User"} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          ) : (
            <VerificationProgress />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  {isDemoMode ? "Demo" : "Real"}
                </div>
                <div className={`font-bold text-xl ${!isDemoMode ? "text-success" : ""}`}>
                  R$ {formatCurrency(currentBalance)}
                </div>
              </div>
              <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80">
              <DropdownMenuLabel>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                  <div className={`font-bold text-lg ${!isDemoMode ? "text-success" : "text-foreground"}`}>
                    R$ {formatCurrency(currentBalance)}
                  </div>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator />
              
              <div className="p-2">
                <DemoModeToggle
                  isDemoMode={isDemoMode}
                  onToggle={toggleDemoMode}
                  onReset={resetDemoBalance}
                  demoBalance={demoBalance}
                  realBalance={realBalance}
                />
              </div>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => navigate('/deposit')}
                className="cursor-pointer text-foreground"
                disabled={isDemoMode}
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Depósito</span>
                {isDemoMode && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Apenas modo real
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/withdrawal')}
                className="cursor-pointer text-foreground"
                disabled={isDemoMode}
              >
                <span>Retirada</span>
                {isDemoMode && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Apenas modo real
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/transactions')}
                className="cursor-pointer text-foreground"
              >
                Transações
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/profile')}
                className="cursor-pointer text-foreground"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="default" 
            className="bg-warning hover:bg-warning/90 text-warning-foreground"
            onClick={() => navigate('/deposit')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Depósito
          </Button>

          <ThemeToggle />

          <LanguageSelector />
        </div>
      </header>
    </>
  );
};
