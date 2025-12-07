-- Add comments_enabled field to posts table
ALTER TABLE public.posts 
ADD COLUMN comments_enabled BOOLEAN DEFAULT true NOT NULL;

-- Create index for comments_enabled for faster queries
CREATE INDEX idx_posts_comments_enabled ON public.posts(comments_enabled);

-- Update RLS policy to include comments_enabled
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON public.posts;
CREATE POLICY "Published posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (status = 'published' OR auth.uid() = author_id);
