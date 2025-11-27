-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the process-expired-trades function to run every minute
SELECT cron.schedule(
  'process-expired-trades-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/process-expired-trades',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);