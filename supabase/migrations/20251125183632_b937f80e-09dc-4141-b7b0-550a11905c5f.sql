-- Create function to calculate and create affiliate commission when trade closes
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
  -- Only process when trade is closed and result is set
  IF NEW.status = 'closed' AND NEW.result IS NOT NULL AND OLD.status != 'closed' THEN
    
    -- Check if this user was referred by an affiliate
    SELECT id, affiliate_id INTO v_referral_id, v_affiliate_id
    FROM referrals
    WHERE referred_user_id = NEW.user_id
    AND status = 'active'
    LIMIT 1;
    
    -- If user has an active referral
    IF v_referral_id IS NOT NULL THEN
      
      -- Get affiliate commission percentage
      SELECT commission_percentage INTO v_commission_percentage
      FROM affiliates
      WHERE id = v_affiliate_id
      AND is_active = true;
      
      IF v_commission_percentage IS NOT NULL THEN
        
        -- Calculate trade result (negative = user lost, positive = user won)
        v_trade_result := NEW.result;
        
        -- Calculate commission:
        -- If user lost (negative result), affiliate earns commission
        -- If user won (positive result), affiliate pays commission (negative value)
        v_commission_amount := (v_trade_result * -1) * (v_commission_percentage / 100);
        
        -- Create transaction record for tracking (optional)
        INSERT INTO transactions (user_id, type, amount, status, notes)
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
        INSERT INTO commissions (
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
        UPDATE affiliates
        SET 
          total_commission = COALESCE(total_commission, 0) + v_commission_amount,
          updated_at = now()
        WHERE id = v_affiliate_id;
        
        RAISE NOTICE 'Commission processed: affiliate_id=%, amount=%, trade_result=%', 
          v_affiliate_id, v_commission_amount, v_trade_result;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on trades table
DROP TRIGGER IF EXISTS trigger_process_affiliate_commission ON trades;

CREATE TRIGGER trigger_process_affiliate_commission
AFTER UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION process_affiliate_commission();

-- Add comment to explain the commission logic
COMMENT ON FUNCTION public.process_affiliate_commission() IS 
'Calculates affiliate commission based on referred user trade results. 
When referred user loses, affiliate earns commission (positive). 
When referred user wins, affiliate pays commission (negative).';
