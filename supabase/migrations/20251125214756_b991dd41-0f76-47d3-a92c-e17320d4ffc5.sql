
-- Setup cron job to update current candles every 3 seconds
SELECT cron.schedule(
  'update-current-candles-realtime',
  '*/3 * * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/update-current-candles',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
