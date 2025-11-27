-- Add total_deposited column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_deposited numeric DEFAULT 0;

-- Add user_tier column to profiles (computed field for easy access)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_tier text DEFAULT 'standard';

-- Create function to calculate user tier based on total deposited
CREATE OR REPLACE FUNCTION public.calculate_user_tier(deposited numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF deposited >= 1000000 THEN
    RETURN 'vip';
  ELSIF deposited >= 100000 THEN
    RETURN 'pro';
  ELSE
    RETURN 'standard';
  END IF;
END;
$$;

-- Create function to update total_deposited when transaction is completed
CREATE OR REPLACE FUNCTION public.update_total_deposited()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a deposit transaction is completed
  IF NEW.type = 'deposit' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.profiles
    SET 
      total_deposited = COALESCE(total_deposited, 0) + NEW.amount,
      user_tier = calculate_user_tier(COALESCE(total_deposited, 0) + NEW.amount)
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to update total_deposited on transaction changes
DROP TRIGGER IF EXISTS on_transaction_completed ON public.transactions;
CREATE TRIGGER on_transaction_completed
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_total_deposited();

-- Update existing profiles with calculated totals from completed deposits
UPDATE public.profiles p
SET 
  total_deposited = COALESCE((
    SELECT SUM(t.amount) 
    FROM public.transactions t 
    WHERE t.user_id = p.user_id 
    AND t.type = 'deposit' 
    AND t.status = 'completed'
  ), 0);

-- Update user_tier for all existing profiles
UPDATE public.profiles
SET user_tier = calculate_user_tier(COALESCE(total_deposited, 0));