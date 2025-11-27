import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChartContext } from '@/contexts/ChartContext';
import { useChartData } from '@/hooks/useChartData';
import { useChartTrades } from '@/hooks/useChartTrades';
import { useChartAppearance } from '@/hooks/useChartAppearance';

interface ChartDataManagerProps {
  assetId: string;
  timeframe: string;
  onCurrentPriceUpdate?: (price: number) => void;
}

/**
 * ChartDataManager - Gerencia carregamento de dados, animações e trades
 */
export const ChartDataManager = ({
  assetId,
  timeframe,
  onCurrentPriceUpdate
}: ChartDataManagerProps) => {
  const { chartRef, userId, setUserId, autoGenerateIntervalRef, candleCheckIntervalRef } = useChartContext();
  const { settings: appearanceSettings } = useChartAppearance();
  
  const {
    loadCandles,
    generateInitialCandles,
    handleCandleUpdate
  } = useChartData(assetId, timeframe, onCurrentPriceUpdate);

  const {
    loadActiveTrades,
    handleTradeStatusChange
  } = useChartTrades(
    assetId,
    appearanceSettings?.trade_line_call_color || undefined,
    appearanceSettings?.trade_line_put_color || undefined,
    appearanceSettings?.trade_line_style || undefined,
    appearanceSettings?.trade_line_width || undefined,
    appearanceSettings?.trade_line_show_label ?? undefined
  );

  // Get user ID
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUserId();
  }, [setUserId]);

  // Load candles on mount
  useEffect(() => {
    if (chartRef.current) {
      loadCandles();
    }
  }, [assetId, timeframe, chartRef, loadCandles]);

  // Load active trades when userId changes
  useEffect(() => {
    if (userId) {
      loadActiveTrades();
    }
  }, [userId, assetId, timeframe, loadActiveTrades]);

  // Setup auto-generation for assets with auto_generate_candles enabled
  useEffect(() => {
    const setupAutoGeneration = async () => {
      const { data: asset } = await supabase
        .from('assets')
        .select('auto_generate_candles')
        .eq('id', assetId)
        .single();

      if (!asset?.auto_generate_candles) {
        console.log('[AutoGen] Disabled for asset');
        return;
      }

      const timeframeMs: Record<string, number> = {
        '10s': 10000,
        '30s': 30000,
        '1m': 60000,
        '5m': 300000
      };

      const interval = timeframeMs[timeframe];
      if (!interval) return;

      // Check for new candles periodically
      candleCheckIntervalRef.current = setInterval(async () => {
        const { data: latestCandle } = await supabase
          .from('candles')
          .select('timestamp')
          .eq('asset_id', assetId)
          .eq('timeframe', timeframe)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (!latestCandle) return;

        const lastTime = new Date(latestCandle.timestamp).getTime();
        const now = Date.now();
        const timeSinceLastCandle = now - lastTime;

        if (timeSinceLastCandle >= interval * 1.5) {
          console.log('[AutoGen] Generating new candle');
          await generateInitialCandles();
        }
      }, interval);
    };

    setupAutoGeneration();

    return () => {
      if (autoGenerateIntervalRef.current) {
        clearInterval(autoGenerateIntervalRef.current);
      }
      if (candleCheckIntervalRef.current) {
        clearInterval(candleCheckIntervalRef.current);
      }
    };
  }, [assetId, timeframe, autoGenerateIntervalRef, candleCheckIntervalRef, generateInitialCandles]);

  // Subscribe to candle updates
  useEffect(() => {
    const channel = supabase
      .channel(`candles-${assetId}-${timeframe}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candles',
          filter: `asset_id=eq.${assetId}`
        },
        (payload) => handleCandleUpdate(payload, timeframe)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assetId, timeframe, handleCandleUpdate]);

  // Subscribe to trade updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`trades-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        handleTradeStatusChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, handleTradeStatusChange]);

  return null;
};
