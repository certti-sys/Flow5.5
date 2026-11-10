-- Create storage bucket for course thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-thumbnails',
  'course-thumbnails',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Policy: Anyone can view course thumbnails
CREATE POLICY "Anyone can view course thumbnails"
ON storage.objects
FOR SELECT
USING (bucket_id = 'course-thumbnails');

-- Policy: Admins can upload course thumbnails
CREATE POLICY "Admins can upload course thumbnails"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'course-thumbnails' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admins can update course thumbnails
CREATE POLICY "Admins can update course thumbnails"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'course-thumbnails' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admins can delete course thumbnails
CREATE POLICY "Admins can delete course thumbnails"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'course-thumbnails' 
  AND has_role(auth.uid(), 'admin'::app_role)
);