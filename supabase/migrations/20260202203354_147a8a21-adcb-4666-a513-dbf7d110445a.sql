-- Add column for fake withdrawal history in affiliate marketing metrics
ALTER TABLE public.affiliate_marketing_metrics 
ADD COLUMN IF NOT EXISTS fake_withdrawal_history jsonb DEFAULT NULL;

COMMENT ON COLUMN public.affiliate_marketing_metrics.fake_withdrawal_history IS 'Array of fake withdrawal records for marketing demonstration purposes';