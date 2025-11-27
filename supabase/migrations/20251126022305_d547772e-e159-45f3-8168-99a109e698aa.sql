-- Add dark mode color columns to chart_appearance_settings
ALTER TABLE chart_appearance_settings 
ADD COLUMN chart_bg_color_dark text DEFAULT '#0a0a0a',
ADD COLUMN chart_text_color_dark text DEFAULT '#d1d4dc',
ADD COLUMN grid_vert_color_dark text DEFAULT '#1e1e1e',
ADD COLUMN grid_horz_color_dark text DEFAULT '#1e1e1e',
ADD COLUMN candle_up_color_dark text DEFAULT '#22c55e',
ADD COLUMN candle_down_color_dark text DEFAULT '#ef4444',
ADD COLUMN price_scale_border_color_dark text DEFAULT '#2B2B43',
ADD COLUMN time_scale_border_color_dark text DEFAULT '#2B2B43',
ADD COLUMN crosshair_color_dark text DEFAULT '#758696';

-- Add light mode color columns (for when user is in light mode)
ALTER TABLE chart_appearance_settings 
ADD COLUMN chart_bg_color_light text DEFAULT '#ffffff',
ADD COLUMN chart_text_color_light text DEFAULT '#1a1a1a',
ADD COLUMN grid_vert_color_light text DEFAULT '#e5e5e5',
ADD COLUMN grid_horz_color_light text DEFAULT '#e5e5e5',
ADD COLUMN candle_up_color_light text DEFAULT '#22c55e',
ADD COLUMN candle_down_color_light text DEFAULT '#ef4444',
ADD COLUMN price_scale_border_color_light text DEFAULT '#d1d5db',
ADD COLUMN time_scale_border_color_light text DEFAULT '#d1d5db',
ADD COLUMN crosshair_color_light text DEFAULT '#6b7280';

-- Comment explaining the structure
COMMENT ON COLUMN chart_appearance_settings.chart_bg_color IS 'Default chart background color (legacy)';
COMMENT ON COLUMN chart_appearance_settings.chart_bg_color_dark IS 'Chart background color for dark mode';
COMMENT ON COLUMN chart_appearance_settings.chart_bg_color_light IS 'Chart background color for light mode';