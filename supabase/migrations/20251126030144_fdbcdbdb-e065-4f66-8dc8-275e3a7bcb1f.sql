-- Add exit_price column to trades table for transparency
ALTER TABLE trades ADD COLUMN IF NOT EXISTS exit_price numeric;

-- Add index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN trades.exit_price IS 'Price at which the trade was closed/expired';