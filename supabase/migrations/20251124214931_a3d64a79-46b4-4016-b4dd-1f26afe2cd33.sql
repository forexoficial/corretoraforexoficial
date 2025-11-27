-- Create table for custom affiliate links
CREATE TABLE public.affiliate_custom_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  custom_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_custom_links_slug_unique UNIQUE (custom_slug)
);

-- Enable RLS
ALTER TABLE public.affiliate_custom_links ENABLE ROW LEVEL SECURITY;

-- Affiliates can view their own custom links
CREATE POLICY "Affiliates can view their own custom links"
ON public.affiliate_custom_links
FOR SELECT
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- Affiliates can create their own custom links
CREATE POLICY "Affiliates can create their own custom links"
ON public.affiliate_custom_links
FOR INSERT
WITH CHECK (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- Affiliates can update their own custom links
CREATE POLICY "Affiliates can update their own custom links"
ON public.affiliate_custom_links
FOR UPDATE
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- Affiliates can delete their own custom links
CREATE POLICY "Affiliates can delete their own custom links"
ON public.affiliate_custom_links
FOR DELETE
USING (
  affiliate_id IN (
    SELECT id FROM public.affiliates WHERE user_id = auth.uid()
  )
);

-- Admins can manage all custom links
CREATE POLICY "Admins can manage all custom links"
ON public.affiliate_custom_links
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_affiliate_custom_links_updated_at
BEFORE UPDATE ON public.affiliate_custom_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_affiliate_custom_links_affiliate_id ON public.affiliate_custom_links(affiliate_id);
CREATE INDEX idx_affiliate_custom_links_slug ON public.affiliate_custom_links(custom_slug);