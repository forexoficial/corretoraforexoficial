import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TradeService } from '../services/tradeService';
import type { Trade } from '../types/trade.types';

export const useActiveTrade = (userId: string | undefined) => {
  const [activeTrade, setActiveTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadActiveTrade = useCallback(async () => {
    if (!userId) {
      setActiveTrade(null);
      setIsLoading(false);
      return;
    }

    const { data } = await TradeService.getOpenTrade();
    setActiveTrade(data);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    loadActiveTrade();

    if (!userId) return;

    // Subscrever a mudanças via Realtime
    const unsubscribe = TradeService.subscribeToTrades(userId, (payload) => {
      console.log('[useActiveTrade] Realtime update:', payload);
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const trade = payload.new as Trade;
        
        if (trade.status === 'open') {
          setActiveTrade(trade);
        } else if (activeTrade && trade.id === activeTrade.id) {
          // Trade fechou
          setActiveTrade(null);
        }
      } else if (payload.eventType === 'DELETE') {
        setActiveTrade(null);
      }
    });

    // Escutar evento customizado de criação de trade
    const handleTradeCreated = () => {
      console.log('[useActiveTrade] Trade criado, recarregando...');
      loadActiveTrade();
    };

    window.addEventListener('trade-created', handleTradeCreated);

    return () => {
      unsubscribe();
      window.removeEventListener('trade-created', handleTradeCreated);
    };
  }, [userId, activeTrade, loadActiveTrade]);

  return {
    activeTrade,
    hasOpenTrade: !!activeTrade,
    isLoading,
    refresh: loadActiveTrade,
  };
};
