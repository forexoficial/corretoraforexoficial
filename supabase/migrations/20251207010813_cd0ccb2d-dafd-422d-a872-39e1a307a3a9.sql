-- Add INSERT policy for followers to subscribe themselves
CREATE POLICY "Followers can subscribe to copy traders" 
ON public.copy_trade_followers 
FOR INSERT 
WITH CHECK (auth.uid() = follower_user_id);

-- Add UPDATE policy for followers to update their own subscriptions
CREATE POLICY "Followers can update their own subscriptions" 
ON public.copy_trade_followers 
FOR UPDATE 
USING (auth.uid() = follower_user_id);

-- Add DELETE policy for followers to unsubscribe
CREATE POLICY "Followers can unsubscribe" 
ON public.copy_trade_followers 
FOR DELETE 
USING (auth.uid() = follower_user_id);