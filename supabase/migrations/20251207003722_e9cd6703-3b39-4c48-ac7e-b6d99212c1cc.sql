-- Tabela para solicitações de Copy Trader
CREATE TABLE public.copy_trade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  description TEXT,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para Copy Traders aprovados
CREATE TABLE public.copy_traders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  description TEXT,
  total_followers INTEGER DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para seguidores de Copy Trade
CREATE TABLE public.copy_trade_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_trader_id UUID NOT NULL REFERENCES public.copy_traders(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL,
  allocation_percentage NUMERIC NOT NULL DEFAULT 100 CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  max_trade_amount NUMERIC,
  is_active BOOLEAN DEFAULT true,
  total_copied_trades INTEGER DEFAULT 0,
  total_profit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(copy_trader_id, follower_user_id)
);

-- Tabela para histórico de trades copiados
CREATE TABLE public.copied_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  copy_trader_id UUID NOT NULL REFERENCES public.copy_traders(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL,
  copied_trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'skipped')),
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.copy_trade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_traders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_trade_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copied_trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for copy_trade_requests
CREATE POLICY "Users can create their own requests" ON public.copy_trade_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests" ON public.copy_trade_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all requests" ON public.copy_trade_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for copy_traders
CREATE POLICY "Everyone can view active copy traders" ON public.copy_traders
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their own copy trader profile" ON public.copy_traders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own copy trader profile" ON public.copy_traders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all copy traders" ON public.copy_traders
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for copy_trade_followers
CREATE POLICY "Copy traders can manage their followers" ON public.copy_trade_followers
  FOR ALL USING (
    copy_trader_id IN (SELECT id FROM public.copy_traders WHERE user_id = auth.uid())
  );

CREATE POLICY "Followers can view their own subscriptions" ON public.copy_trade_followers
  FOR SELECT USING (auth.uid() = follower_user_id);

CREATE POLICY "Admins can manage all followers" ON public.copy_trade_followers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for copied_trades
CREATE POLICY "Users can view their own copied trades" ON public.copied_trades
  FOR SELECT USING (auth.uid() = follower_user_id);

CREATE POLICY "Copy traders can view copies of their trades" ON public.copied_trades
  FOR SELECT USING (
    copy_trader_id IN (SELECT id FROM public.copy_traders WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all copied trades" ON public.copied_trades
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update timestamps
CREATE TRIGGER update_copy_trade_requests_updated_at
  BEFORE UPDATE ON public.copy_trade_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_copy_traders_updated_at
  BEFORE UPDATE ON public.copy_traders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_copy_trade_followers_updated_at
  BEFORE UPDATE ON public.copy_trade_followers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to process copy trades when a master trader opens a trade
CREATE OR REPLACE FUNCTION public.process_copy_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copy_trader RECORD;
  v_follower RECORD;
  v_follower_balance NUMERIC;
  v_copy_amount NUMERIC;
  v_new_trade_id UUID;
BEGIN
  -- Only process new trades (INSERT) that are not demo trades
  IF TG_OP = 'INSERT' AND NEW.is_demo = false AND NEW.status = 'open' THEN
    
    -- Check if the user is a copy trader
    SELECT * INTO v_copy_trader
    FROM copy_traders
    WHERE user_id = NEW.user_id AND is_active = true;
    
    IF FOUND THEN
      -- Loop through all active followers
      FOR v_follower IN
        SELECT ctf.*, p.balance, p.user_id as profile_user_id
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
        
        -- Check if follower has enough balance
        IF v_follower.balance >= v_copy_amount THEN
          -- Create the copied trade
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
            false,
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
          SET total_copied_trades = total_copied_trades + 1
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
      SET total_trades = total_trades + 1
      WHERE id = v_copy_trader.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to process copy trades
CREATE TRIGGER on_trade_created_copy
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.process_copy_trade();

-- Enable realtime for copy trade tables
ALTER PUBLICATION supabase_realtime ADD TABLE copy_trade_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE copy_traders;
ALTER PUBLICATION supabase_realtime ADD TABLE copy_trade_followers;