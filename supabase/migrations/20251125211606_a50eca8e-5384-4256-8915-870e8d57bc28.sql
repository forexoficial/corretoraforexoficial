-- Criar função para converter timestamps para UTC-3 (São Paulo)
-- Esta função será usada em toda a plataforma para garantir consistência

CREATE OR REPLACE FUNCTION public.now_utc_minus_3()
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo';
$$;

-- Criar função para converter qualquer timestamp para UTC-3
CREATE OR REPLACE FUNCTION public.to_utc_minus_3(input_timestamp timestamp with time zone)
RETURNS timestamp with time zone
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (input_timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo';
$$;

-- Comentários para documentação
COMMENT ON FUNCTION public.now_utc_minus_3() IS 'Retorna o timestamp atual em UTC-3 (horário de São Paulo). Use esta função em vez de now() para garantir consistência de timezone em toda a plataforma.';
COMMENT ON FUNCTION public.to_utc_minus_3(timestamp with time zone) IS 'Converte qualquer timestamp para UTC-3 (horário de São Paulo). Use esta função para normalizar timestamps antes de armazenar no banco.';
