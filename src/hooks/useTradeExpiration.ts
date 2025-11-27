import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTradeExpiration = (userId: string | undefined) => {
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const checkExpiredTrades = async () => {
      // Prevenir múltiplas chamadas simultâneas
      if (isProcessingRef.current) {
        console.log('[Trade Expiration] Já está processando, aguardando...');
        return;
      }

      try {
        isProcessingRef.current = true;

        // Buscar trades em aberto que já expiraram
        const { data: expiredTrades, error } = await supabase
          .from('trades')
          .select('id, expires_at, asset_id, amount, trade_type')
          .eq('user_id', userId)
          .eq('status', 'open')
          .lte('expires_at', new Date().toISOString());

        if (error) {
          console.error('[Trade Expiration] Erro ao verificar trades expirados:', error);
          return;
        }

        if (expiredTrades && expiredTrades.length > 0) {
          console.log(`[Trade Expiration] ${expiredTrades.length} trades expirados detectados:`, expiredTrades.map(t => ({ id: t.id, expires_at: t.expires_at })));
          
          // Chamar edge function para processar
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
            console.error('[Trade Expiration] Erro ao processar trades expirados:', functionError);
          } else {
            console.log('[Trade Expiration] ✅ Trades processados com sucesso:', data);
          }
        }
      } catch (error) {
        console.error('[Trade Expiration] Erro no processamento de trades expirados:', error);
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Verificar a cada 1 segundo para garantir processamento rápido
    checkIntervalRef.current = setInterval(checkExpiredTrades, 1000);

    // Verificar imediatamente ao montar
    checkExpiredTrades();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [userId]);
};
