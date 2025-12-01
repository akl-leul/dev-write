-- Add approved field to comments table
ALTER TABLE public.comments ADD COLUMN approved boolean NOT NULL DEFAULT false;

-- Drop existing RLS policy for viewing comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

-- Create new RLS policy: users can see their own comments, post authors can see all comments on their posts, others only see approved comments
CREATE POLICY "Users can view comments based on approval status"
ON public.comments
FOR SELECT
USING (
  approved = true
  OR auth.uid() = author_id
  OR auth.uid() IN (
    SELECT author_id FROM posts WHERE posts.id = comments.post_id
  )
);