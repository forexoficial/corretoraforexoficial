-- Create storage bucket for weekly leaders avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('weekly-leaders-avatars', 'weekly-leaders-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to weekly leaders avatars
CREATE POLICY "Public read access for weekly leaders avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'weekly-leaders-avatars');

-- Allow admins to upload weekly leaders avatars
CREATE POLICY "Admins can upload weekly leaders avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'weekly-leaders-avatars' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins to update weekly leaders avatars
CREATE POLICY "Admins can update weekly leaders avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'weekly-leaders-avatars' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins to delete weekly leaders avatars
CREATE POLICY "Admins can delete weekly leaders avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'weekly-leaders-avatars' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);