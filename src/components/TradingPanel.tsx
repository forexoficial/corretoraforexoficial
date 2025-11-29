import { useState } from "react";
import { BoosterMenu } from "@/components/BoosterMenu";
import { TradeControls } from "@/features/trading/components/TradeControls";
import { TradeHistoryList } from "@/features/trading/components/TradeHistoryList";

interface TradingPanelProps {
  selectedAsset: {
    id: string;
    name: string;
    symbol: string;
    icon_url: string;
    payout_percentage: number;
  };
  isDemoMode: boolean;
  currentBalance: number;
  currentPrice: number;
}

export const TradingPanel = ({ selectedAsset, isDemoMode, currentBalance, currentPrice }: TradingPanelProps) => {
  const [showBoosterMenu, setShowBoosterMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <>
      <TradeControls
        selectedAsset={selectedAsset}
        currentPrice={currentPrice}
        isDemoMode={isDemoMode}
        currentBalance={currentBalance}
        onShowBoosterMenu={() => setShowBoosterMenu(true)}
        onShowHistory={() => setShowHistory(true)}
      />

      <BoosterMenu 
        open={showBoosterMenu} 
        onOpenChange={setShowBoosterMenu}
      />

      <TradeHistoryList 
        open={showHistory} 
        onOpenChange={setShowHistory}
      />
    </>
  );
};
