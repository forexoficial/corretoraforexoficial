-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule cleanup job to run every hour
SELECT cron.schedule(
  'cleanup-expired-transactions',
  '0 * * * *', -- Run at minute 0 of every hour
  $$
  SELECT
    net.http_post(
        url:='https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/cleanup-expired-transactions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);