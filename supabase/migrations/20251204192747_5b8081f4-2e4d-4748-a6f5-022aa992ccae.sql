-- Add responsive mode columns for chart dimensions
ALTER TABLE public.chart_appearance_settings 
ADD COLUMN IF NOT EXISTS chart_responsive_desktop boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS chart_responsive_mobile boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS chart_responsive_fullscreen boolean DEFAULT true;