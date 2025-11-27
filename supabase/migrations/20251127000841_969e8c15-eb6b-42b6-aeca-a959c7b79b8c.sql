-- Configurar tabela trades para enviar dados completos no realtime
ALTER TABLE public.trades REPLICA IDENTITY FULL;

-- Adicionar tabela trades à publicação do realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;