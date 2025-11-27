-- Create table for storing chart drawings
CREATE TABLE IF NOT EXISTS public.chart_drawings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  timeframe TEXT NOT NULL,
  drawing_type TEXT NOT NULL CHECK (drawing_type IN ('trendline', 'horizontal', 'vertical', 'rectangle', 'fibonacci')),
  points JSONB NOT NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  line_width INTEGER NOT NULL DEFAULT 2 CHECK (line_width >= 1 AND line_width <= 10),
  line_style TEXT NOT NULL DEFAULT 'solid' CHECK (line_style IN ('solid', 'dashed', 'dotted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chart_drawings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own drawings" 
ON public.chart_drawings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drawings" 
ON public.chart_drawings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drawings" 
ON public.chart_drawings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drawings" 
ON public.chart_drawings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_chart_drawings_user_asset ON public.chart_drawings(user_id, asset_id, timeframe);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chart_drawings_updated_at
BEFORE UPDATE ON public.chart_drawings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();