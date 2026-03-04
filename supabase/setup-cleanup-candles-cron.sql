-- =============================================
-- AGGRESSIVE CLEANUP: Keep only last 24 hours of candles
-- Run every hour to keep database size under control
-- =============================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old cron job if exists
SELECT cron.unschedule('cleanup-old-candles-daily');

-- Schedule the cleanup to run EVERY HOUR for aggressive cleanup
SELECT cron.schedule(
  'cleanup-old-candles-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://qugyzdkyfnzeepattvzr.supabase.co/functions/v1/cleanup-old-candles',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-candles-hourly';
