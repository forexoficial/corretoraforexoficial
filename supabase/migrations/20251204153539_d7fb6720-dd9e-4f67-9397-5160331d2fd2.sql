-- Remove o trigger duplicado que causa a duplicação do saldo
DROP TRIGGER IF EXISTS update_trade_balance ON public.trades;