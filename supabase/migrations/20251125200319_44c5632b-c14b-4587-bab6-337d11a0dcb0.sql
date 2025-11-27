-- Add auto_generate_candles column to assets table
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS auto_generate_candles boolean DEFAULT true;

-- Add comment to explain the column
COMMENT ON COLUMN public.assets.auto_generate_candles IS 'Quando ativo, gera candles automaticamente para manter o gráfico atualizando mesmo sem manipulação';

-- Update existing assets to have auto_generate_candles enabled by default
UPDATE public.assets
SET auto_generate_candles = true
WHERE auto_generate_candles IS NULL;