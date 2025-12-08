-- Add country fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'USD';

-- Add index for efficient country filtering
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON public.profiles(country_code);

-- Add payment_currency column to transactions for tracking currency used
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'USD';

-- Add index for efficient currency filtering
CREATE INDEX IF NOT EXISTS idx_transactions_payment_currency ON public.transactions(payment_currency);

-- Comment for documentation
COMMENT ON COLUMN public.profiles.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., BR, US, ES)';
COMMENT ON COLUMN public.profiles.country_name IS 'Full country name for display purposes';
COMMENT ON COLUMN public.profiles.preferred_currency IS 'User preferred currency (BRL, USD, etc.)';
COMMENT ON COLUMN public.transactions.payment_currency IS 'Currency used in this transaction (BRL, USD, etc.)';