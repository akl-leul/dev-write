-- Create anonymous system user for posts created without authentication
INSERT INTO public.profiles (id, full_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'Anonymous User', 
  NOW(), 
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS for anonymous posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous user to create posts
CREATE POLICY "Allow anonymous user posts" ON public.posts
FOR ALL USING (
  auth.uid() IS NULL OR 
  author_id = '00000000-0000-0000-0000-000000000000' OR
  auth.uid() = author_id
);

-- Create policy to allow anyone to read published posts
CREATE POLICY "Enable read access for all users" ON public.posts
FOR SELECT USING (status = 'published');

-- Create policy for bookmarks to work with anonymous user
CREATE POLICY "Enable bookmark operations" ON public.bookmarks
FOR ALL USING (
  auth.uid() IS NULL OR 
  user_id = '00000000-0000-0000-0000-000000000000' OR
  auth.uid() = user_id
);

-- Create policy for likes to work with anonymous user  
CREATE POLICY "Enable like operations" ON public.likes
FOR ALL USING (
  auth.uid() IS NULL OR 
  user_id = '00000000-0000-0000-0000-000000000000' OR
  auth.uid() = user_id
);

-- Create policy for comments to work with anonymous user
CREATE POLICY "Enable comment operations" ON public.comments
FOR ALL USING (
  auth.uid() IS NULL OR 
  author_id = '00000000-0000-0000-0000-000000000000' OR
  auth.uid() = author_id
);
