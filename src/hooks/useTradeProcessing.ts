import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook centralizado para processar trades expirados
 * Roda apenas uma vez na aplicação para evitar múltiplas chamadas
 */
export const useTradeProcessing = (userId: string | undefined) => {
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const checkExpiredTrades = async () => {
      // Prevenir múltiplas chamadas simultâneas
      if (isProcessingRef.current) {
        return;
      }

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
          console.error('[Trade Processing] Erro ao verificar trades expirados:', error);
          return;
        }

        if (expiredTrades && expiredTrades.length > 0) {
          console.log(`[Trade Processing] ${expiredTrades.length} trades expirados detectados`);
          
          // Chamar edge function para processar usando a função do banco
          const { data, error: functionError } = await supabase.functions.invoke(
            'process-expired-trades',
            {
              body: { 
                continuous: false,
                specificUserId: userId 
              }
            }
          );

          if (functionError) {
            console.error('[Trade Processing] Erro ao processar trades:', functionError);
          } else {
            console.log('[Trade Processing] ✅ Trades processados:', data);
          }
        }
      } catch (error) {
        console.error('[Trade Processing] Erro no processamento:', error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Verificar a cada 1 segundo
    checkIntervalRef.current = setInterval(checkExpiredTrades, 1000);

    // Verificar imediatamente
    checkExpiredTrades();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [userId]);
};
