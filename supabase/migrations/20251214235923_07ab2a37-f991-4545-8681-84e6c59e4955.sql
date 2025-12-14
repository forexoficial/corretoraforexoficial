-- Allow affiliates to view basic profile info of their referred users
CREATE POLICY "Affiliates can view referred profiles"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT r.referred_user_id
    FROM public.referrals r
    JOIN public.affiliates a ON a.id = r.affiliate_id
    WHERE a.user_id = auth.uid()
  )
);

-- Allow affiliates to view deposit transactions of their referred users
CREATE POLICY "Affiliates can view referred deposits"
ON public.transactions
FOR SELECT
USING (
  type = 'deposit'
  AND user_id IN (
    SELECT r.referred_user_id
    FROM public.referrals r
    JOIN public.affiliates a ON a.id = r.affiliate_id
    WHERE a.user_id = auth.uid()
  )
);