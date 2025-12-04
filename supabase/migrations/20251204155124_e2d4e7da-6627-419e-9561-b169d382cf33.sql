-- Add column to control TradingView logo visibility
ALTER TABLE public.chart_appearance_settings 
ADD COLUMN IF NOT EXISTS show_tradingview_logo boolean DEFAULT false;