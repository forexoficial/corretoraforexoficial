-- Create assets table for trading instruments
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  payout_percentage INTEGER NOT NULL DEFAULT 91,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trades table for trading operations
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  trade_type TEXT NOT NULL CHECK (trade_type IN ('call', 'put')),
  amount DECIMAL(10, 2) NOT NULL,
  payout DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  result DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Assets policies (public read)
CREATE POLICY "Assets are viewable by everyone"
ON public.assets FOR SELECT
USING (true);

-- Trades policies (users can only see their own trades)
CREATE POLICY "Users can view their own trades"
ON public.trades FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trades"
ON public.trades FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
ON public.trades FOR UPDATE
USING (auth.uid() = user_id);

-- Insert sample assets
INSERT INTO public.assets (name, symbol, icon_url, payout_percentage) VALUES
('USD/CHF (OTC)', 'USD-CHF-OTC', 'https://flowsysob.nyc3.cdn.digitaloceanspaces.com/allbuckets-1750773114361/01K862PM08XKKRHDN3Y5X4SK9C.png', 91),
('EUR/CHF (OTC)', 'EUR-CHF-OTC', 'https://flowsysob.nyc3.cdn.digitaloceanspaces.com/allbuckets-1750773114361/01K862PM08XKKRHDN3Y5X4SK9C.png', 88),
('Bitcoin (OTC)', 'BTC-OTC', 'https://flowsysob.nyc3.cdn.digitaloceanspaces.com/allbuckets-1750773114361/01K862PM08XKKRHDN3Y5X4SK9C.png', 89);

-- Create index for better performance
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_status ON public.trades(status);
CREATE INDEX idx_trades_created_at ON public.trades(created_at DESC);