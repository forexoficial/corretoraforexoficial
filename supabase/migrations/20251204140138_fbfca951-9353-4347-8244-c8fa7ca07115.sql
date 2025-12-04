-- Add chart dimension settings columns
ALTER TABLE public.chart_appearance_settings
ADD COLUMN IF NOT EXISTS chart_height_desktop integer DEFAULT 600,
ADD COLUMN IF NOT EXISTS chart_height_mobile integer DEFAULT 350,
ADD COLUMN IF NOT EXISTS chart_width_percentage_desktop integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS chart_width_percentage_mobile integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS chart_aspect_ratio_desktop text DEFAULT '16:9',
ADD COLUMN IF NOT EXISTS chart_aspect_ratio_mobile text DEFAULT '4:3';

-- Add comments for documentation
COMMENT ON COLUMN public.chart_appearance_settings.chart_height_desktop IS 'Chart height in pixels for desktop';
COMMENT ON COLUMN public.chart_appearance_settings.chart_height_mobile IS 'Chart height in pixels for mobile';
COMMENT ON COLUMN public.chart_appearance_settings.chart_width_percentage_desktop IS 'Chart width percentage for desktop (1-100)';
COMMENT ON COLUMN public.chart_appearance_settings.chart_width_percentage_mobile IS 'Chart width percentage for mobile (1-100)';
COMMENT ON COLUMN public.chart_appearance_settings.chart_aspect_ratio_desktop IS 'Chart aspect ratio for desktop';
COMMENT ON COLUMN public.chart_appearance_settings.chart_aspect_ratio_mobile IS 'Chart aspect ratio for mobile';