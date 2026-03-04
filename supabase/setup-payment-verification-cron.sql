-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing payment verification cron job if it exists
SELECT cron.unschedule('check-pending-payments');

-- Create cron job to check pending payments every minute
SELECT cron.schedule(
  'check-pending-payments',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url:='https://qugyzdkyfnzeepattvzr.supabase.co/functions/v1/check-pending-payments',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'check-pending-payments';
