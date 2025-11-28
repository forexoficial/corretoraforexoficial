import { useState, useEffect, useRef } from "react";
import { MobileTradingHeader } from "./MobileTradingHeader";
import { MobileChartView } from "./MobileChartView";
import { MobileTradingControls } from "./MobileTradingControls";
import PlatformPopup from "@/components/PlatformPopup";
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
  const [finishedTrade, setFinishedTrade] = useState<{
    id: string;
    status: 'won' | 'lost';
    result: number;
    amount: number;
    payout: number;
    asset_name?: string;
  } | null>(null);
  const processedTradesRef = useRef<Set<string>>(new Set());

  // Update local state when prop changes
  useEffect(() => {
    if (initialAsset && initialAsset.id !== selectedAsset.id) {
      setSelectedAsset(initialAsset);
    }
  }, [initialAsset]);

  // Monitor trade status changes
  useEffect(() => {
    let channel: any = null;
    let isActive = true;

    const getUserAndSubscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isActive) return;

      channel = supabase
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
            
            console.log('[MobileTradingView] 📡 Trade update:', {
              id: trade.id,
              status: trade.status,
              result: trade.result,
              closed_at: trade.closed_at
            });
            
            const isClosed = (trade.status === 'won' || trade.status === 'lost') && !!trade.closed_at;
            if (!isClosed) return;

            if (processedTradesRef.current.has(trade.id)) {
              console.log('[MobileTradingView] Trade já processado, ignorando:', trade.id);
              return;
            }

            processedTradesRef.current.add(trade.id);
            
            console.log('[MobileTradingView] 🎉 Trade FECHADO!', {
              status: trade.status,
              result: trade.result,
              amount: trade.amount,
              is_demo: trade.is_demo
            });

            // Force refresh balance
            console.log('[MobileTradingView] 🔄 Forçando refresh do saldo...');
            const { data: profile } = await supabase
              .from('profiles')
              .select('balance, demo_balance, is_demo_mode')
              .eq('user_id', user.id)
              .single();

            if (profile) {
              console.log('[MobileTradingView] ✅ Saldos atualizados:', {
                demo: profile.demo_balance,
                real: profile.balance
              });
              
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

            // Show result popup
            setFinishedTrade({
              id: trade.id,
              status: trade.status,
              result: trade.result,
              amount: trade.amount,
              payout: trade.payout,
              asset_name: asset?.name
            });
          }
        )
        .subscribe();
    };

    getUserAndSubscribe();

    return () => {
      isActive = false;
      if (channel) {
        console.log('[MobileTradingView] 🔌 Limpando canal realtime mobile-trade-status-changes');
        supabase.removeChannel(channel);
      }
    };
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
    </>
  );
}
