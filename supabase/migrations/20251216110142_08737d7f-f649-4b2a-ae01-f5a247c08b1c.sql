-- Configurar a tabela transactions para Realtime (necessário para página de sucesso automática do PIX)

-- Configurar REPLICA IDENTITY FULL para enviar payload completo nas atualizações
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

-- Adicionar a tabela transactions à publicação supabase_realtime (se não estiver)
DO $$
BEGIN
  -- Primeiro, verifica se a tabela já está na publicação
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
END $$;