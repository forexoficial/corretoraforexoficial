import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface Candle {
  id: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Hook otimizado para buscar candles com cache React Query
 * - Cache de 30 segundos para dados históricos
 * - Invalidação automática em atualizações via Realtime
 * - Stale-while-revalidate para melhor UX
 */
export const useCandles = (assetId: string, timeframe: string) => {
  const queryClient = useQueryClient();
  
  // Query key único por asset e timeframe
  const queryKey = ['candles', assetId, timeframe];

  const { data: candles = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      console.log(`[useCandles] Fetching candles for ${assetId} ${timeframe}`);
      
      const { data, error } = await supabase
        .from('candles')
        .select('*')
        .eq('asset_id', assetId)
        .eq('timeframe', timeframe)
        .order('timestamp', { ascending: true })
        .limit(1000);

      if (error) throw error;
      return data as Candle[];
    },
    staleTime: 30 * 1000, // 30 segundos - considera dados "frescos"
    gcTime: 5 * 60 * 1000, // 5 minutos - mantém cache antes de garbage collect
    refetchOnWindowFocus: false, // Não refetch ao focar janela
    refetchOnReconnect: true, // Refetch ao reconectar
  });

  // Subscrição Realtime para invalidar cache quando houver updates
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
        (payload) => {
          console.log(`[useCandles] Realtime update for ${assetId}`, payload);
          
          // Invalidar cache para forçar refetch
          queryClient.invalidateQueries({ queryKey });
          
          // Ou fazer update otimista para melhor performance
          if (payload.new && payload.eventType === 'INSERT') {
            queryClient.setQueryData(queryKey, (old: Candle[] = []) => {
              return [...old, payload.new as Candle];
            });
          } else if (payload.new && payload.eventType === 'UPDATE') {
            queryClient.setQueryData(queryKey, (old: Candle[] = []) => {
              return old.map(c => c.id === (payload.new as Candle).id ? payload.new as Candle : c);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assetId, timeframe, queryClient, queryKey]);

  return {
    candles,
    isLoading,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey })
  };
};
