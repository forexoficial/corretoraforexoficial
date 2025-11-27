-- Remover funções UTC-3 desnecessárias (abordagem correta não precisa delas)
-- A conversão de timezone deve acontecer apenas na exibição (frontend), não no banco

DROP FUNCTION IF EXISTS public.now_utc_minus_3();
DROP FUNCTION IF EXISTS public.to_utc_minus_3(timestamp with time zone);

-- O PostgreSQL já armazena TIMESTAMP WITH TIME ZONE em UTC automaticamente
-- A conversão para UTC-3 deve ser feita no frontend usando toLocaleString com timeZone: 'America/Sao_Paulo'