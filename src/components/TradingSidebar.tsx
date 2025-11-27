import { useState } from "react";
import { History, Trophy, HelpCircle, User, MoreHorizontal, Gift, Settings, Zap, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SupportDialog } from "@/components/SupportDialog";
import { TradingHistory } from "@/components/TradingHistory";
import { RankingLeaderboard } from "@/components/RankingLeaderboard";
import { PromotionsMenu } from "@/components/PromotionsMenu";
import { SettingsMenu } from "@/components/SettingsMenu";
import { LegalMenu } from "@/components/LegalMenu";
import { BoosterMenu } from "@/components/BoosterMenu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TradeAnalyticsDashboard } from "@/components/TradeAnalyticsDashboard";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TradingSidebar = ({ 
  isMobileSheet = false,
  userId,
  isDemoMode = false
}: { 
  isMobileSheet?: boolean;
  userId?: string;
  isDemoMode?: boolean;
}) => {
  const navigate = useNavigate();
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBooster, setShowBooster] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showPromotions, setShowPromotions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  return (
    <>
    <aside className={`${isMobileSheet ? 'flex w-full flex-col gap-0 p-0' : 'hidden md:flex md:w-20 py-4 pb-16 gap-4'} bg-sidebar md:border-r border-border flex-col items-center`}>
      <button 
        className={`flex ${isMobileSheet ? 'flex-row justify-start px-6 py-4 border-b border-border/50' : 'flex-col'} items-center gap-${isMobileSheet ? '4' : '1'} p-2 hover:bg-sidebar-accent transition-colors w-full`}
        onClick={() => setShowHistory(true)}
      >
        <History className={`${isMobileSheet ? 'w-5 h-5' : 'w-6 h-6'} text-sidebar-foreground`} />
        <span className={`${isMobileSheet ? 'text-sm' : 'text-[10px]'} text-sidebar-foreground font-medium`}>Histórico</span>
      </button>
      
      <button 
        className={`flex ${isMobileSheet ? 'flex-row justify-start px-6 py-4 border-b border-border/50' : 'flex-col'} items-center gap-${isMobileSheet ? '4' : '1'} p-2 hover:bg-sidebar-accent transition-colors w-full group relative`}
        onClick={() => setShowBooster(true)}
      >
        {!isMobileSheet && (
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-md blur-md opacity-60 group-hover:opacity-80 animate-pulse transition-opacity" />
            <Zap 
              className="w-7 h-7 relative z-10 fill-yellow-300 text-yellow-500 group-hover:scale-125 transition-all duration-500" 
              style={{
                filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.9)) drop-shadow(0 0 4px rgba(250, 204, 21, 1))',
              }}
            />
          </div>
        )}
        {isMobileSheet && <Zap className="w-5 h-5 text-yellow-500" />}
        <span className={`${isMobileSheet ? 'text-sm' : 'text-[10px]'} text-sidebar-foreground font-medium`}>Booster</span>
      </button>
      
      <button 
        className={`flex ${isMobileSheet ? 'flex-row justify-start px-6 py-4 border-b border-border/50' : 'flex-col'} items-center gap-${isMobileSheet ? '4' : '1'} p-2 hover:bg-sidebar-accent transition-colors w-full`}
        onClick={() => setShowRanking(true)}
      >
        <Trophy className={`${isMobileSheet ? 'w-5 h-5' : 'w-6 h-6'} text-primary fill-primary`} />
        <span className={`${isMobileSheet ? 'text-sm' : 'text-[10px]'} text-sidebar-foreground font-medium`}>Ranking</span>
      </button>
      
      <button 
        className={`flex ${isMobileSheet ? 'flex-row justify-start px-6 py-4 border-b border-border/50' : 'flex-col'} items-center gap-${isMobileSheet ? '4' : '1'} p-2 hover:bg-sidebar-accent transition-colors w-full`}
        onClick={() => setShowSupportDialog(true)}
      >
        <HelpCircle className={`${isMobileSheet ? 'w-5 h-5' : 'w-6 h-6'} text-sidebar-foreground`} />
        <span className={`${isMobileSheet ? 'text-sm' : 'text-[10px]'} text-sidebar-foreground font-medium`}>Ajuda</span>
      </button>
      
      <button 
        className={`flex ${isMobileSheet ? 'flex-row justify-start px-6 py-4 border-b border-border/50' : 'flex-col'} items-center gap-${isMobileSheet ? '4' : '1'} p-2 hover:bg-sidebar-accent transition-colors w-full`}
        onClick={() => navigate("/profile")}
      >
        <User className={`${isMobileSheet ? 'w-5 h-5' : 'w-6 h-6'} text-sidebar-foreground`} />
        <span className={`${isMobileSheet ? 'text-sm' : 'text-[10px]'} text-sidebar-foreground font-medium`}>Perfil</span>
      </button>
      
      <button 
        className={`flex ${isMobileSheet ? 'flex-row justify-start px-6 py-4 border-b border-border/50' : 'flex-col'} items-center gap-${isMobileSheet ? '4' : '1'} p-2 hover:bg-sidebar-accent transition-colors w-full`}
        onClick={() => setShowPromotions(true)}
      >
        <Gift className={`${isMobileSheet ? 'w-5 h-5' : 'w-6 h-6'} text-sidebar-foreground`} />
        <span className={`${isMobileSheet ? 'text-sm' : 'text-[10px]'} text-sidebar-foreground font-medium`}>Promoção</span>
      </button>
      
      <button 
        className={`flex ${isMobileSheet ? 'flex-row justify-start px-6 py-4 border-b border-border/50' : 'flex-col'} items-center gap-${isMobileSheet ? '4' : '1'} p-2 hover:bg-sidebar-accent transition-colors w-full`}
        onClick={() => setShowSettings(true)}
      >
        <Settings className={`${isMobileSheet ? 'w-5 h-5' : 'w-6 h-6'} text-sidebar-foreground`} />
        <span className={`${isMobileSheet ? 'text-sm' : 'text-[10px]'} text-sidebar-foreground font-medium`}>Configurações</span>
      </button>
      
      <button 
        className={`flex ${isMobileSheet ? 'flex-row justify-start px-6 py-4 border-b border-border/50' : 'flex-col'} items-center gap-${isMobileSheet ? '4' : '1'} p-2 hover:bg-sidebar-accent transition-colors w-full`}
        onClick={() => setShowAnalytics(true)}
      >
        <BarChart3 className={`${isMobileSheet ? 'w-5 h-5' : 'w-6 h-6'} text-sidebar-foreground`} />
        <span className={`${isMobileSheet ? 'text-sm' : 'text-[10px]'} text-sidebar-foreground font-medium`}>Analytics</span>
      </button>
      
      <button 
        className={`flex ${isMobileSheet ? 'flex-row justify-start px-6 py-4 border-b border-border/50' : 'flex-col'} items-center gap-${isMobileSheet ? '4' : '1'} p-2 hover:bg-sidebar-accent transition-colors w-full`}
        onClick={() => setShowLegal(true)}
      >
        <MoreHorizontal className={`${isMobileSheet ? 'w-5 h-5' : 'w-6 h-6'} text-sidebar-foreground`} />
        <span className={`${isMobileSheet ? 'text-sm' : 'text-[10px]'} text-sidebar-foreground font-medium`}>Legal</span>
      </button>
    </aside>

    <SupportDialog open={showSupportDialog} onOpenChange={setShowSupportDialog} />
    <TradingHistory open={showHistory} onOpenChange={setShowHistory} />
    <BoosterMenu open={showBooster} onOpenChange={setShowBooster} />
    <RankingLeaderboard open={showRanking} onOpenChange={setShowRanking} />
    <PromotionsMenu open={showPromotions} onOpenChange={setShowPromotions} />
    <SettingsMenu open={showSettings} onOpenChange={setShowSettings} />
    <LegalMenu open={showLegal} onOpenChange={setShowLegal} />
    
    {/* Analytics Sheet */}
    <Sheet open={showAnalytics} onOpenChange={setShowAnalytics}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] xl:max-w-[800px] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold">Analytics Dashboard</h2>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                  Monitore sua performance em tempo real
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAnalytics(false)}
              className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-destructive/10"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-3 sm:p-4 md:p-6">
              {showAnalytics && <TradeAnalyticsDashboard userId={userId} isDemoMode={isDemoMode} />}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
};
