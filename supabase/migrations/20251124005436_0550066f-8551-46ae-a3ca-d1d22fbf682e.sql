-- Create platform_popups table
CREATE TABLE public.platform_popups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_popups ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage popups
CREATE POLICY "Admins can manage popups"
ON public.platform_popups
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy for authenticated users to view active popups
CREATE POLICY "Users can view active popups"
ON public.platform_popups
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now())
);

-- Trigger to update updated_at
CREATE TRIGGER update_platform_popups_updated_at
BEFORE UPDATE ON public.platform_popups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();