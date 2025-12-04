-- Add fullscreen-specific chart dimension settings
ALTER TABLE public.chart_appearance_settings
ADD COLUMN IF NOT EXISTS chart_height_fullscreen integer DEFAULT 800,
ADD COLUMN IF NOT EXISTS chart_width_percentage_fullscreen integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS chart_aspect_ratio_fullscreen text DEFAULT '21:9';