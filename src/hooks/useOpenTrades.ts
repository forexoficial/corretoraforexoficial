import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useOpenTrades = (userId: string | undefined) => {
  const [hasOpenTrade, setHasOpenTrade] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setHasOpenTrade(false);
      setIsLoading(false);
      return;
    }

    const checkOpenTrades = async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'open')
        .limit(1);

      if (!error && data) {
        setHasOpenTrade(data.length > 0);
      }
      setIsLoading(false);
    };

    checkOpenTrades();

    // Subscribe to trade changes
    const channel = supabase
      .channel('open-trades-check')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${userId}`
        },
        () => {
          checkOpenTrades();
        }
      )
      .subscribe();

    // Listen to trade-created events
    const handleTradeCreated = () => {
      checkOpenTrades();
    };
    window.addEventListener('trade-created', handleTradeCreated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('trade-created', handleTradeCreated);
    };
  }, [userId]);

  return { hasOpenTrade, isLoading };
};
