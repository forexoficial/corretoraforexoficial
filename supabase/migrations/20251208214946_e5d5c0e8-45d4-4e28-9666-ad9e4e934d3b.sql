-- Limpar todos os candles do asset EUR/USD OTC que estão com preços inconsistentes
-- Isso permite que o sistema gere novos candles com preços sincronizados entre timeframes
DELETE FROM candles WHERE asset_id = 'd685e880-34ba-4fb6-8f46-20f6ddfc280d';

-- Opcional: limpar candles de outros assets também para garantir consistência
-- DELETE FROM candles;

-- Adicionar comentário explicativo
COMMENT ON TABLE candles IS 'Candles de preços - todos os timeframes devem ter o MESMO preço atual para cada asset';