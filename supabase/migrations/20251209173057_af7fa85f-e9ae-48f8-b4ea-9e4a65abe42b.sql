-- Add responsive height offset columns for chart height calculations
ALTER TABLE public.chart_appearance_settings
ADD COLUMN IF NOT EXISTS chart_height_offset_desktop integer DEFAULT 180,
ADD COLUMN IF NOT EXISTS chart_height_offset_mobile integer DEFAULT 160,
ADD COLUMN IF NOT EXISTS chart_height_offset_fullscreen integer DEFAULT 96;