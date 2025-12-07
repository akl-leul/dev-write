-- Add color column to tags table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tags' 
        AND column_name = 'color'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tags ADD COLUMN color TEXT DEFAULT '#3B82F6';
    END IF;
END $$;

-- Create post_tags junction table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.post_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

-- Enable RLS on tags if not already enabled
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Tags are viewable by everyone
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON public.tags;
CREATE POLICY "Tags are viewable by everyone"
ON public.tags
FOR SELECT
USING (true);

-- Enable RLS on post_tags if not already enabled
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- Post tags are viewable by everyone
DROP POLICY IF EXISTS "Post tags are viewable by everyone" ON public.post_tags;
CREATE POLICY "Post tags are viewable by everyone"
ON public.post_tags
FOR SELECT
USING (true);

-- Users can insert tags for their own posts
DROP POLICY IF EXISTS "Users can insert tags for their own posts" ON public.post_tags;
CREATE POLICY "Users can insert tags for their own posts"
ON public.post_tags
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.posts
  WHERE posts.id = post_id AND posts.author_id = auth.uid()
));

-- Users can update tags for their own posts
DROP POLICY IF EXISTS "Users can update tags for their own posts" ON public.post_tags;
CREATE POLICY "Users can update tags for their own posts"
ON public.post_tags
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.posts
  WHERE posts.id = post_id AND posts.author_id = auth.uid()
));

-- Users can delete tags for their own posts
DROP POLICY IF EXISTS "Users can delete tags for their own posts" ON public.post_tags;
CREATE POLICY "Users can delete tags for their own posts"
ON public.post_tags
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.posts
  WHERE posts.id = post_id AND posts.author_id = auth.uid()
));

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON public.post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON public.post_tags(tag_id);

-- Insert default tags only if they don't exist
INSERT INTO public.tags (name, slug, color) VALUES
('JavaScript', 'javascript', '#F7DF1E'),
('React', 'react', '#61DAFB'),
('TypeScript', 'typescript', '#3178C6'),
('Node.js', 'nodejs', '#339933'),
('Python', 'python', '#3776AB'),
('Web Development', 'web-development', '#E34C26'),
('Frontend', 'frontend', '#FF6B6B'),
('Backend', 'backend', '#4ECDC4'),
('Database', 'database', '#45B7D1'),
('DevOps', 'devops', '#FF6F61'),
('Tutorial', 'tutorial', '#9B59B6'),
('Design', 'design', '#E91E63'),
('Productivity', 'productivity', '#4CAF50'),
('AI', 'ai', '#FF9800'),
('Machine Learning', 'machine-learning', '#F44336')
ON CONFLICT (name) DO NOTHING;
