-- Add date range fields to affiliate_marketing_metrics
ALTER TABLE public.affiliate_marketing_metrics
ADD COLUMN IF NOT EXISTS period_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS period_end timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.affiliate_marketing_metrics.period_start IS 'Optional start date for the fake metrics period filter';
COMMENT ON COLUMN public.affiliate_marketing_metrics.period_end IS 'Optional end date for the fake metrics period filter';