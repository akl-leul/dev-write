-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can read published posts" ON public.posts;
DROP POLICY IF EXISTS "Users can read their own posts" ON public.posts;
DROP POLICY IF EXISTS "Bypass RLS for testing" ON public.posts;
DROP POLICY IF EXISTS "Allow anonymous user posts" ON public.posts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.posts;
DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can manage their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can read approved comments" ON public.comments;
DROP POLICY IF EXISTS "Users can read their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;

-- Enable RLS on all tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies for posts
CREATE POLICY "Users can create their own posts" ON public.posts
FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts" ON public.posts
FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Users can read published posts" ON public.posts
FOR SELECT USING (status = 'published');

CREATE POLICY "Users can read their own posts" ON public.posts
FOR SELECT USING (auth.uid() = author_id);

-- Policies for bookmarks
CREATE POLICY "Users can manage their own bookmarks" ON public.bookmarks
FOR ALL USING (auth.uid() = user_id);

-- Policies for likes
CREATE POLICY "Users can manage their own likes" ON public.likes
FOR ALL USING (auth.uid() = user_id);

-- Policies for comments
CREATE POLICY "Users can create comments" ON public.comments
FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments" ON public.comments
FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Users can read approved comments" ON public.comments
FOR SELECT USING (approved = true);

CREATE POLICY "Users can read their own comments" ON public.comments
FOR SELECT USING (auth.uid() = author_id);

-- Policies for notifications
CREATE POLICY "Users can manage their own notifications" ON public.notifications
FOR ALL USING (auth.uid() = user_id);
