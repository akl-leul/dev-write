-- RPC function to delete a comment, bypassing RLS for post owners
-- This function checks if the user owns the post and allows deletion of comments on their posts

CREATE OR REPLACE FUNCTION delete_comment_as_post_owner(
  comment_id UUID,
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
AS $$
DECLARE
  post_author_id UUID;
BEGIN
  -- Get the post author for this comment
  SELECT p.author_id INTO post_author_id
  FROM comments c
  JOIN posts p ON c.post_id = p.id
  WHERE c.id = comment_id;
  
  -- Check if the user owns the post
  IF post_author_id != user_id THEN
    RAISE EXCEPTION 'Permission denied: You can only delete comments on your own posts';
  END IF;
  
  -- Delete the comment
  DELETE FROM comments WHERE id = comment_id;
  
  -- Return success
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_comment_as_post_owner TO authenticated;
