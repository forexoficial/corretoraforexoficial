import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { candleCache, deduplicateRequest } from "@/utils/requestOptimization";

interface VolatilityAlert {
  assetId: string;
  assetSymbol: string;
  priceChange: number;
  direction: 'up' | 'down';
  timestamp: Date;
}

const VOLATILITY_THRESHOLD = 2; // 2% change triggers alert
const CHECK_INTERVAL = 10000; // Check every 10 seconds (optimized from 5s)
const ALERT_COOLDOWN = 60000; // 1 minute cooldown between alerts for same asset

export function useVolatilityAlerts(currentAssetId: string | null) {
  const [lastPrices, setLastPrices] = useState<Map<string, number>>(new Map());
  const [recentAlerts, setRecentAlerts] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();
  const alertSound = useRef<HTMLAudioElement | null>(null);

  // Initialize volatility alert sound
  useEffect(() => {
    alertSound.current = new Audio('/sounds/volatility.MP3');
    alertSound.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (!currentAssetId) return;

    const checkVolatility = async () => {
      try {
        const cacheKey = `volatility-${currentAssetId}`;
        
        // Deduplicate concurrent requests
        const result = await deduplicateRequest(
          cacheKey,
          async () => {
            const response = await supabase
              .from('candles')
              .select('asset_id, close, assets(symbol)')
              .eq('asset_id', currentAssetId)
              .eq('timeframe', '30s')
              .order('timestamp', { ascending: false })
              .limit(1);
            return response;
          }
        );
        
        const { data: candles, error } = result as any;

        if (error || !candles || candles.length === 0) return;

        const currentCandle = candles[0];
        const currentPrice = currentCandle.close;
        const assetSymbol = (currentCandle.assets as any)?.symbol || 'Unknown';
        const lastPrice = lastPrices.get(currentAssetId);

        if (lastPrice && lastPrice !== currentPrice) {
          // Calculate price change percentage
          const priceChange = ((currentPrice - lastPrice) / lastPrice) * 100;
          const absChange = Math.abs(priceChange);

          // Check if volatility threshold is exceeded
          if (absChange >= VOLATILITY_THRESHOLD) {
            const lastAlertTime = recentAlerts.get(currentAssetId) || 0;
            const timeSinceLastAlert = Date.now() - lastAlertTime;

            // Only alert if cooldown period has passed
            if (timeSinceLastAlert > ALERT_COOLDOWN) {
              // Update last alert time
              setRecentAlerts(prev => new Map(prev).set(currentAssetId, Date.now()));

              // Play alert sound
              alertSound.current?.play().catch(err => console.error('Error playing volatility sound:', err));

              // Show toast notification
              const direction = priceChange > 0 ? 'up' : 'down';
              const emoji = direction === 'up' ? '📈' : '📉';
              
              toast({
                title: `${emoji} Alta Volatilidade Detectada!`,
                description: `${assetSymbol}: ${direction === 'up' ? '+' : ''}${priceChange.toFixed(2)}% em 30 segundos`,
                variant: priceChange > 0 ? "default" : "destructive",
                duration: 10000,
              });

              console.log('Volatility alert:', {
                asset: assetSymbol,
                priceChange: priceChange.toFixed(2) + '%',
                direction,
                oldPrice: lastPrice,
                newPrice: currentPrice,
              });
            }
          }
        }

        // Update last price
        setLastPrices(prev => new Map(prev).set(currentAssetId, currentPrice));
      } catch (error) {
        console.error('Error checking volatility:', error);
      }
    };

    // Initial check
    checkVolatility();

    // Set up interval for periodic checks
    const interval = setInterval(checkVolatility, CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [currentAssetId, lastPrices, recentAlerts, toast]);

  // Clean up old alerts from memory
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setRecentAlerts(prev => {
        const newMap = new Map(prev);
        for (const [assetId, timestamp] of newMap.entries()) {
          if (now - timestamp > ALERT_COOLDOWN) {
            newMap.delete(assetId);
          }
        }
        return newMap;
      });
    }, ALERT_COOLDOWN);

    return () => clearInterval(cleanup);
  }, []);

  return {
    volatilityAlertsEnabled: true,
  };
}
