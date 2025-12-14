
-- Drop the old constraint that only allows deposit/withdrawal
ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;

-- Add new constraint that includes 'commission' type
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
CHECK (type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'commission'::text]));
