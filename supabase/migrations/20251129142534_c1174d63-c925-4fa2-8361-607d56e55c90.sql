-- Fix trade balance calculation trigger
-- This ensures the balance is correctly updated when trades close

DROP TRIGGER IF EXISTS update_trade_balance ON trades;

CREATE OR REPLACE FUNCTION public.handle_trade_balance_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_balance numeric;
  v_new_balance numeric;
  v_amount numeric;
  v_result numeric;
BEGIN
  -- Only process when trade closes (status changes to won or lost)
  IF NEW.status IN ('won', 'lost') AND OLD.status = 'open' THEN
    -- Convert to numeric to ensure proper calculation
    v_amount := CAST(NEW.amount AS numeric);
    v_result := CAST(COALESCE(NEW.result, 0) AS numeric);
    
    IF NEW.is_demo THEN
      -- Get current balance for logging
      SELECT demo_balance INTO v_old_balance 
      FROM profiles 
      WHERE user_id = NEW.user_id;
      
      -- Update demo balance: deduct investment and add result
      -- If WON: result = amount + payout, so balance = balance - amount + (amount + payout) = balance + payout
      -- If LOST: result = 0, so balance = balance - amount + 0 = balance - amount
      UPDATE profiles 
      SET demo_balance = demo_balance - v_amount + v_result,
          updated_at = now()
      WHERE user_id = NEW.user_id
      RETURNING demo_balance INTO v_new_balance;
      
      RAISE NOTICE 'Trade % closed (DEMO): status=%, old_balance=%, amount=%, result=%, new_balance=%', 
        NEW.id, NEW.status, v_old_balance, v_amount, v_result, v_new_balance;
    ELSE
      -- Get current balance for logging
      SELECT balance INTO v_old_balance 
      FROM profiles 
      WHERE user_id = NEW.user_id;
      
      -- Update real balance: deduct investment and add result
      UPDATE profiles 
      SET balance = balance - v_amount + v_result,
          updated_at = now()
      WHERE user_id = NEW.user_id
      RETURNING balance INTO v_new_balance;
      
      RAISE NOTICE 'Trade % closed (REAL): status=%, old_balance=%, amount=%, result=%, new_balance=%', 
        NEW.id, NEW.status, v_old_balance, v_amount, v_result, v_new_balance;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate trigger
CREATE TRIGGER update_trade_balance
  AFTER UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION handle_trade_balance_on_update();

-- Add helpful comment
COMMENT ON FUNCTION handle_trade_balance_on_update() IS 
'Updates user balance when a trade closes. Formula: balance = balance - amount + result. 
For wins: result = amount + payout (net effect: +payout). 
For losses: result = 0 (net effect: -amount).';