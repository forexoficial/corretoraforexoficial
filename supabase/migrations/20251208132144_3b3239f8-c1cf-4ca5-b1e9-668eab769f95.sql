-- Atualizar a função process_copy_trade para suportar trades demo e real
CREATE OR REPLACE FUNCTION public.process_copy_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_copy_trader RECORD;
  v_follower RECORD;
  v_follower_balance NUMERIC;
  v_copy_amount NUMERIC;
  v_new_trade_id UUID;
BEGIN
  -- Only process new trades (INSERT) with status 'open'
  IF TG_OP = 'INSERT' AND NEW.status = 'open' THEN
    
    -- Check if the user is an active copy trader
    SELECT * INTO v_copy_trader
    FROM copy_traders
    WHERE user_id = NEW.user_id AND is_active = true;
    
    IF FOUND THEN
      -- Loop through all active followers
      FOR v_follower IN
        SELECT 
          ctf.*, 
          CASE 
            WHEN NEW.is_demo THEN p.demo_balance 
            ELSE p.balance 
          END as available_balance,
          p.user_id as profile_user_id
        FROM copy_trade_followers ctf
        JOIN profiles p ON p.user_id = ctf.follower_user_id
        WHERE ctf.copy_trader_id = v_copy_trader.id
          AND ctf.is_active = true
      LOOP
        -- Calculate copy amount based on allocation percentage
        v_copy_amount := NEW.amount * (v_follower.allocation_percentage / 100);
        
        -- Apply max trade amount limit if set
        IF v_follower.max_trade_amount IS NOT NULL AND v_copy_amount > v_follower.max_trade_amount THEN
          v_copy_amount := v_follower.max_trade_amount;
        END IF;
        
        -- Check if follower has enough balance (demo or real based on original trade)
        IF v_follower.available_balance >= v_copy_amount THEN
          -- Create the copied trade (same mode as original - demo or real)
          INSERT INTO trades (
            user_id, asset_id, trade_type, amount, payout, 
            duration_minutes, entry_price, expires_at, is_demo, status
          )
          VALUES (
            v_follower.follower_user_id,
            NEW.asset_id,
            NEW.trade_type,
            v_copy_amount,
            v_copy_amount * (NEW.payout / NEW.amount),
            NEW.duration_minutes,
            NEW.entry_price,
            NEW.expires_at,
            NEW.is_demo, -- Manter o mesmo modo (demo ou real)
            'open'
          )
          RETURNING id INTO v_new_trade_id;
          
          -- Record the copied trade
          INSERT INTO copied_trades (
            original_trade_id, copy_trader_id, follower_user_id, 
            copied_trade_id, status
          )
          VALUES (
            NEW.id, v_copy_trader.id, v_follower.follower_user_id,
            v_new_trade_id, 'executed'
          );
          
          -- Update follower stats
          UPDATE copy_trade_followers
          SET total_copied_trades = COALESCE(total_copied_trades, 0) + 1
          WHERE id = v_follower.id;
          
        ELSE
          -- Record skipped trade due to insufficient balance
          INSERT INTO copied_trades (
            original_trade_id, copy_trader_id, follower_user_id,
            status, failure_reason
          )
          VALUES (
            NEW.id, v_copy_trader.id, v_follower.follower_user_id,
            'skipped', 'Insufficient balance'
          );
        END IF;
      END LOOP;
      
      -- Update copy trader stats
      UPDATE copy_traders
      SET total_trades = COALESCE(total_trades, 0) + 1
      WHERE id = v_copy_trader.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;