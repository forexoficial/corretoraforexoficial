-- Add column for fake chart data (JSON array with daily data)
ALTER TABLE public.affiliate_marketing_metrics
ADD COLUMN IF NOT EXISTS fake_chart_data jsonb DEFAULT NULL;

COMMENT ON COLUMN public.affiliate_marketing_metrics.fake_chart_data IS 'JSON array with daily chart data: [{date: "2025-01-15", commissions: 150, referrals: 3}, ...]';