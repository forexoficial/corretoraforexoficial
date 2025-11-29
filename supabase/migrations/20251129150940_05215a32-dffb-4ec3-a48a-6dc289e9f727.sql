-- Corrigir valores de payout em trades existentes
-- O payout estava sendo salvo como (investment + profit) mas deveria ser apenas profit

-- Para trades que já foram fechados (won/lost), precisamos recalcular o payout correto
-- Payout correto = result - amount (para trades vencidos)
-- Payout para trades perdidos = 0 (não importa pois result já é 0)

UPDATE public.trades
SET payout = CASE 
  WHEN status = 'won' AND result IS NOT NULL THEN result - amount
  ELSE payout
END
WHERE status IN ('won', 'lost') AND closed_at IS NOT NULL;

-- Para trades ainda abertos, o payout atual pode estar incorreto
-- Mas eles serão processados com a lógica correta quando expirarem

COMMENT ON TABLE public.trades IS 'Trades table - payout field now stores only profit, not total return';