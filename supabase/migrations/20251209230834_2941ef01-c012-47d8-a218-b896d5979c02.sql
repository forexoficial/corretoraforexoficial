-- Add admin policies for assets table to allow full CRUD operations
CREATE POLICY "Admins can insert assets" 
ON public.assets 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update assets" 
ON public.assets 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete assets" 
ON public.assets 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));