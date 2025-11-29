import { useState } from 'react';
import { toast } from 'sonner';
import { TradeService } from '../services/tradeService';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import type { Asset } from '../types/trade.types';

interface UseCreateTradeProps {
  selectedAsset: Asset;
  currentPrice: number;
  isDemoMode: boolean;
  currentBalance: number;
  hasOpenTrade: boolean;
}

export const useCreateTrade = ({
  selectedAsset,
  currentPrice,
  isDemoMode,
  currentBalance,
  hasOpenTrade,
}: UseCreateTradeProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const { playSound } = useSoundEffects();

  const createTrade = async (
    type: 'call' | 'put',
    amount: number,
    duration: number
  ): Promise<boolean> => {
    // Validações
    if (hasOpenTrade) {
      toast.error("Você já tem uma operação em aberto. Aguarde o fechamento para abrir outra.");
      return false;
    }

    if (amount > currentBalance) {
      toast.error(
        `Saldo insuficiente. Seu saldo ${isDemoMode ? 'demo' : 'real'}: R$ ${currentBalance.toFixed(2)}`
      );
      return false;
    }

    if (!currentPrice || currentPrice <= 0) {
      toast.error("Preço de entrada inválido. Aguarde a atualização do gráfico.");
      return false;
    }

    setIsCreating(true);

    try {
      // Calcular payout (apenas o LUCRO)
      const payout = amount * (selectedAsset.payout_percentage / 100);

      console.log(`[useCreateTrade] Criando trade: type=${type}, amount=${amount}, payout=${payout}, price=${currentPrice}`);

      const { data, error } = await TradeService.createTrade({
        asset_id: selectedAsset.id,
        trade_type: type,
        amount,
        payout,
        duration_minutes: duration,
        entry_price: currentPrice,
        is_demo: isDemoMode,
      });

      if (error) {
        console.error("[useCreateTrade] Erro ao criar trade:", error);
        toast.error("Erro ao criar operação: " + error.message);
        return false;
      }

      // Som e notificação de sucesso
      playSound('trade-open');
      toast.success(`Operação ${type === 'call' ? 'Comprar' : 'Vender'} criada com sucesso!`);

      console.log(`[useCreateTrade] Trade criada - ID: ${data?.id}, Modo: ${isDemoMode ? 'DEMO' : 'REAL'}`);
      
      return true;
    } catch (error) {
      console.error("[useCreateTrade] Erro inesperado:", error);
      toast.error("Erro ao criar operação");
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createTrade,
    isCreating,
  };
};
