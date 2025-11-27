import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TradeStats {
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  winRate: number;
  totalProfit: number;
  todayProfit: number;
  bestStreak: number;
  currentStreak: number;
  totalInvested: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  loading: boolean;
}

export function useTradeAnalytics(userId: string | undefined, isDemoMode: boolean) {
  const [stats, setStats] = useState<TradeStats>({
    totalTrades: 0,
    wonTrades: 0,
    lostTrades: 0,
    winRate: 0,
    totalProfit: 0,
    todayProfit: 0,
    bestStreak: 0,
    currentStreak: 0,
    totalInvested: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: 0,
    bestTrade: 0,
    worstTrade: 0,
    loading: true,
  });

  // Memoizar função de cálculo de estatísticas
  const calculateStats = useCallback((trades: any[]) => {
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0,
        wonTrades: 0,
        lostTrades: 0,
        winRate: 0,
        totalProfit: 0,
        todayProfit: 0,
        bestStreak: 0,
        currentStreak: 0,
        totalInvested: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        bestTrade: 0,
        worstTrade: 0,
        loading: false,
      };
    }

    // Calculate statistics
    const totalTrades = trades.length;
    const wonTrades = trades.filter(t => t.status === 'won').length;
    const lostTrades = trades.filter(t => t.status === 'lost').length;
    const winRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;

    // Calculate profits
    const totalProfit = trades.reduce((sum, t) => sum + (t.result || 0), 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayProfit = trades
      .filter(t => new Date(t.closed_at) >= todayStart)
      .reduce((sum, t) => sum + (t.result || 0), 0);

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let lastStatus: string | null = null;

    for (const trade of trades) {
      if (trade.status === 'won') {
        if (lastStatus === 'won') {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
      lastStatus = trade.status;
    }

    // Current streak (from most recent trades)
    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i].status === 'won') {
        currentStreak++;
      } else {
        break;
      }
    }

    // Investment and averages
    const totalInvested = trades.reduce((sum, t) => sum + t.amount, 0);
    const wins = trades.filter(t => t.status === 'won');
    const losses = trades.filter(t => t.status === 'lost');
    const averageWin = wins.length > 0 
      ? wins.reduce((sum, t) => sum + (t.result || 0), 0) / wins.length 
      : 0;
    const averageLoss = losses.length > 0
      ? Math.abs(losses.reduce((sum, t) => sum + (t.result || 0), 0) / losses.length)
      : 0;

    // Profit factor (total wins / total losses)
    const totalWins = wins.reduce((sum, t) => sum + (t.result || 0), 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.result || 0), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    // Best and worst trades
    const results = trades.map(t => t.result || 0);
    const bestTrade = Math.max(...results);
    const worstTrade = Math.min(...results);

    return {
      totalTrades,
      wonTrades,
      lostTrades,
      winRate,
      totalProfit,
      todayProfit,
      bestStreak,
      currentStreak,
      totalInvested,
      averageWin,
      averageLoss,
      profitFactor,
      bestTrade,
      worstTrade,
      loading: false,
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    const loadStats = async () => {
      try {
        // Get all closed trades
        const { data: trades, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', userId)
          .eq('is_demo', isDemoMode)
          .in('status', ['won', 'lost'])
          .order('closed_at', { ascending: true });

        if (error) throw error;

        const calculatedStats = calculateStats(trades || []);
        setStats(calculatedStats);
      } catch (error) {
        console.error('Error loading trade stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();

    // Subscribe to trade changes - usando um canal único por usuário
    const channelName = `trade-stats-${userId}-${isDemoMode ? 'demo' : 'real'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Só recarrega se for uma mudança relevante (status mudou para won/lost)
          if (payload.new && ['won', 'lost'].includes((payload.new as any).status)) {
            loadStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isDemoMode, calculateStats]);

  return stats;
}