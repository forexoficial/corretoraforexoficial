-- Create boosters table for admin to manage booster offers
CREATE TABLE public.boosters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  payout_increase_percentage INTEGER NOT NULL CHECK (payout_increase_percentage > 0 AND payout_increase_percentage <= 100),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  icon TEXT DEFAULT 'Zap',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_boosters table to track active boosters for users
CREATE TABLE public.user_boosters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  booster_id UUID NOT NULL REFERENCES public.boosters(id) ON DELETE CASCADE,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  payout_increase_percentage INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_boosters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for boosters
CREATE POLICY "Boosters are viewable by everyone"
ON public.boosters
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage boosters"
ON public.boosters
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_boosters
CREATE POLICY "Users can view their own active boosters"
ON public.user_boosters
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boosters"
ON public.user_boosters
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all user boosters"
ON public.user_boosters
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_user_boosters_user_id ON public.user_boosters(user_id);
CREATE INDEX idx_user_boosters_expires_at ON public.user_boosters(expires_at);
CREATE INDEX idx_user_boosters_active ON public.user_boosters(is_active) WHERE is_active = true;
CREATE INDEX idx_boosters_active ON public.boosters(is_active) WHERE is_active = true;

-- Trigger to update updated_at
CREATE TRIGGER update_boosters_updated_at
BEFORE UPDATE ON public.boosters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to get active booster for a user
CREATE OR REPLACE FUNCTION public.get_user_active_booster(p_user_id UUID)
RETURNS TABLE (
  payout_increase_percentage INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    payout_increase_percentage,
    expires_at
  FROM user_boosters
  WHERE user_id = p_user_id
    AND is_active = true
    AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;
$$;

-- Function to deactivate expired boosters (can be called by cron or manually)
CREATE OR REPLACE FUNCTION public.deactivate_expired_boosters()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_boosters
  SET is_active = false
  WHERE is_active = true
    AND expires_at <= now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Insert default boosters
INSERT INTO public.boosters (name, description, payout_increase_percentage, duration_minutes, price, icon, display_order) VALUES
('Booster Básico', 'Aumente seu payout em 5% por 30 minutos', 5, 30, 25, 'Zap', 1),
('Booster Pro', 'Aumente seu payout em 10% por 1 hora', 10, 60, 50, 'TrendingUp', 2),
('Booster Premium', 'Aumente seu payout em 15% por 2 horas', 15, 120, 90, 'Rocket', 3);

-- Comments
COMMENT ON TABLE public.boosters IS 'Booster offers that can be purchased by users to temporarily increase payout';
COMMENT ON TABLE public.user_boosters IS 'Active boosters purchased by users';
COMMENT ON FUNCTION public.get_user_active_booster IS 'Returns the active booster for a user if exists';
COMMENT ON FUNCTION public.deactivate_expired_boosters IS 'Deactivates expired boosters. Should be called periodically.';
