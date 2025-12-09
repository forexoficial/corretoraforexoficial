import { useState, useEffect } from "react";
import { useTradeContext } from "../context/TradeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrency } from "@/hooks/useCurrency";
import { TrendingUp, TrendingDown, Clock, DollarSign, Target, ArrowUpDown } from "lucide-react";

interface ActiveTradeResultProps {
  currentPrice: number;
}

export const ActiveTradeResult = ({ currentPrice }: ActiveTradeResultProps) => {
  const { activeTrade, hasOpenTrade } = useTradeContext();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!activeTrade) return;

    const updateTimer = () => {
      const now = Date.now();
      const expiresAt = new Date(activeTrade.expires_at).getTime();
      const remaining = Math.max(0, expiresAt - now);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [activeTrade]);

  if (!hasOpenTrade || !activeTrade) {
    return null;
  }

  const entryPrice = activeTrade.entry_price || 0;
  const tradeAmount = activeTrade.amount;
  const payoutPercentage = activeTrade.payout;
  const potentialReturn = tradeAmount + (tradeAmount * (payoutPercentage / 100));
  const potentialProfit = tradeAmount * (payoutPercentage / 100);

  // Calculate P&L based on current price vs entry price
  const priceDiff = currentPrice - entryPrice;
  const isCall = activeTrade.trade_type === 'call';
  const isWinning = isCall ? priceDiff > 0 : priceDiff < 0;
  
  // P&L calculation: if winning, show potential profit, if losing show -amount
  const currentPnL = isWinning ? potentialProfit : -tradeAmount;
  const pnlPercentage = isWinning ? payoutPercentage : -100;

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("active_result", "Resultado")}
        </span>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          isCall 
            ? 'bg-success/20 text-success' 
            : 'bg-destructive/20 text-destructive'
        }`}>
          {isCall ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isCall ? 'CALL' : 'PUT'}
        </div>
      </div>

      {/* P&L Card - Shows Potential Return */}
      <div className="rounded-lg p-3 mb-3 bg-success/10 border border-success/30">
        <div className="text-[10px] text-muted-foreground uppercase mb-1">
          {t("current_pnl", "P&L Atual")}
        </div>
        <div className="text-xl font-bold text-success">
          +{formatCurrency(potentialProfit)}
        </div>
        <div className="text-xs text-success/70">
          +{payoutPercentage.toFixed(0)}%
        </div>
      </div>

      {/* Time Remaining */}
      <div className="flex items-center justify-between py-2 border-b border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {t("time_remaining", "Tempo Restante")}
        </div>
        <div className={`text-sm font-bold font-mono ${
          timeRemaining < 10000 ? 'text-destructive animate-pulse' : 'text-foreground'
        }`}>
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Entry Price */}
      <div className="flex items-center justify-between py-2 border-b border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowUpDown className="w-3.5 h-3.5" />
          {t("entry_price", "Preço Entrada")}
        </div>
        <div className="text-sm font-medium text-foreground">
          ${entryPrice.toFixed(2)}
        </div>
      </div>

      {/* Current Price */}
      <div className="flex items-center justify-between py-2 border-b border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Target className="w-3.5 h-3.5" />
          {t("current_price", "Preço Atual")}
        </div>
        <div className={`text-sm font-medium ${
          isWinning ? 'text-success' : 'text-destructive'
        }`}>
          ${currentPrice.toFixed(2)}
        </div>
      </div>

      {/* Investment Amount */}
      <div className="flex items-center justify-between py-2 border-b border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <DollarSign className="w-3.5 h-3.5" />
          {t("invested", "Investido")}
        </div>
        <div className="text-sm font-medium text-foreground">
          {formatCurrency(tradeAmount)}
        </div>
      </div>

      {/* Potential Return */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5" />
          {t("potential_return", "Retorno Potencial")}
        </div>
        <div className="text-sm font-bold text-success">
          {formatCurrency(potentialReturn)}
        </div>
      </div>
    </div>
  );
};
