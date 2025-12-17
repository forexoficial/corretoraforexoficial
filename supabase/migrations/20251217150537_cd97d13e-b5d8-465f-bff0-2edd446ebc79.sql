-- Add column to control daily display frequency for popups
ALTER TABLE public.platform_popups 
ADD COLUMN show_once_per_day boolean DEFAULT false;