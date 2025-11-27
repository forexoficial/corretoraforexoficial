-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing payment verification cron job if it exists
SELECT cron.unschedule('check-pending-payments') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-pending-payments'
);

-- Create cron job to check pending payments every minute
SELECT cron.schedule(
  'check-pending-payments',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url:='https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/check-pending-payments',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);