import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useChartContext } from '@/contexts/ChartContext';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Hook personalizado para gerenciar trades ativos no gráfico
 * - Carregamento de trades ativos
 * - Renderização de linhas de entrada
 * - Monitoramento de trades concluídos
 */
export const useChartTrades = (
  assetId: string,
  tradeLineCallColor?: string,
  tradeLinePutColor?: string,
  tradeLineStyle?: number,
  tradeLineWidth?: number,
  showLabel?: boolean
) => {
  const {
    userId,
    candleSeriesRef,
    activeTrades,
    setActiveTrades,
    tradeLinesRef,
    setCompletedTradeNotification
  } = useChartContext();
  const isMobile = useIsMobile();

  const loadActiveTrades = useCallback(async () => {
    if (!userId || !candleSeriesRef.current) {
      console.log('[useChartTrades] Skipping - no userId or candleSeries');
      return;
    }

    try {
      console.log('[useChartTrades] Loading active trades for user:', userId);
      
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open');

      if (error) {
        console.error('[useChartTrades] Error loading trades:', error);
        return;
      }

      console.log('[useChartTrades] Loaded trades:', trades);
      
      // Clear existing trade lines
      tradeLinesRef.current.forEach(line => {
        candleSeriesRef.current?.removePriceLine(line);
      });
      tradeLinesRef.current.clear();

      // Filter trades for current asset
      const assetTrades = trades?.filter(t => t.asset_id === assetId) || [];
      console.log('[useChartTrades] Trades for current asset:', assetTrades);
      
      setActiveTrades(assetTrades);

      // Add price lines for active trades
      assetTrades.forEach(trade => {
        if (trade.entry_price && candleSeriesRef.current) {
          const lineColor = trade.trade_type === 'call' 
            ? (tradeLineCallColor || '#22c55e')
            : (tradeLinePutColor || '#ef4444');

          const priceLine = candleSeriesRef.current.createPriceLine({
            price: Number(trade.entry_price),
            color: lineColor,
            lineWidth: tradeLineWidth || 2,
            lineStyle: tradeLineStyle || 2,
            axisLabelVisible: true,
            title: showLabel !== false ? `${trade.trade_type.toUpperCase()} R$ ${Number(trade.amount).toFixed(2)}` : '',
          });

          tradeLinesRef.current.set(trade.id, priceLine);
          console.log('[useChartTrades] Added price line for trade:', trade.id, 'at price:', trade.entry_price);
        }
      });
    } catch (error) {
      console.error('[useChartTrades] Error:', error);
    }
  }, [
    userId,
    assetId,
    candleSeriesRef,
    setActiveTrades,
    tradeLinesRef,
    tradeLineCallColor,
    tradeLinePutColor,
    tradeLineStyle,
    tradeLineWidth,
    showLabel
  ]);

  const handleTradeStatusChange = useCallback((payload: any) => {
    console.log('[useChartTrades] Trade status changed:', payload);
    
    const trade = payload.new;
    
    // Remove price line when trade closes
    if (['won', 'lost'].includes(trade.status) && tradeLinesRef.current.has(trade.id)) {
      const line = tradeLinesRef.current.get(trade.id);
      if (line && candleSeriesRef.current) {
        candleSeriesRef.current.removePriceLine(line);
      }
      tradeLinesRef.current.delete(trade.id);
      
      // Update active trades
      setActiveTrades(prev => prev.filter((t: any) => t.id !== trade.id));
      
      // Show notification
      setCompletedTradeNotification({
        status: trade.status,
        result: trade.result,
        amount: trade.amount,
        tradeType: trade.trade_type
      });
    }
    
    // If a new trade was created, reload
    if (payload.eventType === 'INSERT' && trade.status === 'open') {
      loadActiveTrades();
    }
  }, [
    candleSeriesRef,
    tradeLinesRef,
    setActiveTrades,
    setCompletedTradeNotification,
    loadActiveTrades
  ]);

  return {
    activeTrades,
    loadActiveTrades,
    handleTradeStatusChange
  };
};
