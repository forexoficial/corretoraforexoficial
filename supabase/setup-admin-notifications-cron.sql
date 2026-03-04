-- INSTRUÇÃO PARA CONFIGURAR CRON JOB DE NOTIFICAÇÕES ADMIN
-- Execute este SQL no Supabase SQL Editor

-- Certifique-se de que a extensão pg_cron está habilitada
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar job que processa a fila de notificações admin a cada 30 segundos
SELECT cron.schedule(
  'process-admin-notifications-job',
  '30 seconds',
  $$
  SELECT net.http_post(
    url := 'https://qugyzdkyfnzeepattvzr.supabase.co/functions/v1/process-admin-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verificar jobs agendados
-- SELECT * FROM cron.job;

-- Para remover o job (se necessário):
-- SELECT cron.unschedule('process-admin-notifications-job');
