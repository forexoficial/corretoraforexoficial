-- Add border color settings for light and dark themes
INSERT INTO platform_settings (key, value, description)
VALUES 
  ('light_border', '240 5.9% 90%', 'Cor de borda tema claro'),
  ('dark_border', '220 13% 23%', 'Cor de borda tema escuro')
ON CONFLICT (key) DO NOTHING;