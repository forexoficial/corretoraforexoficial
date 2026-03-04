-- ============================================
-- PROCESSAMENTO RÁPIDO DE TRADES - A CADA 2 SEGUNDOS
-- ============================================
-- LIMITAÇÃO TÉCNICA: O pg_cron do Supabase executa no mínimo a cada 1 minuto.
-- SOLUÇÃO: Criamos um edge function que executa em loop interno a cada 2 segundos.
-- 
-- INSTRUÇÕES:
-- 1. Primeiro, remova o cron job antigo:
--    SELECT cron.unschedule('process-expired-trades-every-minute');
--
-- 2. Execute este SQL no Supabase SQL Editor
-- 3. O edge function será chamado a cada minuto e processará trades continuamente
--
-- COMO FUNCIONA:
-- - Cron chama edge function a cada minuto
-- - Edge function roda por ~55 segundos processando trades a cada 2 segundos
-- - Isso garante processamento quase instantâneo de trades expiradas
--
-- Para verificar o job:
-- SELECT * FROM cron.job WHERE jobname = 'continuous-trade-processor';
--
-- Para ver histórico:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'continuous-trade-processor')
-- ORDER BY start_time DESC LIMIT 20;
--
-- Para remover:
-- SELECT cron.unschedule('continuous-trade-processor');
-- ============================================

-- Remover job antigo se existir
DO $$
BEGIN
  PERFORM cron.unschedule('process-expired-trades-every-minute');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Criar job único que executa continuamente
SELECT cron.schedule(
  'continuous-trade-processor',
  '* * * * *',  -- A cada minuto
  $$
  SELECT
    net.http_post(
      url:='https://qugyzdkyfnzeepattvzr.supabase.co/functions/v1/process-expired-trades',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
      body:='{"continuous": true, "interval": 2}'::jsonb
    ) as request_id;
  $$
);

-- Verificar job criado
SELECT 
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'continuous-trade-processor';