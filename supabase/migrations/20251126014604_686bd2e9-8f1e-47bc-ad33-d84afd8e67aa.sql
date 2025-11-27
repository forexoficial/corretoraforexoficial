-- Create chart appearance settings table
CREATE TABLE IF NOT EXISTS public.chart_appearance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Chart background
  chart_bg_color TEXT NOT NULL DEFAULT '#0a0a0a',
  chart_text_color TEXT NOT NULL DEFAULT '#d1d4dc',
  
  -- Grid colors
  grid_vert_color TEXT NOT NULL DEFAULT '#1e1e1e',
  grid_horz_color TEXT NOT NULL DEFAULT '#1e1e1e',
  
  -- Candle colors
  candle_up_color TEXT NOT NULL DEFAULT '#22c55e',
  candle_down_color TEXT NOT NULL DEFAULT '#ef4444',
  
  -- Price scale
  price_scale_border_color TEXT NOT NULL DEFAULT '#2B2B43',
  
  -- Time scale
  time_scale_border_color TEXT NOT NULL DEFAULT '#2B2B43',
  
  -- World map settings
  map_enabled BOOLEAN NOT NULL DEFAULT true,
  map_opacity NUMERIC NOT NULL DEFAULT 0.08,
  map_primary_color TEXT NOT NULL DEFAULT '#6366f1',
  map_secondary_color TEXT NOT NULL DEFAULT '#8b5cf6',
  map_show_grid BOOLEAN NOT NULL DEFAULT true,
  map_grid_opacity NUMERIC NOT NULL DEFAULT 0.4,
  
  -- Additional settings
  crosshair_color TEXT NOT NULL DEFAULT '#758696',
  watermark_visible BOOLEAN NOT NULL DEFAULT false,
  watermark_text TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.chart_appearance_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins can manage
CREATE POLICY "Admins can manage chart appearance"
ON public.chart_appearance_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Everyone can view (needed for charts to load)
CREATE POLICY "Everyone can view chart appearance"
ON public.chart_appearance_settings
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_chart_appearance_updated_at
  BEFORE UPDATE ON public.chart_appearance_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO public.chart_appearance_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.chart_appearance_settings IS 'Configurações de aparência do gráfico gerenciadas pelo admin';