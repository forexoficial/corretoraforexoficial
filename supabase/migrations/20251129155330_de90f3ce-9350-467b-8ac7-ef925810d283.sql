-- Redefine balance update trigger to use net trade result (profit or loss)
CREATE OR REPLACE FUNCTION public.handle_trade_balance_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when trade closes (status changes from open to won/lost)
  IF NEW.status IN ('won', 'lost') AND OLD.status = 'open' THEN
    IF NEW.is_demo THEN
      -- NEW.result already represents the net result:
      --   won  => +payout (profit)
      --   lost => -amount (loss)
      UPDATE public.profiles 
      SET demo_balance = demo_balance + COALESCE(NEW.result, 0),
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      UPDATE public.profiles 
      SET balance = balance + COALESCE(NEW.result, 0),
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Make affiliate commission processing compatible with won/lost statuses
CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id uuid;
  v_affiliate_id uuid;
  v_commission_percentage numeric;
  v_trade_result numeric;
  v_commission_amount numeric;
  v_transaction_id uuid;
BEGIN
  -- Only process once when trade closes (from open to won/lost) and result is set
  IF NEW.status IN ('won', 'lost') AND NEW.result IS NOT NULL AND OLD.status = 'open' THEN
    
    -- Check if this user was referred by an affiliate
    SELECT id, affiliate_id INTO v_referral_id, v_affiliate_id
    FROM public.referrals
    WHERE referred_user_id = NEW.user_id
      AND status = 'active'
    LIMIT 1;
    
    -- If user has an active referral
    IF v_referral_id IS NOT NULL THEN
      
      -- Get affiliate commission percentage
      SELECT commission_percentage INTO v_commission_percentage
      FROM public.affiliates
      WHERE id = v_affiliate_id
        AND is_active = true;
      
      IF v_commission_percentage IS NOT NULL THEN
        
        -- NEW.result is the net result: positive = user profit, negative = user loss
        v_trade_result := NEW.result;
        
        -- Calculate commission:
        -- If user lost (negative result), affiliate earns commission (positive)
        -- If user won (positive result), affiliate pays commission (negative)
        v_commission_amount := (v_trade_result * -1) * (v_commission_percentage / 100);
        
        -- Create transaction record for tracking (optional)
        INSERT INTO public.transactions (user_id, type, amount, status, notes)
        VALUES (
          NEW.user_id,
          'commission',
          ABS(v_commission_amount),
          'completed',
          CASE 
            WHEN v_commission_amount > 0 THEN 'Comissão de afiliado gerada'
            ELSE 'Dedução de comissão de afiliado'
          END
        )
        RETURNING id INTO v_transaction_id;
        
        -- Create commission record (can be positive or negative)
        INSERT INTO public.commissions (
          affiliate_id,
          referral_id,
          amount,
          transaction_id
        ) VALUES (
          v_affiliate_id,
          v_referral_id,
          v_commission_amount,
          v_transaction_id
        );
        
        -- Update affiliate total_commission
        UPDATE public.affiliates
        SET 
          total_commission = COALESCE(total_commission, 0) + v_commission_amount,
          updated_at = now()
        WHERE id = v_affiliate_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger on trades still points to the (possibly redefined) function
DROP TRIGGER IF EXISTS trigger_trade_balance_update ON public.trades;
CREATE TRIGGER trigger_trade_balance_update
  AFTER UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trade_balance_on_update();

DROP TRIGGER IF EXISTS trigger_process_affiliate_commission ON public.trades;
CREATE TRIGGER trigger_process_affiliate_commission
  AFTER UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.process_affiliate_commission();

-- Normalize historical trades: result = net profit/loss
-- WON  => +payout (profit only)
-- LOST => -amount (loss)
UPDATE public.trades
SET result = CASE
  WHEN status = 'won'  THEN payout
  WHEN status = 'lost' THEN -amount
  ELSE result
END
WHERE status IN ('won', 'lost')
  AND closed_at IS NOT NULL;