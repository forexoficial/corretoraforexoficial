import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUp, ArrowDown, Minus, Plus, Zap, History, Banknote } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useNavigate } from "react-router-dom";
import { BoosterMenu } from "@/components/BoosterMenu";
import { TradingHistory } from "@/components/TradingHistory";

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
  const { settings } = usePlatformSettings();
  const { playSound } = useSoundEffects();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(10);
  const [duration, setDuration] = useState<number>(1);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState<string>("10.00");
  const inputRef = useRef<HTMLInputElement>(null);
  const [showBoosterMenu, setShowBoosterMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (isEditingAmount && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingAmount]);

  const durations = [1, 5, 10, 15, 30, 60];
  const payout = (amount * (selectedAsset.payout_percentage / 100)).toFixed(2);
  const totalPayout = (amount + parseFloat(payout)).toFixed(2);

  // Função para formatar valores com K e M
  const formatAmount = (value: number): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (value >= 100000) {
      return (value / 1000).toFixed(0) + 'k';
    }
    if (value >= 1000) {
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toFixed(2);
  };

  const handleAmountChange = (increment: number) => {
    setAmount((prev) => Math.max(settings.min_trade, prev + increment));
  };

  const handleAmountClick = () => {
    setTempAmount(amount.toFixed(2));
    setIsEditingAmount(true);
  };

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d.]/g, '');
    setTempAmount(value);
  };

  const handleAmountInputBlur = () => {
    const parsedAmount = parseFloat(tempAmount);
    if (!isNaN(parsedAmount) && parsedAmount >= settings.min_trade && parsedAmount <= 10000) {
      setAmount(parsedAmount);
    } else if (parsedAmount < settings.min_trade) {
      setAmount(settings.min_trade);
      toast.error(`Valor mínimo é R$ ${settings.min_trade.toFixed(2)}`);
    } else if (parsedAmount > 10000) {
      setAmount(10000);
      toast.error("Valor máximo é R$ 10.000,00");
    }
    setIsEditingAmount(false);
  };

  const handleAmountInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAmountInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditingAmount(false);
    }
  };

  const handleTrade = async (type: 'call' | 'put') => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Você precisa estar logado para fazer operações");
      return;
    }

    // Verificar se tem saldo suficiente
    if (amount > currentBalance) {
      toast.error(`Saldo insuficiente. Seu saldo ${isDemoMode ? 'demo' : 'real'}: R$ ${currentBalance.toFixed(2)}`);
      return;
    }

    // Use o preço atual do gráfico ao invés de buscar do banco
    const entryPrice = currentPrice;
    
    // Validar entry_price
    if (!entryPrice || entryPrice <= 0) {
      console.error("Entry price inválido:", entryPrice);
      toast.error("Preço de entrada inválido. Aguarde a atualização do gráfico.");
      return;
    }
    
    console.log(`[TradingPanel] Usando preço atual do gráfico: ${entryPrice}`);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + duration);

    const payoutAmount = parseFloat(totalPayout);

    console.log(`[TradingPanel] Criando trade: type=${type}, amount=${amount}, entryPrice=${entryPrice}, expires=${expiresAt.toISOString()}`);

    const { error } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        asset_id: selectedAsset.id,
        trade_type: type,
        amount: amount,
        payout: payoutAmount,
        duration_minutes: duration,
        expires_at: expiresAt.toISOString(),
        is_demo: isDemoMode,
        entry_price: entryPrice,
        status: 'open',
      });

    if (error) {
      console.error("Erro ao criar trade:", error);
      toast.error("Erro ao criar operação: " + error.message);
      return;
    }

    // Atualizar saldo (demo ou real)
    const balanceField = isDemoMode ? 'demo_balance' : 'balance';
    const newBalance = currentBalance - amount;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ [balanceField]: newBalance })
      .eq('user_id', user.id);

    if (updateError) {
      console.error("Erro ao atualizar saldo:", updateError);
      toast.error("Operação criada, mas houve erro ao atualizar saldo");
    } else {
      // Play trade open sound
      playSound('trade-open');
      
      console.log(`[TradingPanel] Trade criada - Modo: ${isDemoMode ? 'DEMO' : 'REAL'}, Saldo atualizado: ${newBalance}`);
      toast.success(`Operação ${type === 'call' ? 'Comprar' : 'Vender'} criada com sucesso!`);
      
      // Force reload of active trades via custom event
      // Balance will be updated automatically via Supabase real-time subscription
      window.dispatchEvent(new CustomEvent('trade-created', { 
        detail: { assetId: selectedAsset.id, userId: user.id }
      }));
    }
  };

  return (
    <div className="w-64 bg-[hsl(var(--panel-bg))] border-l border-border p-4 space-y-4">
      {/* Asset Info */}
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <img src={selectedAsset.icon_url} alt={selectedAsset.name} className="w-6 h-6" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{selectedAsset.name}</div>
          <div className="text-xs text-muted-foreground">{selectedAsset.payout_percentage}%</div>
        </div>
      </div>

      {/* Duration */}
      <div className="relative border border-border rounded-lg p-1.5 pt-3">
        <span className="absolute -top-2 left-3 px-1.5 bg-[hsl(var(--panel-bg))] text-[9px] text-muted-foreground uppercase">
          Tempo
        </span>
        <div className="flex items-center justify-center gap-2.5 mb-0.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const currentIndex = durations.indexOf(duration);
              if (currentIndex > 0) setDuration(durations[currentIndex - 1]);
            }}
            className="h-6 w-6 rounded-full"
          >
            <Minus className="w-2.5 h-2.5" />
          </Button>
          <div className="text-lg font-bold w-12 text-center">{duration}M</div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const currentIndex = durations.indexOf(duration);
              if (currentIndex < durations.length - 1) setDuration(durations[currentIndex + 1]);
            }}
            className="h-6 w-6 rounded-full"
          >
            <Plus className="w-2.5 h-2.5" />
          </Button>
        </div>
        <div className="text-[9px] text-center text-green-500 uppercase font-semibold">
          Tempo de Comutação
        </div>
      </div>

      {/* Amount */}
      <div className="relative border border-border rounded-lg p-1.5 pt-3">
        <span className="absolute -top-2 left-3 px-1.5 bg-[hsl(var(--panel-bg))] text-[9px] text-muted-foreground uppercase">
          Investimento
        </span>
        <div className="flex items-center justify-center gap-2.5 mb-0.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleAmountChange(-1)}
            className="h-6 w-6 rounded-full"
          >
            <Minus className="w-2.5 h-2.5" />
          </Button>
          {isEditingAmount ? (
            <input
              ref={inputRef}
              type="text"
              value={tempAmount}
              onChange={handleAmountInputChange}
              onBlur={handleAmountInputBlur}
              onKeyDown={handleAmountInputKeyDown}
              className="text-lg font-bold w-20 text-center bg-transparent border-b border-primary focus:outline-none"
            />
          ) : (
            <div 
              className="flex items-baseline gap-1 cursor-text hover:text-primary transition-colors"
              onClick={handleAmountClick}
            >
              <span className="text-[10px] text-muted-foreground font-normal">R$</span>
              <span className="text-lg font-bold">
                {formatAmount(amount)}
              </span>
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleAmountChange(1)}
            className="h-6 w-6 rounded-full"
          >
            <Plus className="w-2.5 h-2.5" />
          </Button>
        </div>
        <div className="text-[9px] text-center text-green-500 uppercase font-semibold">
          Trocar
        </div>
      </div>

      {/* Payout Info */}
      <div className="relative overflow-hidden rounded-lg border border-success/30 bg-gradient-to-br from-success/10 via-success/5 to-transparent p-2.5 space-y-1.5">
        <div className="absolute top-0 right-0 w-16 h-16 bg-success/5 rounded-full blur-xl -translate-y-6 translate-x-6"></div>
        
        <div className="relative">
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
            Retorno Potencial
          </div>
          
          <div className="flex items-baseline gap-1.5 mb-1">
            <div className="text-lg font-bold text-success">
              R$ {parseFloat(totalPayout).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] font-semibold text-success/80 bg-success/10 px-1.5 py-0.5 rounded-full">
              +{selectedAsset.payout_percentage}%
            </div>
          </div>
          
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Lucro:</span>
            <span className="font-bold text-success">
              +R$ {parseFloat(payout).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-[10px] mt-0.5 pt-1 border-t border-success/20">
            <span className="text-muted-foreground">Investimento:</span>
            <span className="font-medium text-foreground/70">
              R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Trade Buttons */}
      <div className="flex flex-col gap-2">
        {/* Row 1: Buy and Sell */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-14 text-white font-bold text-base rounded-xl relative overflow-hidden
                       bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d]
                       hover:from-[#16a34a] hover:via-[#15803d] hover:to-[#166534]
                       shadow-[0_4px_0_0_#15803d,0_8px_12px_-2px_rgba(34,197,94,0.4)]
                       hover:shadow-[0_2px_0_0_#15803d,0_6px_12px_-2px_rgba(34,197,94,0.6)]
                       active:shadow-[0_0px_0_0_#15803d,0_2px_8px_-2px_rgba(34,197,94,0.4)]
                       border-t-2 border-[#4ade80] 
                       transition-all duration-150 active:translate-y-1
                       before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
            onClick={() => handleTrade('call')}
            disableSound
          >
            <span className="relative z-10">C Mercado</span>
          </Button>
          <Button
            className="h-14 text-white font-bold text-base rounded-xl relative overflow-hidden
                       bg-gradient-to-b from-[#ef4444] via-[#dc2626] to-[#b91c1c]
                       hover:from-[#dc2626] hover:via-[#b91c1c] hover:to-[#991b1b]
                       shadow-[0_4px_0_0_#b91c1c,0_8px_12px_-2px_rgba(239,68,68,0.4)]
                       hover:shadow-[0_2px_0_0_#b91c1c,0_6px_12px_-2px_rgba(239,68,68,0.6)]
                       active:shadow-[0_0px_0_0_#b91c1c,0_2px_8px_-2px_rgba(239,68,68,0.4)]
                       border-t-2 border-[#f87171]
                       transition-all duration-150 active:translate-y-1
                       before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
            onClick={() => handleTrade('put')}
            disableSound
          >
            <span className="relative z-10">V Mercado</span>
          </Button>
        </div>

        {/* Row 2: Booster and History */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="h-10 font-bold text-sm rounded-xl relative overflow-hidden
                       bg-gradient-to-b from-[#a8a29e] via-[#78716c] to-[#57534e]
                       hover:from-[#78716c] hover:via-[#57534e] hover:to-[#44403c]
                       text-white
                       shadow-[0_3px_0_0_#57534e,0_6px_10px_-2px_rgba(120,113,108,0.4)]
                       hover:shadow-[0_1px_0_0_#57534e,0_4px_10px_-2px_rgba(120,113,108,0.6)]
                       active:shadow-[0_0px_0_0_#57534e,0_2px_6px_-2px_rgba(120,113,108,0.4)]
                       border-t-2 border-[#d6d3d1]
                       transition-all duration-150 active:translate-y-1
                       before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
            onClick={() => setShowBoosterMenu(true)}
            disableSound
          >
            <span className="relative z-10">Booster</span>
          </Button>
          <Button
            variant="secondary"
            className="h-10 font-bold text-sm rounded-xl relative overflow-hidden
                       bg-gradient-to-b from-[#a8a29e] via-[#78716c] to-[#57534e]
                       hover:from-[#78716c] hover:via-[#57534e] hover:to-[#44403c]
                       text-white
                       shadow-[0_3px_0_0_#57534e,0_6px_10px_-2px_rgba(120,113,108,0.4)]
                       hover:shadow-[0_1px_0_0_#57534e,0_4px_10px_-2px_rgba(120,113,108,0.6)]
                       active:shadow-[0_0px_0_0_#57534e,0_2px_6px_-2px_rgba(120,113,108,0.4)]
                       border-t-2 border-[#d6d3d1]
                       transition-all duration-150 active:translate-y-1
                       before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
            onClick={() => setShowHistory(true)}
            disableSound
          >
            <span className="relative z-10">Histórico</span>
          </Button>
        </div>

        {/* Row 3: Withdrawal */}
        <Button
          className="h-10 w-full font-bold text-sm rounded-xl relative overflow-hidden
                     bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706]
                     hover:from-[#f59e0b] hover:via-[#d97706] hover:to-[#b45309]
                     text-black
                     shadow-[0_3px_0_0_#d97706,0_6px_10px_-2px_rgba(251,191,36,0.4)]
                     hover:shadow-[0_1px_0_0_#d97706,0_4px_10px_-2px_rgba(251,191,36,0.6)]
                     active:shadow-[0_0px_0_0_#d97706,0_2px_6px_-2px_rgba(251,191,36,0.4)]
                     border-t-2 border-[#fde047]
                     transition-all duration-150 active:translate-y-1
                     before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/30 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
          onClick={() => navigate('/withdrawal')}
          disableSound
        >
          <Banknote className="w-4 h-4 mr-2 relative z-10" />
          <span className="relative z-10">Retirada</span>
        </Button>
      </div>

      {/* Booster Menu */}
      <BoosterMenu 
        open={showBoosterMenu}
        onOpenChange={setShowBoosterMenu}
      />

      {/* Trading History */}
      <TradingHistory 
        open={showHistory}
        onOpenChange={setShowHistory}
      />

      {/* Clock */}
      <div className="text-center text-xs text-muted-foreground pt-3 border-t border-border">
        {new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (UTC-3)
      </div>
    </div>
  );
};
