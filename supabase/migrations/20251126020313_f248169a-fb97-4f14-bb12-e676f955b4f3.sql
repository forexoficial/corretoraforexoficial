-- Add map image URL column to chart_appearance_settings
ALTER TABLE chart_appearance_settings 
ADD COLUMN map_image_url text;

-- Create storage bucket for chart backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('chart-backgrounds', 'chart-backgrounds', true);

-- Create RLS policies for chart-backgrounds bucket
CREATE POLICY "Admins can upload chart backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chart-backgrounds' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update chart backgrounds"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chart-backgrounds' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete chart backgrounds"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chart-backgrounds' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Everyone can view chart backgrounds"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chart-backgrounds');