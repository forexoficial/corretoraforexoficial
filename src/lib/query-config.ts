import { QueryClient } from '@tanstack/react-query';

/**
 * Configuração global do React Query
 * - Cache inteligente com stale-while-revalidate
 * - Retry automático com backoff exponencial
 * - Garbage collection otimizado
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tempo que dados são considerados frescos (30s)
      staleTime: 30 * 1000,
      
      // Tempo para garbage collection (5 min)
      gcTime: 5 * 60 * 1000,
      
      // Retry com backoff exponencial
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Não refetch automaticamente ao focar janela (economiza requests)
      refetchOnWindowFocus: false,
      
      // Refetch ao reconectar
      refetchOnReconnect: true,
      
      // Refetch quando ficar online novamente
      refetchOnMount: true,
    },
    mutations: {
      // Retry automático para mutations também
      retry: 2,
      retryDelay: 1000,
    },
  },
});
