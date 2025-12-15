-- Add signup banner URL settings for English and Spanish
INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('signup_banner_url_en', '', 'URL do banner de cadastro em inglês'),
  ('signup_banner_url_es', '', 'URL do banner de cadastro em espanhol')
ON CONFLICT (key) DO NOTHING;