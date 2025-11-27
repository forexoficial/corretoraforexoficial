-- ============================================================================
-- FASE 1: CORREÇÕES CRÍTICAS - DATABASE OPTIMIZATIONS
-- ============================================================================

-- 1. ÍNDICES COMPOSTOS PARA PERFORMANCE
-- ============================================================================

-- Índice composto para queries de trades por usuário e status
CREATE INDEX IF NOT EXISTS idx_trades_user_status_expires 
ON trades(user_id, status, expires_at DESC);

-- Índice composto para queries de candles por asset e timestamp
CREATE INDEX IF NOT EXISTS idx_candles_asset_timeframe_timestamp 
ON candles(asset_id, timeframe, timestamp DESC);

-- Índice para trades expirados (usado pela edge function)
CREATE INDEX IF NOT EXISTS idx_trades_expired_open 
ON trades(status, expires_at) 
WHERE status = 'open';

-- Índice para queries de candles (sem predicate para evitar erro de imutabilidade)
CREATE INDEX IF NOT EXISTS idx_candles_recent 
ON candles(asset_id, timeframe, timestamp DESC);

-- 2. TRIGGER PARA GERENCIAR SALDO AUTOMATICAMENTE
-- ============================================================================

-- Function para atualizar saldo quando trade é criado
CREATE OR REPLACE FUNCTION handle_trade_balance_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deduzir o valor do trade do saldo apropriado
  IF NEW.is_demo THEN
    UPDATE profiles
    SET demo_balance = demo_balance - NEW.amount
    WHERE user_id = NEW.user_id;
  ELSE
    UPDATE profiles
    SET balance = balance - NEW.amount
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function para atualizar saldo quando trade é finalizado
CREATE OR REPLACE FUNCTION handle_trade_balance_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só processar quando status mudar de 'open' para 'won' ou 'lost'
  IF OLD.status = 'open' AND (NEW.status = 'won' OR NEW.status = 'lost') THEN
    -- Adicionar o resultado ao saldo apropriado
    IF NEW.is_demo THEN
      UPDATE profiles
      SET demo_balance = demo_balance + COALESCE(NEW.result, 0)
      WHERE user_id = NEW.user_id;
    ELSE
      UPDATE profiles
      SET balance = balance + COALESCE(NEW.result, 0)
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar triggers
DROP TRIGGER IF EXISTS trigger_trade_balance_insert ON trades;
CREATE TRIGGER trigger_trade_balance_insert
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION handle_trade_balance_on_insert();

DROP TRIGGER IF EXISTS trigger_trade_balance_update ON trades;
CREATE TRIGGER trigger_trade_balance_update
  AFTER UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION handle_trade_balance_on_update();

-- 3. FUNÇÃO PARA PROCESSAR TRADES EXPIRADOS (MAIS EFICIENTE)
-- ============================================================================

CREATE OR REPLACE FUNCTION process_single_expired_trade(p_trade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade record;
  v_exit_price numeric;
  v_result numeric;
  v_status text;
BEGIN
  -- Buscar o trade com lock para evitar race conditions
  SELECT * INTO v_trade
  FROM trades
  WHERE id = p_trade_id
    AND status = 'open'
  FOR UPDATE;
  
  -- Se não encontrou ou já foi processado, retornar
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Trade not found or already processed'
    );
  END IF;
  
  -- Buscar preço de saída
  SELECT close INTO v_exit_price
  FROM candles
  WHERE asset_id = v_trade.asset_id
    AND timestamp <= v_trade.expires_at
    AND timeframe = '1m'
  ORDER BY timestamp DESC
  LIMIT 1;
  
  -- Se não encontrou preço, usar o preço de entrada
  IF v_exit_price IS NULL THEN
    v_exit_price := v_trade.entry_price;
  END IF;
  
  -- Determinar resultado
  IF v_trade.trade_type = 'call' THEN
    v_status := CASE WHEN v_exit_price > v_trade.entry_price THEN 'won' ELSE 'lost' END;
  ELSE
    v_status := CASE WHEN v_exit_price < v_trade.entry_price THEN 'won' ELSE 'lost' END;
  END IF;
  
  -- Calcular resultado financeiro
  IF v_status = 'won' THEN
    v_result := v_trade.amount + v_trade.payout;
  ELSE
    v_result := 0;
  END IF;
  
  -- Atualizar trade (o trigger vai atualizar o saldo automaticamente)
  UPDATE trades
  SET 
    status = v_status,
    exit_price = v_exit_price,
    result = v_result,
    closed_at = NOW()
  WHERE id = v_trade.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade.id,
    'status', v_status,
    'result', v_result
  );
END;
$$;