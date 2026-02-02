-- Remove the unique constraint on affiliate_id to allow multiple marketing metrics per affiliate
-- This enables admins to create one simulation per month for each affiliate
ALTER TABLE public.affiliate_marketing_metrics 
DROP CONSTRAINT affiliate_marketing_metrics_affiliate_id_key;