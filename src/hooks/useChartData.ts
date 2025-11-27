import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CandlestickData, Time } from 'lightweight-charts';
import { useChartContext } from '@/contexts/ChartContext';

/**
 * Hook personalizado para gerenciar dados dos candles
 * - Carregamento de candles
 * - Geração inicial de candles
 * - Animação suave do candle atual
 */
export const useChartData = (
  assetId: string,
  timeframe: string,
  onCurrentPriceUpdate?: (price: number) => void
) => {
  const {
    candleSeriesRef,
    setIsLoading,
    setCurrentPrice,
    setCurrentCandleTime,
    currentCandleRef,
    smoothAnimationIntervalRef
  } = useChartContext();

  const loadCandles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: candles, error } = await supabase
        .from('candles')
        .select('*')
        .eq('asset_id', assetId)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: true })
        .limit(1000);

      if (error) {
        console.error('[useChartData] Error loading candles:', error);
        return null;
      }

      if (candles && candles.length > 0) {
        const chartData: CandlestickData<Time>[] = candles.map(c => {
          const timestamp = new Date(c.timestamp).getTime() / 1000;
          return {
            time: timestamp as Time,
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
          };
        });

        if (candleSeriesRef.current) {
          candleSeriesRef.current.setData(chartData);
        }
        
        // Update current price
        if (chartData.length > 0) {
          const lastCandle = chartData[chartData.length - 1];
          setCurrentPrice(lastCandle.close);
          onCurrentPriceUpdate?.(lastCandle.close);
        }
        
        return { chartData, lastCandle: candles[candles.length - 1] };
      }
      
      return null;
    } catch (error) {
      console.error('[useChartData] Error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [assetId, timeframe, candleSeriesRef, setIsLoading, setCurrentPrice, onCurrentPriceUpdate]);

  const generateInitialCandles = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-candles', {
        body: { assetId, timeframe, count: 200 }
      });

      if (error) throw error;

      // Reload candles after generation
      setTimeout(() => loadCandles(), 1000);
    } catch (error) {
      console.error('[useChartData] Error generating candles:', error);
    }
  }, [assetId, timeframe, loadCandles]);

  const startSmoothAnimation = useCallback((candle: any, tf: string) => {
    // Clear existing animation
    if (smoothAnimationIntervalRef.current) {
      clearInterval(smoothAnimationIntervalRef.current);
    }

    currentCandleRef.current = candle;
    
    // Start a new countdown period from now
    const periodStart = Date.now();
    setCurrentCandleTime(periodStart);

    // Calculate animation interval based on timeframe
    const getAnimationInterval = (timeframe: string): number => {
      const intervals: Record<string, number> = {
        '10s': 1000,
        '30s': 2000,
        '1m': 3000,
        '5m': 5000
      };
      return intervals[timeframe] || 3000;
    };

    const animationInterval = getAnimationInterval(tf);

    // Animate price movement
    smoothAnimationIntervalRef.current = setInterval(() => {
      if (!candleSeriesRef.current || !currentCandleRef.current) return;

      const current = currentCandleRef.current;
      const open = Number(current.open);
      const high = Number(current.high);
      const low = Number(current.low);
      
      // Generate small random movement within candle range
      const range = high - low;
      const volatility = range * 0.3;
      const currentClose = Number(current.close);
      
      const randomChange = (Math.random() - 0.5) * volatility;
      let newClose = currentClose + randomChange;
      
      // Keep within candle boundaries
      newClose = Math.max(low, Math.min(high, newClose));
      
      const timestamp = new Date(current.timestamp).getTime() / 1000;
      
      const updatedCandle: CandlestickData<Time> = {
        time: timestamp as Time,
        open,
        high: Math.max(high, newClose),
        low: Math.min(low, newClose),
        close: newClose,
      };

      // Update local reference
      currentCandleRef.current.close = newClose;
      currentCandleRef.current.high = Math.max(high, newClose);
      currentCandleRef.current.low = Math.min(low, newClose);
      
      candleSeriesRef.current.update(updatedCandle);
      
      // Notify price update
      setCurrentPrice(newClose);
      onCurrentPriceUpdate?.(newClose);
    }, animationInterval);
  }, [
    candleSeriesRef,
    currentCandleRef,
    smoothAnimationIntervalRef,
    setCurrentCandleTime,
    setCurrentPrice,
    onCurrentPriceUpdate
  ]);

  const handleCandleUpdate = useCallback((payload: any, currentTimeframe: string) => {
    if (!candleSeriesRef.current) return;

    const candle = payload.new;
    if (candle.timeframe !== currentTimeframe) {
      console.warn('[useChartData] Ignoring candle from different timeframe');
      return;
    }

    const timestamp = new Date(candle.timestamp).getTime() / 1000;
    const candleData: CandlestickData<Time> = {
      time: timestamp as Time,
      open: Number(candle.open),
      high: Number(candle.high),
      low: Number(candle.low),
      close: Number(candle.close),
    };

    candleSeriesRef.current.update(candleData);
    onCurrentPriceUpdate?.(Number(candle.close));
    startSmoothAnimation(candle, currentTimeframe);
  }, [candleSeriesRef, onCurrentPriceUpdate, startSmoothAnimation]);

  return {
    loadCandles,
    generateInitialCandles,
    startSmoothAnimation,
    handleCandleUpdate
  };
};
