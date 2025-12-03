import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useCreateTrade } from "@/features/trading/hooks/useCreateTrade";
import { useTradeContext } from "@/features/trading/context/TradeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useCurrency } from "@/hooks/useCurrency";

interface MobileTradingControlsProps {
  selectedAsset: {
    id: string;
    name: string;
    symbol: string;
    icon_url: string;
    payout_percentage: number;
  };
  isDemoMode: boolean;
  currentBalance: number;
  currentPrice?: number;
}

export function MobileTradingControls({ 
  selectedAsset, 
  isDemoMode, 
  currentBalance,
  currentPrice
}: MobileTradingControlsProps) {
  const { settings } = usePlatformSettings();
  const { hasOpenTrade } = useTradeContext();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  
  const { createTrade, isCreating } = useCreateTrade({
    selectedAsset,
    currentPrice: currentPrice || 0,
    isDemoMode,
    currentBalance,
    hasOpenTrade,
  });
  
  // Garantir que na primeira vez em mobile, o padrão seja 1 minuto
  const getInitialDuration = () => {
    const saved = localStorage.getItem('mobile-trade-duration');
    if (saved) {
      return parseFloat(saved);
    }
    // Primeira vez: sempre 1 minuto em mobile
    return 1;
  };
  
  const [duration, setDuration] = useState(getInitialDuration());
  const [amount, setAmount] = useState(5);

  // Durations: 10s, 30s, 1m, 5m, 10m, 15m, 30m, 60m (in minutes)
  const durations = [10/60, 30/60, 1, 5, 10, 15, 30, 60];
  const payout = (amount * (selectedAsset.payout_percentage / 100)).toFixed(2);
  const totalPayout = (amount + parseFloat(payout)).toFixed(2);

  const handleAmountChange = (increment: number) => {
    setAmount((prev) => Math.max(settings.min_trade, Math.min(10000, prev + increment)));
  };

  const handleDurationChange = (increment: number) => {
    const currentIndex = durations.indexOf(duration);
    const newIndex = Math.max(0, Math.min(durations.length - 1, currentIndex + increment));
    const newDuration = durations[newIndex];
    setDuration(newDuration);
    // Salvar preferência do usuário
    localStorage.setItem('mobile-trade-duration', newDuration.toString());
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    }
    return `${minutes}:00`;
  };

  const handleTrade = async (type: 'call' | 'put') => {
    await createTrade(type, amount, duration);
  };

  return (
    <div className="bg-background border-t border-border pb-6">
      {/* Time & Value Controls */}
      <div className="grid grid-cols-2 gap-3 p-3">
        {/* Time Control */}
        <div className="bg-muted/30 rounded-lg px-3 py-2">
          <div className="text-[10px] text-muted-foreground uppercase mb-1 text-center">
            {t("time", "Tempo")}
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDurationChange(-1)}
              className="h-7 w-7"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <div className="text-lg font-bold">{formatDuration(duration)}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDurationChange(1)}
              className="h-7 w-7"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Amount Control */}
        <div className="bg-muted/30 rounded-lg px-3 py-2">
          <div className="text-[10px] text-muted-foreground uppercase mb-1 text-center">
            {t("amount", "Valor")}
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleAmountChange(-1)}
              className="h-7 w-7"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <div className="text-lg font-bold">{formatCurrency(amount)}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleAmountChange(1)}
              className="h-7 w-7"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Payout Display */}
      <div className="px-3 pb-3">
        <div className="text-center text-sm">
          <span className="text-muted-foreground">{t("profit", "Lucro")} </span>
          <span className="text-success font-bold">+{selectedAsset.payout_percentage}%</span>
          <span className="ml-2 text-lg font-bold">
            {formatCurrency(parseFloat(payout))}
          </span>
        </div>
      </div>

      {/* Warning Message */}
      {hasOpenTrade && (
        <div className="px-3 pb-2">
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-2 text-xs text-warning text-center">
            {t("has_open_trade", "Você já tem uma operação aberta")}
          </div>
        </div>
      )}

      {/* Trade Buttons */}
      <div className="grid grid-cols-2 gap-3 p-3 pt-0">
        <Button
          className="bg-success hover:bg-success/90 h-14 text-lg font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleTrade('call')}
          disabled={hasOpenTrade || isCreating}
          disableSound
        >
          <ArrowUp className="w-6 h-6" />
        </Button>
        <Button
          variant="destructive"
          className="h-14 text-lg font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleTrade('put')}
            disabled={hasOpenTrade || isCreating}
          disableSound
        >
          <ArrowDown className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
