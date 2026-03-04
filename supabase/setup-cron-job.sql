-- ============================================
-- CRON JOB SETUP FOR AUTOMATIC TRADE PROCESSING
-- ============================================
-- This SQL script configures a cron job to automatically process expired trades every minute.
-- 
-- INSTRUCTIONS:
-- 1. Copy this entire SQL script
-- 2. Go to your Supabase Dashboard -> SQL Editor
-- 3. Paste and execute this script
-- 4. The cron job will start running automatically every minute
--
-- To verify the cron job is running:
-- SELECT * FROM cron.job;
--
-- To see cron job execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- To unschedule the cron job (if needed):
-- SELECT cron.unschedule('process-expired-trades-every-minute');
-- ============================================

-- Schedule the cron job to run every minute
SELECT cron.schedule(
  'process-expired-trades-every-minute',  -- Unique job name
  '* * * * *',                             -- Cron expression: every minute
  $$
  SELECT
    net.http_post(
        url:='https://qugyzdkyfnzeepattvzr.supabase.co/functions/v1/process-expired-trades',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhobWlzcWNuZ2FseWphcGtkd3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjM3OTAsImV4cCI6MjA3OTQzOTc5MH0.6m8z73gz6Zbxq3xg2kvgTsD5j221as39AQ57P0OJjd8"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
