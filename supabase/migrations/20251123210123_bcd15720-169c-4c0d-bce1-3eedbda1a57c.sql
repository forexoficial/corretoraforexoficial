-- Adicionar colunas para conta demo
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS demo_balance NUMERIC DEFAULT 10000.00,
ADD COLUMN IF NOT EXISTS is_demo_mode BOOLEAN DEFAULT true;

-- Atualizar usuários existentes com saldo demo
UPDATE profiles 
SET demo_balance = 10000.00, is_demo_mode = true 
WHERE demo_balance IS NULL;

-- Adicionar coluna para identificar trades demo
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN profiles.demo_balance IS 'Saldo da conta demo para treino (sempre R$10.000 inicial)';
COMMENT ON COLUMN profiles.is_demo_mode IS 'Se true, usuário está operando em modo demo';
COMMENT ON COLUMN trades.is_demo IS 'Se true, trade foi realizado em modo demo';