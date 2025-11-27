-- Configurar REPLICA IDENTITY FULL na tabela trades
-- Isso permite que o Supabase Realtime envie os valores antigos (payload.old)
ALTER TABLE trades REPLICA IDENTITY FULL;