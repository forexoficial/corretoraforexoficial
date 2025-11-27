import { useState, useEffect } from "react";
import { MobileTradingHeader } from "./MobileTradingHeader";
import { MobileChartView } from "./MobileChartView";
import { MobileTradingControls } from "./MobileTradingControls";
import PlatformPopup from "@/components/PlatformPopup";
import { VictoryCelebration } from "@/components/VictoryCelebration";
import { TradeResultPopup } from "@/components/TradeResultPopup";
import { supabase } from "@/integrations/supabase/client";

interface Asset {
  id: string;
  name: string;
  symbol: string;
  icon_url: string;
  payout_percentage: number;
}

interface MobileTradingViewProps {
  selectedAsset: Asset;
  isDemoMode: boolean;
  currentBalance: number;
  onAssetChange?: (asset: Asset) => void;
}

export function MobileTradingView({ 
  selectedAsset: initialAsset, 
  isDemoMode, 
  currentBalance,
  onAssetChange
}: MobileTradingViewProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset>(initialAsset);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [showVictoryCelebration, setShowVictoryCelebration] = useState(false);
  const [victoryData, setVictoryData] = useState<{ amount: number; profit: number }>({ amount: 0, profit: 0 });
  const [finishedTrade, setFinishedTrade] = useState<{
    id: string;
    status: 'won' | 'lost';
    result: number;
    amount: number;
    asset_name?: string;
  } | null>(null);

  // Update local state when prop changes
  useEffect(() => {
    if (initialAsset && initialAsset.id !== selectedAsset.id) {
      setSelectedAsset(initialAsset);
    }
  }, [initialAsset]);

  // Monitor trade status changes
  useEffect(() => {
    const getUserAndSubscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Track already processed trades to avoid duplicates
      const processedTrades = new Set<string>();

      const channel = supabase
        .channel('mobile-trade-status-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'trades',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            const trade = payload.new as any;
            
            console.log('[MobileTradingView] 📡 Trade update recebido:', {
              id: trade.id,
              status: trade.status,
              old_status: payload.old?.status,
              result: trade.result,
              closed_at: trade.closed_at
            });
            
            // Check if trade was just closed (won or lost)
            // Use closed_at as reliable indicator that trade was finalized
            const isTradeJustClosed = 
              (trade.status === 'won' || trade.status === 'lost') && 
              trade.closed_at && 
              !processedTrades.has(trade.id);
            
            if (isTradeJustClosed) {
              console.log('[MobileTradingView] 🎉 Trade FINALIZADA detectada!', {
                id: trade.id,
                status: trade.status,
                result: trade.result,
                amount: trade.amount
              });

              // Mark as processed to avoid duplicates
              processedTrades.add(trade.id);

              // Force refresh balance
              console.log('[MobileTradingView] 🔄 Atualizando saldo...');
              const { data: profile } = await supabase
                .from('profiles')
                .select('balance, demo_balance, is_demo_mode')
                .eq('user_id', user.id)
                .single();

              if (profile) {
                console.log('[MobileTradingView] ✅ Saldos obtidos:', {
                  demo: profile.demo_balance,
                  real: profile.balance
                });
                
                // Force balance update
                window.dispatchEvent(new CustomEvent('force-balance-refresh', {
                  detail: {
                    balance: profile.balance,
                    demo_balance: profile.demo_balance,
                    is_demo_mode: profile.is_demo_mode
                  }
                }));
              }
              
              // Get asset name
              const { data: asset } = await supabase
                .from('assets')
                .select('name')
                .eq('id', trade.asset_id)
                .single();

              console.log('[MobileTradingView] 🎯 Exibindo popup de resultado...');
              
              // Show result popup
              setFinishedTrade({
                id: trade.id,
                status: trade.status,
                result: trade.result,
                amount: trade.amount,
                asset_name: asset?.name
              });
              
              // Also show victory celebration if won
              if (trade.status === 'won') {
                const profit = trade.result || 0;
                console.log('[MobileTradingView] 🏆 Exibindo celebração de vitória!');
                setVictoryData({
                  amount: trade.amount,
                  profit: profit
                });
                setShowVictoryCelebration(true);
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    getUserAndSubscribe();
  }, []);

  const handleAssetChange = (asset: Asset) => {
    setSelectedAsset(asset);
    onAssetChange?.(asset);
  };

  const handlePriceUpdate = (price: number) => {
    setCurrentPrice(price);
  };

  return (
    <>
      <PlatformPopup />
      <div className="flex flex-col h-screen bg-background">
        <MobileTradingHeader selectedAsset={selectedAsset} />
        <MobileChartView 
          selectedAsset={selectedAsset} 
          onAssetChange={handleAssetChange}
          onCurrentPriceUpdate={handlePriceUpdate}
        />
        <MobileTradingControls
          selectedAsset={selectedAsset}
          isDemoMode={isDemoMode}
          currentBalance={currentBalance}
          currentPrice={currentPrice}
        />
      </div>

      {/* Trade Result Popup */}
      <TradeResultPopup
        trade={finishedTrade}
        onClose={() => setFinishedTrade(null)}
      />

      {/* Victory Celebration */}
      <VictoryCelebration
        show={showVictoryCelebration}
        amount={victoryData.amount}
        profit={victoryData.profit}
        onComplete={() => setShowVictoryCelebration(false)}
      />
    </>
  );
}
