-- Add entry_price column to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS entry_price numeric;

-- Add comment
COMMENT ON COLUMN trades.entry_price IS 'Preço do ativo no momento da entrada (abertura do trade)';