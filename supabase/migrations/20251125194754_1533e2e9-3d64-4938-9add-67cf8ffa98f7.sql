-- Create table for storing candle data
CREATE TABLE IF NOT EXISTS public.candles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  timeframe text NOT NULL, -- '1m', '5m', '15m', '1h', '4h', '1d'
  timestamp timestamp with time zone NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume numeric NOT NULL DEFAULT 0,
  is_manipulated boolean NOT NULL DEFAULT false,
  manipulation_type text, -- 'fine_tune', 'full_control', 'bias'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(asset_id, timeframe, timestamp)
);

-- Create table for chart manipulations (admin control)
CREATE TABLE IF NOT EXISTS public.chart_manipulations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  candle_id uuid REFERENCES public.candles(id) ON DELETE CASCADE,
  manipulation_type text NOT NULL, -- 'fine_tune', 'full_control', 'bias'
  original_values jsonb NOT NULL, -- Store original OHLCV
  manipulated_values jsonb NOT NULL, -- Store manipulated OHLCV
  bias_direction text, -- 'up', 'down', 'neutral' for bias type
  bias_strength numeric, -- 1-100 for bias type
  admin_id uuid NOT NULL,
  applied_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone, -- For temporary manipulations
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for chart bias configurations (programmed trends)
CREATE TABLE IF NOT EXISTS public.chart_biases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  name text NOT NULL,
  direction text NOT NULL, -- 'up', 'down', 'neutral'
  strength numeric NOT NULL DEFAULT 50, -- 1-100
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  admin_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_candles_asset_timeframe ON public.candles(asset_id, timeframe, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_candles_timestamp ON public.candles(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chart_manipulations_asset ON public.chart_manipulations(asset_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_chart_manipulations_candle ON public.chart_manipulations(candle_id);
CREATE INDEX IF NOT EXISTS idx_chart_biases_asset ON public.chart_biases(asset_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_chart_biases_active ON public.chart_biases(is_active, start_time, end_time);

-- Enable RLS
ALTER TABLE public.candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_manipulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_biases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for candles (everyone can read, only system can write)
CREATE POLICY "Candles are viewable by everyone"
  ON public.candles FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage candles"
  ON public.candles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for chart_manipulations (only admins)
CREATE POLICY "Admins can view all manipulations"
  ON public.chart_manipulations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create manipulations"
  ON public.chart_manipulations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update manipulations"
  ON public.chart_manipulations FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete manipulations"
  ON public.chart_manipulations FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for chart_biases (only admins)
CREATE POLICY "Admins can view all biases"
  ON public.chart_biases FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create biases"
  ON public.chart_biases FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update biases"
  ON public.chart_biases FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete biases"
  ON public.chart_biases FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for candles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.candles;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_candles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_chart_biases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_candles_updated_at ON public.candles;
CREATE TRIGGER trigger_update_candles_updated_at
  BEFORE UPDATE ON public.candles
  FOR EACH ROW
  EXECUTE FUNCTION update_candles_updated_at();

DROP TRIGGER IF EXISTS trigger_update_chart_biases_updated_at ON public.chart_biases;
CREATE TRIGGER trigger_update_chart_biases_updated_at
  BEFORE UPDATE ON public.chart_biases
  FOR EACH ROW
  EXECUTE FUNCTION update_chart_biases_updated_at();