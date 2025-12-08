-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Allow anonymous user posts" ON public.posts;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.posts;

-- Create proper policies for anonymous posts
CREATE POLICY "Allow anonymous user posts" ON public.posts
FOR ALL USING (
  auth.uid() IS NULL AND author_id = '00000000-0000-0000-0000-000000000000' OR
  auth.uid() = author_id
);

CREATE POLICY "Enable read access for all users" ON public.posts
FOR SELECT USING (status = 'published');

-- Ensure anonymous user profile exists
INSERT INTO public.profiles (id, full_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'Anonymous User', 
  NOW(), 
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  full_name = 'Anonymous User',
  updated_at = NOW();
