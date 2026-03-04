-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the cleanup-demo-trades function to run daily at 3 AM UTC (midnight Brazil time UTC-3)
-- Cron expression: '0 3 * * *' means "at minute 0 of hour 3, every day"
SELECT cron.schedule(
  'cleanup-demo-trades-daily',
  '0 3 * * *', -- Every day at 3 AM UTC (midnight UTC-3)
  $$
  SELECT
    net.http_post(
        url:='https://qugyzdkyfnzeepattvzr.supabase.co/functions/v1/cleanup-demo-trades',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Check if the cron job was created successfully
SELECT * FROM cron.job WHERE jobname = 'cleanup-demo-trades-daily';
