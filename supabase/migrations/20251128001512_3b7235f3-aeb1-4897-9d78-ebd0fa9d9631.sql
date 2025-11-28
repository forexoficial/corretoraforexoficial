-- Add candle border settings to chart_appearance_settings table
ALTER TABLE public.chart_appearance_settings
ADD COLUMN IF NOT EXISTS candle_border_visible boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS candle_border_up_color text DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS candle_border_down_color text DEFAULT '#ef4444',
ADD COLUMN IF NOT EXISTS candle_border_width integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS candle_border_up_color_dark text DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS candle_border_down_color_dark text DEFAULT '#ef4444',
ADD COLUMN IF NOT EXISTS candle_border_up_color_light text DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS candle_border_down_color_light text DEFAULT '#ef4444';