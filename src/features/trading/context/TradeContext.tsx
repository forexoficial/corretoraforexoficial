import React, { createContext, useContext, ReactNode } from 'react';
import { useActiveTrade } from '../hooks/useActiveTrade';
import { useTradeHistory } from '../hooks/useTradeHistory';
import type { Trade } from '../types/trade.types';

interface TradeContextValue {
  activeTrade: Trade | null;
  hasOpenTrade: boolean;
  isLoadingActiveTrade: boolean;
  recentTrades: Trade[];
  isLoadingHistory: boolean;
  refreshActiveTrade: () => void;
  refreshHistory: () => void;
}

const TradeContext = createContext<TradeContextValue | undefined>(undefined);

interface TradeProviderProps {
  children: ReactNode;
  userId: string | undefined;
}

export const TradeProvider = ({ children, userId }: TradeProviderProps) => {
  const {
    activeTrade,
    hasOpenTrade,
    isLoading: isLoadingActiveTrade,
    refresh: refreshActiveTrade,
  } = useActiveTrade(userId);

  const {
    trades: recentTrades,
    isLoading: isLoadingHistory,
    refresh: refreshHistory,
  } = useTradeHistory(userId, {
    includeRecent: true,
    limit: 10,
  });

  const value: TradeContextValue = {
    activeTrade,
    hasOpenTrade,
    isLoadingActiveTrade,
    recentTrades,
    isLoadingHistory,
    refreshActiveTrade,
    refreshHistory,
  };

  return (
    <TradeContext.Provider value={value}>
      {children}
    </TradeContext.Provider>
  );
};

export const useTradeContext = () => {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTradeContext deve ser usado dentro de TradeProvider');
  }
  return context;
};
