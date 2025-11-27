-- Setup cron job to update current candles every 3 seconds
-- This keeps the current candle oscillating in real-time for all users

SELECT cron.schedule(
  'update-current-candles-realtime',
  '*/3 * * * * *', -- Every 3 seconds
  $$
  SELECT
    net.http_post(
      url:='https://xhmisqcngalyjapkdwvh.supabase.co/functions/v1/update-current-candles',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
