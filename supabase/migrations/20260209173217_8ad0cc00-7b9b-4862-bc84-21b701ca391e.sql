-- Add CPA fields to affiliates table
ALTER TABLE public.affiliates 
ADD COLUMN IF NOT EXISTS commission_model text NOT NULL DEFAULT 'rev',
ADD COLUMN IF NOT EXISTS cpa_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cpa_min_deposit numeric DEFAULT NULL;

-- Add constraint for commission_model
ALTER TABLE public.affiliates 
ADD CONSTRAINT check_commission_model CHECK (commission_model IN ('rev', 'cpa'));

-- Add cpa_paid to referrals table
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS cpa_paid boolean NOT NULL DEFAULT false;

-- Create trigger function for CPA commission on deposit
CREATE OR REPLACE FUNCTION public.process_cpa_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referral RECORD;
  v_affiliate RECORD;
  v_total_deposited numeric;
  v_commission_amount numeric;
BEGIN
  -- Only process when a deposit is completed
  IF NEW.type = 'deposit' AND NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Check if this user was referred
    SELECT r.id, r.affiliate_id, r.cpa_paid
    INTO v_referral
    FROM public.referrals r
    WHERE r.referred_user_id = NEW.user_id
      AND r.status = 'active'
    LIMIT 1;
    
    -- If user has referral and CPA not yet paid
    IF v_referral.id IS NOT NULL AND v_referral.cpa_paid = false THEN
      
      -- Get affiliate info
      SELECT a.id, a.commission_model, a.cpa_value, a.cpa_min_deposit, a.is_active
      INTO v_affiliate
      FROM public.affiliates a
      WHERE a.id = v_referral.affiliate_id;
      
      -- Only process for CPA model affiliates
      IF v_affiliate.commission_model = 'cpa' AND v_affiliate.is_active = true THEN
        
        -- Calculate total deposits for this user
        SELECT COALESCE(SUM(amount), 0) INTO v_total_deposited
        FROM public.transactions
        WHERE user_id = NEW.user_id
          AND type = 'deposit'
          AND status = 'completed';
        
        -- Check if total deposits meet minimum
        IF v_total_deposited >= COALESCE(v_affiliate.cpa_min_deposit, 0) THEN
          
          v_commission_amount := v_affiliate.cpa_value;
          
          -- Create commission record
          INSERT INTO public.commissions (
            affiliate_id,
            referral_id,
            amount
          ) VALUES (
            v_affiliate.id,
            v_referral.id,
            v_commission_amount
          );
          
          -- Update affiliate total_commission
          UPDATE public.affiliates
          SET 
            total_commission = COALESCE(total_commission, 0) + v_commission_amount,
            updated_at = now()
          WHERE id = v_affiliate.id;
          
          -- Mark CPA as paid for this referral
          UPDATE public.referrals
          SET cpa_paid = true
          WHERE id = v_referral.id;
          
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for CPA on transactions
DROP TRIGGER IF EXISTS trigger_process_cpa_commission ON public.transactions;
CREATE TRIGGER trigger_process_cpa_commission
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_cpa_commission();

-- Update REV trigger to skip CPA affiliates
CREATE OR REPLACE FUNCTION public.process_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referral_id uuid;
  v_affiliate_id uuid;
  v_commission_percentage numeric;
  v_commission_model text;
  v_trade_result numeric;
  v_commission_amount numeric;
  v_transaction_id uuid;
BEGIN
  IF NEW.status IN ('won', 'lost') AND NEW.result IS NOT NULL AND OLD.status = 'open' THEN
    
    SELECT id, affiliate_id INTO v_referral_id, v_affiliate_id
    FROM public.referrals
    WHERE referred_user_id = NEW.user_id
      AND status = 'active'
    LIMIT 1;
    
    IF v_referral_id IS NOT NULL THEN
      
      SELECT commission_percentage, commission_model INTO v_commission_percentage, v_commission_model
      FROM public.affiliates
      WHERE id = v_affiliate_id
        AND is_active = true;
      
      -- Only process REV model affiliates
      IF v_commission_percentage IS NOT NULL AND COALESCE(v_commission_model, 'rev') = 'rev' THEN
        
        v_trade_result := NEW.result;
        v_commission_amount := (v_trade_result * -1) * (v_commission_percentage / 100);
        
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
$function$;