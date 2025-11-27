-- Create storage bucket for popup images
INSERT INTO storage.buckets (id, name, public)
VALUES ('popup-images', 'popup-images', true);

-- Add RLS policies for popup images
CREATE POLICY "Anyone can view popup images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'popup-images');

CREATE POLICY "Admins can upload popup images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'popup-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update popup images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'popup-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete popup images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'popup-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add image_url and video_url columns to platform_popups
ALTER TABLE public.platform_popups
ADD COLUMN image_url TEXT,
ADD COLUMN video_url TEXT;