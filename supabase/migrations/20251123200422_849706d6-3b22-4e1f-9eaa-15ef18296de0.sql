-- Add admin panel password hash to platform settings
INSERT INTO public.platform_settings (key, value, description)
VALUES ('admin_panel_password_hash', '', 'Hash da senha do painel admin (bcrypt)')
ON CONFLICT (key) DO NOTHING;