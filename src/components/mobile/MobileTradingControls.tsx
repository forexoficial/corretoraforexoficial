import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Minus, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useOpenTrades } from "@/hooks/useOpenTrades";

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
  const { playSound } = useSoundEffects();
  
  const [userId, setUserId] = useState<string>();
  const { hasOpenTrade } = useOpenTrades(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);
  
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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    // Verificar se já tem operação aberta
    if (hasOpenTrade) {
      toast.error("Você já tem uma operação em aberto. Aguarde o fechamento para abrir outra.");
      return;
    }

    if (amount > currentBalance) {
      toast.error(`Saldo insuficiente: R$ ${currentBalance.toFixed(2)}`);
      return;
    }

    // CRITICAL: ALWAYS use the current visual price from the chart
    // This is the price the user sees when placing the trade
    const entryPrice = currentPrice;
    
    // Validate that we have a valid current price
    if (!entryPrice || entryPrice <= 0) {
      console.error("[MobileTrade] Invalid currentPrice:", entryPrice);
      toast.error("Aguarde o carregamento do gráfico antes de operar");
      return;
    }
    
    console.log(`[MobileTrade] Creating ${type} trade at entry price: ${entryPrice}`);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + duration);

    const { data: newTrade, error } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        asset_id: selectedAsset.id,
        trade_type: type,
        amount: amount,
        payout: parseFloat(totalPayout),
        duration_minutes: duration,
        expires_at: expiresAt.toISOString(),
        is_demo: isDemoMode,
        entry_price: entryPrice,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar operação");
      return;
    }

    const balanceField = isDemoMode ? 'demo_balance' : 'balance';
    const newBalance = currentBalance - amount;

    await supabase
      .from('profiles')
      .update({ [balanceField]: newBalance })
      .eq('user_id', user.id);

    // Play trade open sound
    playSound('trade-open');

    // Dispatch event to notify chart
    window.dispatchEvent(new CustomEvent('trade-created', {
      detail: {
        assetId: selectedAsset.id,
        userId: user.id,
        trade: newTrade
      }
    }));

    toast.success(`Operação ${type === 'call' ? 'Comprar' : 'Vender'} criada!`);
  };

  return (
    <div className="bg-background border-t border-border pb-6">
      {/* Time & Value Controls */}
      <div className="grid grid-cols-2 gap-3 p-3">
        {/* Time Control */}
        <div className="bg-muted/30 rounded-lg px-3 py-2">
          <div className="text-[10px] text-muted-foreground uppercase mb-1 text-center">
            Hora
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
            Valor
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
            <div className="text-lg font-bold">R${amount}</div>
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
          <span className="text-muted-foreground">Receita </span>
          <span className="text-success font-bold">+{selectedAsset.payout_percentage}%</span>
          <span className="ml-2 text-lg font-bold">
            R$ {parseFloat(payout).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Warning Message */}
      {hasOpenTrade && (
        <div className="px-3 pb-2">
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-2 text-xs text-warning text-center">
            Você já tem uma operação aberta
          </div>
        </div>
      )}

      {/* Trade Buttons */}
      <div className="grid grid-cols-2 gap-3 p-3 pt-0">
        <Button
          className="bg-success hover:bg-success/90 h-14 text-lg font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleTrade('call')}
          disabled={hasOpenTrade}
          disableSound
        >
          <ArrowUp className="w-6 h-6" />
        </Button>
        <Button
          variant="destructive"
          className="h-14 text-lg font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => handleTrade('put')}
          disabled={hasOpenTrade}
          disableSound
        >
          <ArrowDown className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
