import { useEffect, useState, useCallback } from 'react';
import { TradeService } from '../services/tradeService';
import type { Trade, TradeFilters } from '../types/trade.types';

export const useTradeHistory = (
  userId: string | undefined,
  filters: TradeFilters = {}
) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrades = useCallback(async () => {
    if (!userId) {
      setTrades([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await TradeService.getTrades(filters);
    
    if (!error) {
      setTrades(data);
    }
    
    setIsLoading(false);
  }, [userId, filters.status, filters.limit, filters.includeRecent]);

  useEffect(() => {
    loadTrades();

    if (!userId) return;

    // Subscrever a mudanças
    const unsubscribe = TradeService.subscribeToTrades(userId, () => {
      console.log('[useTradeHistory] Atualizando histórico...');
      loadTrades();
    });

    // Escutar evento customizado
    const handleTradeCreated = () => {
      loadTrades();
    };

    window.addEventListener('trade-created', handleTradeCreated);

    return () => {
      unsubscribe();
      window.removeEventListener('trade-created', handleTradeCreated);
    };
  }, [userId, loadTrades]);

  return {
    trades,
    isLoading,
    refresh: loadTrades,
  };
};
