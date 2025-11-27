-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the cleanup-old-candles function to run daily at 3 AM Brazil time (6 AM UTC)
-- Cron expression: '0 6 * * *' means "at minute 0 of hour 6, every day"
SELECT cron.schedule(
  'cleanup-old-candles-daily',
  '0 6 * * *', -- Every day at 6 AM UTC (3 AM UTC-3)
  $$
  SELECT
    net.http_post(
        url:='https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/cleanup-old-candles',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Check if the cron job was created successfully
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-candles-daily';
