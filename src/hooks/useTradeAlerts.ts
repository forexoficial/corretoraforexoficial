import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActiveTrade {
  id: string;
  asset_id: string;
  expires_at: string;
  amount: number;
  trade_type: string;
}

export function useTradeAlerts(userId: string | undefined, isDemoMode: boolean) {
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const { toast } = useToast();
  const alertedTrades = useRef<Set<string>>(new Set());
  const alertSound = useRef<HTMLAudioElement | null>(null);

  // Initialize alert sound
  useEffect(() => {
    alertSound.current = new Audio('/sounds/alert.MP3');
    alertSound.current.volume = 0.6;
  }, []);

  // Load active trades
  useEffect(() => {
    if (!userId) return;

    const loadActiveTrades = async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('id, asset_id, expires_at, amount, trade_type')
        .eq('user_id', userId)
        .eq('is_demo', isDemoMode)
        .eq('status', 'open')
        .order('expires_at', { ascending: true });

      if (error) {
        console.error('Error loading active trades:', error);
        return;
      }

      setActiveTrades(data || []);
    };

    loadActiveTrades();

    // Subscribe to trade changes
    const channel = supabase
      .channel('trade-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadActiveTrades();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isDemoMode]);

  // Check for expiring trades (10 seconds before expiration)
  useEffect(() => {
    const checkExpiringTrades = () => {
      const now = new Date();
      
      activeTrades.forEach((trade) => {
        const expiresAt = new Date(trade.expires_at);
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        const secondsUntilExpiry = Math.floor(timeUntilExpiry / 1000);

        // Alert 10 seconds before expiration
        if (secondsUntilExpiry <= 10 && secondsUntilExpiry > 0 && !alertedTrades.current.has(trade.id)) {
          alertedTrades.current.add(trade.id);
          
          // Play alert sound
          alertSound.current?.play().catch(err => console.error('Error playing alert sound:', err));

          // Show toast notification
          toast({
            title: "⚠️ Operação expirando em breve!",
            description: `Sua operação ${trade.trade_type.toUpperCase()} de R$ ${trade.amount.toFixed(2)} expira em ${secondsUntilExpiry} segundos`,
            variant: "default",
            duration: 8000,
          });
        }

        // Clean up alerted trades after expiration
        if (timeUntilExpiry < -5000) {
          alertedTrades.current.delete(trade.id);
        }
      });
    };

    const interval = setInterval(checkExpiringTrades, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeTrades, toast]);

  return {
    activeTrades,
    alertedTradesCount: alertedTrades.current.size,
  };
}
