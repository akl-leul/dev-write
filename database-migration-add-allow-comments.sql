-- Add allow_comments column to posts table
ALTER TABLE posts ADD COLUMN allow_comments BOOLEAN DEFAULT TRUE;

-- Add comment to explain the new column
COMMENT ON COLUMN posts.allow_comments IS 'Controls whether comments are allowed on this post';
