-- Limpar candles dos timeframes removidos (15m, 1h, 4h, 1d)
-- Mantendo apenas 10s, 30s, 1m e 5m para operações rápidas
DELETE FROM candles 
WHERE timeframe IN ('15m', '1h', '4h', '1d');

-- Log de quantos foram removidos
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Removidos % candles de timeframes longos', deleted_count;
END $$;