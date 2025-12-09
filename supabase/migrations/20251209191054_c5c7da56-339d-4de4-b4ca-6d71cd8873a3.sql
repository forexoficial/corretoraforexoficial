-- Add mobile-specific background image fields
ALTER TABLE public.chart_appearance_settings 
ADD COLUMN IF NOT EXISTS map_image_url_mobile TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS map_image_url_mobile_dark TEXT DEFAULT NULL;

COMMENT ON COLUMN public.chart_appearance_settings.map_image_url_mobile IS 'Background image URL for mobile light mode';
COMMENT ON COLUMN public.chart_appearance_settings.map_image_url_mobile_dark IS 'Background image URL for mobile dark mode';