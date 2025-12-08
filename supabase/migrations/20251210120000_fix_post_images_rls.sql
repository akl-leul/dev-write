-- Fix RLS policies for post_images to allow inserting images
-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert images for their own posts" ON public.post_images;
DROP POLICY IF EXISTS "Authenticated users can insert post images" ON public.post_images;
DROP POLICY IF EXISTS "Users can update images for their own posts" ON public.post_images;
DROP POLICY IF EXISTS "Users can delete images for their own posts" ON public.post_images;

-- Create a function to insert post images (bypasses RLS but verifies ownership)
-- This solves the transaction isolation issue where RLS can't see newly created posts
CREATE OR REPLACE FUNCTION public.insert_post_image(
  p_post_id UUID,
  p_url TEXT,
  p_order_index INTEGER DEFAULT 0
)
RETURNS TABLE(id UUID, url TEXT, order_index INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id UUID;
  v_inserted_id UUID;
BEGIN
  -- Verify the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You must be authenticated to insert images';
  END IF;

  -- Verify the post exists and the user is the author
  SELECT author_id INTO v_author_id
  FROM public.posts
  WHERE id = p_post_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  IF v_author_id != auth.uid() THEN
    RAISE EXCEPTION 'You do not have permission to add images to this post';
  END IF;

  -- Insert the image (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.post_images (post_id, url, order_index)
  VALUES (p_post_id, p_url, p_order_index)
  RETURNING post_images.id, post_images.url, post_images.order_index
  INTO v_inserted_id, url, order_index;

  id := v_inserted_id;
  RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_post_image(UUID, TEXT, INTEGER) TO authenticated;

-- Allow authenticated users to insert post_images for posts they own
-- This policy is kept as a fallback, but the function above is preferred
CREATE POLICY "Users can insert images for their own posts"
  ON public.post_images FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 
      FROM public.posts 
      WHERE posts.id = post_images.post_id 
        AND posts.author_id = auth.uid()
    )
  );

-- Users can update images for their own posts
CREATE POLICY "Users can update images for their own posts"
  ON public.post_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_images.post_id AND posts.author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_images.post_id AND posts.author_id = auth.uid()
    )
  );

-- Users can delete images for their own posts
CREATE POLICY "Users can delete images for their own posts"
  ON public.post_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_images.post_id AND posts.author_id = auth.uid()
    )
  );

