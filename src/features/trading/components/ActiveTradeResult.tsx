import { useState, useEffect } from "react";
import { useTradeContext } from "../context/TradeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrency } from "@/hooks/useCurrency";
import { TrendingUp, TrendingDown } from "lucide-react";

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
  // O payout armazenado no trade já é o valor do LUCRO em reais, não a porcentagem
  const potentialProfit = activeTrade.payout;
  const potentialReturn = tradeAmount + potentialProfit;
  const payoutPercentage = (potentialProfit / tradeAmount) * 100;

  // Calculate P&L based on current price vs entry price
  const priceDiff = currentPrice - entryPrice;
  const isCall = activeTrade.trade_type === 'call';
  const isWinning = isCall ? priceDiff > 0 : priceDiff < 0;

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Header compacto */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("active_result", "Resultado")}
        </span>
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
          isCall 
            ? 'bg-success/20 text-success' 
            : 'bg-destructive/20 text-destructive'
        }`}>
          {isCall ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {isCall ? 'CALL' : 'PUT'}
        </div>
      </div>

      {/* P&L + Timer em linha */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 rounded px-2 py-1.5 bg-success/10 border border-success/30">
          <div className="text-[8px] text-muted-foreground uppercase">P&L</div>
          <div className="text-sm font-bold text-success leading-tight">
            +{formatCurrency(potentialProfit)}
          </div>
        </div>
        <div className="flex-1 rounded px-2 py-1.5 bg-muted/30 border border-border/50">
          <div className="text-[8px] text-muted-foreground uppercase">Tempo</div>
          <div className={`text-sm font-bold font-mono leading-tight ${
            timeRemaining < 10000 ? 'text-destructive animate-pulse' : 'text-foreground'
          }`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
      </div>

      {/* Grid compacto de infos */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("entry", "Entrada")}</span>
          <span className="font-medium">${entryPrice.toFixed(5)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("current", "Atual")}</span>
          <span className={`font-medium ${isWinning ? 'text-success' : 'text-destructive'}`}>
            ${currentPrice.toFixed(5)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("invested", "Investido")}</span>
          <span className="font-medium">{formatCurrency(tradeAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("return", "Retorno")}</span>
          <span className="font-bold text-success">{formatCurrency(potentialReturn)}</span>
        </div>
      </div>
    </div>
  );
};
