-- Create weekly_leaders table for admin-managed ranking
CREATE TABLE public.weekly_leaders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_leaders ENABLE ROW LEVEL SECURITY;

-- Everyone can view active leaders
CREATE POLICY "Anyone can view active weekly leaders"
ON public.weekly_leaders
FOR SELECT
USING (is_active = true);

-- Only admins can manage leaders
CREATE POLICY "Admins can manage weekly leaders"
ON public.weekly_leaders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_weekly_leaders_updated_at
BEFORE UPDATE ON public.weekly_leaders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default leaders
INSERT INTO public.weekly_leaders (display_name, balance, position) VALUES
('João Silva', 15847.50, 1),
('Maria Santos', 12563.80, 2),
('Carlos Oliveira', 9875.25, 3),
('Ana Costa', 7432.90, 4),
('Pedro Lima', 5621.40, 5);