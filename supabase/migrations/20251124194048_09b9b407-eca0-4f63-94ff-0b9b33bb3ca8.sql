-- Add theme-specific logo settings
INSERT INTO platform_settings (key, value, description) 
VALUES 
  ('logo_light', '', 'Logo para tema claro (escura)'),
  ('logo_dark', '', 'Logo para tema escuro (clara)')
ON CONFLICT (key) DO NOTHING;

-- Add theme-specific color settings for light theme
INSERT INTO platform_settings (key, value, description) 
VALUES 
  ('light_background', '0 0% 100%', 'Cor de fundo do tema claro (HSL)'),
  ('light_foreground', '240 10% 3.9%', 'Cor de texto do tema claro (HSL)'),
  ('light_card', '0 0% 100%', 'Cor de card do tema claro (HSL)'),
  ('light_primary', '142.1 76.2% 36.3%', 'Cor primária do tema claro (HSL)'),
  ('light_secondary', '240 4.8% 95.9%', 'Cor secundária do tema claro (HSL)'),
  ('light_accent', '240 4.8% 95.9%', 'Cor de destaque do tema claro (HSL)'),
  ('light_muted', '240 4.8% 95.9%', 'Cor muted do tema claro (HSL)')
ON CONFLICT (key) DO NOTHING;

-- Add theme-specific color settings for dark theme  
INSERT INTO platform_settings (key, value, description) 
VALUES 
  ('dark_background', '240 10% 3.9%', 'Cor de fundo do tema escuro (HSL)'),
  ('dark_foreground', '0 0% 98%', 'Cor de texto do tema escuro (HSL)'),
  ('dark_card', '240 10% 3.9%', 'Cor de card do tema escuro (HSL)'),
  ('dark_primary', '142.1 70.6% 45.3%', 'Cor primária do tema escuro (HSL)'),
  ('dark_secondary', '240 3.7% 15.9%', 'Cor secundária do tema escuro (HSL)'),
  ('dark_accent', '240 3.7% 15.9%', 'Cor de destaque do tema escuro (HSL)'),
  ('dark_muted', '240 3.7% 15.9%', 'Cor muted do tema escuro (HSL)')
ON CONFLICT (key) DO NOTHING;