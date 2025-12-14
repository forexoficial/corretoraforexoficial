-- Allow affiliates to view their own referrals
CREATE POLICY "Affiliates can view their own referrals"
ON public.referrals
FOR SELECT
USING (
  affiliate_id IN (
    SELECT affiliates.id
    FROM public.affiliates
    WHERE affiliates.user_id = auth.uid()
  )
);

-- Allow affiliates to view their own commissions
CREATE POLICY "Affiliates can view their own commissions"
ON public.commissions
FOR SELECT
USING (
  affiliate_id IN (
    SELECT affiliates.id
    FROM public.affiliates
    WHERE affiliates.user_id = auth.uid()
  )
);