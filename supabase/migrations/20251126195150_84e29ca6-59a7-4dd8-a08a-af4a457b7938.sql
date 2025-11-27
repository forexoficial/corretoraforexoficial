-- Primeiro, garantir que não há valores NULL
UPDATE trades 
SET is_demo = false 
WHERE is_demo IS NULL;

-- Tornar a coluna NOT NULL com default false
ALTER TABLE trades 
ALTER COLUMN is_demo SET NOT NULL,
ALTER COLUMN is_demo SET DEFAULT false;

-- Adicionar comentário explicativo
COMMENT ON COLUMN trades.is_demo IS 'Indica se a trade é em conta demo (true) ou real (false). Nunca deve ser NULL.';