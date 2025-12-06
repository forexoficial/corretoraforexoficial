-- Drop the existing type constraint and add a new one that includes 'coinbase'
ALTER TABLE public.payment_gateways DROP CONSTRAINT IF EXISTS payment_gateways_type_check;

-- Add updated constraint with coinbase type
ALTER TABLE public.payment_gateways ADD CONSTRAINT payment_gateways_type_check 
CHECK (type IN ('pix', 'crypto', 'worldwide', 'coinbase'));