import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook de fallback para processar trades expirados.
 * O processamento principal acontece no TradeMarker quando o timer zera.
 * Este hook serve como backup caso o usuário saia da página ou o TradeMarker não processe.
 */
export const useTradeExpiration = (userId: string | undefined) => {
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const checkExpiredTrades = async () => {
      if (isProcessingRef.current) return;

      try {
        isProcessingRef.current = true;

        // Buscar trades em aberto que já expiraram (fallback)
        const { data: expiredTrades, error } = await supabase
          .from('trades')
          .select('id, expires_at')
          .eq('user_id', userId)
          .eq('status', 'open')
          .lt('expires_at', new Date().toISOString());

        if (error) {
          console.error('[Trade Expiration Fallback] Error:', error);
          return;
        }

        // Se houver trades expirados que ainda não foram processados, chamar edge function
        if (expiredTrades && expiredTrades.length > 0) {
          console.log(`[Trade Expiration Fallback] Found ${expiredTrades.length} unprocessed expired trades`);
          
          await supabase.functions.invoke('process-expired-trades', {
            body: { continuous: false, specificUserId: userId }
          });
        }
      } catch (error) {
        console.error('[Trade Expiration Fallback] Error:', error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Verificar a cada 3 segundos como fallback (não precisa ser tão frequente)
    checkIntervalRef.current = setInterval(checkExpiredTrades, 3000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [userId]);
};
