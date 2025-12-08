-- Fix storage policies to allow anonymous image uploads
-- This fixes the image uploading issue in the CreatePost component

-- Drop existing post-images storage policies
DROP POLICY IF EXISTS "Post images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;

-- Create new policies that allow anonymous uploads for post images
CREATE POLICY "Post images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Anyone can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Anyone can update post images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'post-images');

CREATE POLICY "Anyone can delete post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images');

-- Also update post_images table policies to allow anonymous inserts
DROP POLICY IF EXISTS "Users can insert images for their own posts" ON public.post_images;

CREATE POLICY "Anyone can insert post images"
  ON public.post_images FOR INSERT
  WITH CHECK (true);

-- Update existing policies to allow anonymous access
DROP POLICY IF EXISTS "Users can update images for their own posts" ON public.post_images;
DROP POLICY IF EXISTS "Users can delete images for their own posts" ON public.post_images;

CREATE POLICY "Anyone can update post images"
  ON public.post_images FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete post images"
  ON public.post_images FOR DELETE
  USING (true);
