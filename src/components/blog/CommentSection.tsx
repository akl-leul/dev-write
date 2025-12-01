import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Reply, Trash2, Edit2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CommentSectionProps {
  postId: string;
}

interface Comment {
  id: string;
  content_markdown: string;
  created_at: string;
  author_id: string;
  parent_comment_id: string | null;
  profiles: {
    full_name: string;
    profile_image_url: string | null;
  };
  comment_likes: { user_id: string }[];
  replies?: Comment[];
}

export const CommentSection = ({ postId }: CommentSectionProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:author_id (full_name, profile_image_url),
          comment_likes (user_id)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Build nested comment tree
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];
      
      data.forEach((comment: any) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });
      
      data.forEach((comment: any) => {
        const commentNode = commentMap.get(comment.id)!;
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies!.push(commentNode);
          }
        } else {
          rootComments.push(commentNode);
        }
      });
      
      return rootComments;
    },
  });

  const createComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          parent_comment_id: parentId || null,
          content_markdown: content,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setNewComment('');
      setReplyTo(null);
      setReplyContent('');
      toast.success('Comment posted');
    },
    onError: () => {
      toast.error('Failed to post comment');
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('comments')
        .update({ content_markdown: content })
        .eq('id', id)
        .eq('author_id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setEditingId(null);
      setEditContent('');
      toast.success('Comment updated');
    },
    onError: () => {
      toast.error('Failed to update comment');
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id)
        .eq('author_id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('Comment deleted');
    },
    onError: () => {
      toast.error('Failed to delete comment');
    },
  });

  const likeComment = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const comment = findComment(comments || [], commentId);
      const isLiked = comment?.comment_likes?.some(like => like.user_id === user.id);
      
      if (isLiked) {
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });

  const findComment = (comments: Comment[], id: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      if (comment.replies) {
        const found = findComment(comment.replies, id);
        if (found) return found;
      }
    }
    return null;
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isLiked = comment.comment_likes?.some(like => like.user_id === user?.id);
    const isAuthor = user?.id === comment.author_id;
    const isEditing = editingId === comment.id;
    const isReplying = replyTo === comment.id;

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-border pl-4' : ''} mb-6`}>
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={comment.profiles?.profile_image_url || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {comment.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">{comment.profiles?.full_name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateComment.mutate({ id: comment.id, content: editContent })}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setEditContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none mb-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {comment.content_markdown}
                </ReactMarkdown>
              </div>
            )}
            
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => user ? likeComment.mutate(comment.id) : null}
                className={`flex items-center gap-1 ${isLiked ? 'text-accent' : 'text-muted-foreground'} hover:text-accent transition-colors`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{comment.comment_likes?.length || 0}</span>
              </button>
              
              {user && (
                <button
                  onClick={() => {
                    setReplyTo(comment.id);
                    setReplyContent('');
                  }}
                  className="flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
              )}
              
              {isAuthor && (
                <>
                  <button
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content_markdown);
                    }}
                    className="flex items-center gap-1 text-muted-foreground hover:text-accent transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this comment?')) {
                        deleteComment.mutate(comment.id);
                      }
                    }}
                    className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </>
              )}
            </div>
            
            {isReplying && (
              <div className="mt-4 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => createComment.mutate({ content: replyContent, parentId: comment.id })}
                    disabled={!replyContent.trim()}
                  >
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyTo(null);
                      setReplyContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-serif font-bold mb-6">
        Comments ({comments?.length || 0})
      </h2>
      
      {user && (
        <div className="mb-8">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="mb-3 min-h-[120px]"
          />
          <Button
            onClick={() => createComment.mutate({ content: newComment })}
            disabled={!newComment.trim()}
            className="bg-gradient-accent"
          >
            Post Comment
          </Button>
        </div>
      )}
      
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-10 w-10 rounded-full bg-muted"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : comments && comments.length > 0 ? (
        <div>
          {comments.map(comment => renderComment(comment))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          No comments yet. Be the first to share your thoughts!
        </p>
      )}
    </div>
  );
};
