-- Insert Stripe gateway record
INSERT INTO public.payment_gateways (name, type, is_active, config, api_key, api_secret) 
VALUES (
  'Stripe', 
  'worldwide', 
  true, 
  '{"provider": "stripe"}'::jsonb,
  'configured_via_secrets',
  'configured_via_secrets'
);