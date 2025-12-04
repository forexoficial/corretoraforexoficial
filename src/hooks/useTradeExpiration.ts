import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTradeExpiration = (userId: string | undefined) => {
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const isProcessingRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;

    const checkExpiredTrades = async () => {
      // Prevenir múltiplas chamadas simultâneas
      if (isProcessingRef.current) return;

      // Rate limit: não verificar mais de uma vez a cada 2 segundos
      const now = Date.now();
      if (now - lastCheckRef.current < 2000) return;
      lastCheckRef.current = now;

      try {
        isProcessingRef.current = true;

        // Buscar trades em aberto que já expiraram
        const { data: expiredTrades, error } = await supabase
          .from('trades')
          .select('id, expires_at')
          .eq('user_id', userId)
          .eq('status', 'open')
          .lte('expires_at', new Date().toISOString());

        if (error) {
          console.error('[Trade Expiration] Erro:', error);
          return;
        }

        if (expiredTrades && expiredTrades.length > 0) {
          console.log(`[Trade Expiration] ${expiredTrades.length} trades expirados`);
          
          // Chamar edge function para processar
          await supabase.functions.invoke('process-expired-trades', {
            body: { continuous: false, specificUserId: userId }
          });
        }
      } catch (error) {
        console.error('[Trade Expiration] Erro:', error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Verificar a cada 2 segundos (otimizado de 1 segundo)
    checkIntervalRef.current = setInterval(checkExpiredTrades, 2000);

    // Verificar imediatamente ao montar
    checkExpiredTrades();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [userId]);
};
