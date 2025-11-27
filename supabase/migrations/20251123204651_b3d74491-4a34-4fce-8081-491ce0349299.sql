-- Adicionar configuração para habilitar/desabilitar USDT
INSERT INTO platform_settings (key, value, description) 
VALUES ('usdt_enabled', 'false', 'Habilita depósitos e saques via USDT')
ON CONFLICT (key) DO NOTHING;