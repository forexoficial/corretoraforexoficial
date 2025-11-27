import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook refatorado para usar o novo hook useTradeProcessing centralizado
 * @deprecated Use useTradeProcessing instead
 */
export const useTradeExpiration = (userId: string | undefined) => {
  console.warn('[useTradeExpiration] Este hook está deprecated. Use useTradeProcessing no nível da aplicação.');
  
  // Este hook não faz mais nada, toda a lógica foi movida para useTradeProcessing
  // que deve ser chamado apenas uma vez no nível raiz da aplicação
};
