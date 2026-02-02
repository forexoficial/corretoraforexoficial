-- Create table for affiliate marketing metrics (fake metrics for content creators)
CREATE TABLE public.affiliate_marketing_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  fake_total_referrals INTEGER DEFAULT 0,
  fake_total_deposits NUMERIC(12,2) DEFAULT 0,
  fake_total_commission NUMERIC(12,2) DEFAULT 0,
  fake_pending_commission NUMERIC(12,2) DEFAULT 0,
  fake_paid_commission NUMERIC(12,2) DEFAULT 0,
  fake_conversion_rate NUMERIC(5,2) DEFAULT 0,
  fake_active_users INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(affiliate_id)
);

-- Enable RLS
ALTER TABLE public.affiliate_marketing_metrics ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage marketing metrics
CREATE POLICY "Admins can manage marketing metrics"
ON public.affiliate_marketing_metrics
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy for affiliates to view their own marketing metrics
CREATE POLICY "Affiliates can view their own marketing metrics"
ON public.affiliate_marketing_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE affiliates.id = affiliate_marketing_metrics.affiliate_id
    AND affiliates.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_affiliate_marketing_metrics_updated_at
BEFORE UPDATE ON public.affiliate_marketing_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE public.affiliate_marketing_metrics IS 'Fake metrics for affiliates to use in marketing content/creatives';