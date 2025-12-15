-- Add signup banner setting to platform_settings
INSERT INTO public.platform_settings (key, value, description)
VALUES ('signup_banner_url', '', 'URL da imagem do banner de cadastro')
ON CONFLICT (key) DO NOTHING;

-- Create storage policy for signup banners in the existing popup-images bucket (reusing it)
-- Or we can use chart-backgrounds bucket which is already public
-- Let's add a policy to allow admins to upload signup banners
CREATE POLICY "Admins can upload signup banners"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'popup-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update signup banners"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'popup-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete signup banners"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'popup-images' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);