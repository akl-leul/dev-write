import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Reply, Trash2, Edit2, MessageCircle, Send, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showAuthDialog, setShowAuthDialog] = useState(false);

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

  const handleCommentAction = () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    createComment.mutate({ content: newComment });
  };

  const handleLikeClick = (commentId: string) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    likeComment.mutate(commentId);
  };

  const handleReplyClick = (commentId: string) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    setReplyTo(commentId);
    setReplyContent('');
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isLiked = comment.comment_likes?.some(like => like.user_id === user?.id);
    const isAuthor = user?.id === comment.author_id;
    const isEditing = editingId === comment.id;
    const isReplying = replyTo === comment.id;

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-6 sm:ml-12 border-l-2 border-slate-100 pl-4 sm:pl-6' : ''} mb-6 transition-all`}>
        <div className="flex gap-4 group">
          <Avatar className="h-10 w-10 border border-white shadow-sm ring-1 ring-slate-100 flex-shrink-0">
            <AvatarImage src={comment.profiles?.profile_image_url || ''} />
            <AvatarFallback className="bg-slate-100 text-slate-500 font-bold">
              {comment.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-bold text-slate-900 text-sm">{comment.profiles?.full_name}</span>
              <span className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            
            {isEditing ? (
              <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px] bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
                <div className="flex gap-2 justify-end">
                   <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
                      setEditContent('');
                    }}
                    className="text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateComment.mutate({ id: comment.id, content: editContent })}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm prose-slate max-w-none mb-2 text-slate-700 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {comment.content_markdown}
                </ReactMarkdown>
              </div>
            )}
            
            <div className="flex items-center gap-4 text-xs font-medium">
              <button
                onClick={() => handleLikeClick(comment.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${
                  isLiked 
                    ? 'text-red-500 bg-red-50' 
                    : 'text-slate-500 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
                <span>{comment.comment_likes?.length || 0}</span>
              </button>
              
              <button
                onClick={() => handleReplyClick(comment.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Reply className="h-3.5 w-3.5" />
                Reply
              </button>
              
              {isAuthor && (
                <>
                  <button
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content_markdown);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors ml-auto sm:ml-0"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this comment?')) {
                        deleteComment.mutate(comment.id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </>
              )}
            </div>
            
            {isReplying && (
              <div className="mt-4 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Replying to <span className="font-bold text-slate-700">{comment.profiles?.full_name}</span></span>
                  <button onClick={() => setReplyTo(null)} className="hover:text-slate-900"><X className="w-3 h-3" /></button>
                </div>
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[80px] bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                   <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplyTo(null);
                      setReplyContent('');
                    }}
                    className="text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => createComment.mutate({ content: replyContent, parentId: comment.id })}
                    disabled={!replyContent.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 relative">
             {/* Visual connector line for nested comments could go here if desired */}
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-6 sm:py-10 px-6 sm:px-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
           <MessageCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          Comments <span className="text-slate-400 text-lg font-normal ml-1">({comments?.length || 0})</span>
        </h2>
      </div>
      
      {/* Comment input - show for all users */}
      <div className="mb-10 relative">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={user ? "Share your thoughts on this story..." : "Sign in to join the conversation..."}
          className="min-h-[120px] bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-2xl resize-y p-4 text-base shadow-sm"
          onClick={() => !user && setShowAuthDialog(true)}
        />
        <div className="absolute bottom-4 right-4">
           <Button
            onClick={handleCommentAction}
            disabled={!newComment.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20"
          >
            <Send className="w-4 h-4 mr-2" />
            Post Comment
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-200"></div>
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-4 bg-slate-200 rounded w-full"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map(comment => renderComment(comment))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-900 font-medium">No comments yet</p>
          <p className="text-slate-500 text-sm">Be the first to share your thoughts!</p>
        </div>
      )}

      {/* Auth Required Dialog */}
      <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <AlertDialogContent className="rounded-2xl border-slate-100 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-900">Join the Conversation</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Please create an account or sign in to comment on this post. Join our community to share your thoughts and engage with others.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => navigate('/auth')}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Sign In / Sign Up
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};