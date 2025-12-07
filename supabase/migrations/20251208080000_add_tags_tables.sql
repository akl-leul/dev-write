-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_tags junction table
CREATE TABLE public.post_tags (
  id UUID NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX idx_tags_name ON public.tags(name);
CREATE INDEX idx_tags_slug ON public.tags(slug);
CREATE INDEX idx_post_tags_post_id ON public.post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON public.post_tags(tag_id);

-- Enable Row Level Security
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
CREATE POLICY "Tags are viewable by everyone"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for post_tags
CREATE POLICY "Post tags are viewable by everyone"
  ON public.post_tags FOR SELECT
  USING (true);

CREATE POLICY "Users can manage tags for their own posts"
  ON public.post_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.posts
    WHERE posts.id = post_id AND posts.author_id = auth.uid()
  ));

-- Function to create tag if it doesn't exist
CREATE OR REPLACE FUNCTION public.get_or_create_tag(tag_name TEXT)
RETURNS UUID AS $$
DECLARE
  tag_id UUID;
  tag_slug TEXT;
BEGIN
  -- Generate slug from tag name
  tag_slug := LOWER(regexp_replace(tag_name, '[^a-zA-Z0-9]+', '-', 'g'));
  tag_slug := regexp_replace(tag_slug, '^-|-$', '', 'g');
  
  -- Try to find existing tag
  SELECT id INTO tag_id FROM public.tags WHERE name = tag_name LIMIT 1;
  
  -- If tag doesn't exist, create it
  IF tag_id IS NULL THEN
    INSERT INTO public.tags (name, slug)
    VALUES (tag_name, tag_slug)
    RETURNING id INTO tag_id;
  END IF;
  
  RETURN tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
