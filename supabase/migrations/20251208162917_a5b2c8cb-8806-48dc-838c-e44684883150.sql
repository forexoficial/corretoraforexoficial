-- Add admin delete policy for push_subscriptions
CREATE POLICY "Admins can delete push subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);