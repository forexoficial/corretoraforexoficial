-- Add candle wick color customization to chart_appearance_settings
ALTER TABLE chart_appearance_settings
ADD COLUMN IF NOT EXISTS wick_up_color text DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS wick_down_color text DEFAULT '#ef4444',
ADD COLUMN IF NOT EXISTS wick_up_color_dark text DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS wick_down_color_dark text DEFAULT '#ef4444',
ADD COLUMN IF NOT EXISTS wick_up_color_light text DEFAULT '#22c55e',
ADD COLUMN IF NOT EXISTS wick_down_color_light text DEFAULT '#ef4444';