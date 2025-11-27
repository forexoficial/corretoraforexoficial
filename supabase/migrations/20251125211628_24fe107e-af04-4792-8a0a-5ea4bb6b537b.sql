-- Corrigir funções de timezone com search_path seguro

DROP FUNCTION IF EXISTS public.now_utc_minus_3();
DROP FUNCTION IF EXISTS public.to_utc_minus_3(timestamp with time zone);

-- Recriar função para converter timestamps para UTC-3 (São Paulo) com search_path seguro
CREATE OR REPLACE FUNCTION public.now_utc_minus_3()
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo';
$$;

-- Recriar função para converter qualquer timestamp para UTC-3 com search_path seguro
CREATE OR REPLACE FUNCTION public.to_utc_minus_3(input_timestamp timestamp with time zone)
RETURNS timestamp with time zone
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (input_timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo';
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.now_utc_minus_3() IS 'Retorna o timestamp atual em UTC-3 (horário de São Paulo). Use esta função em vez de now() para garantir consistência de timezone em toda a plataforma.';
COMMENT ON FUNCTION public.to_utc_minus_3(timestamp with time zone) IS 'Converte qualquer timestamp para UTC-3 (horário de São Paulo). Use esta função para normalizar timestamps antes de armazenar no banco.';