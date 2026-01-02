import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Eye, Edit, Trash2, MessageSquare, AlertCircle, FileText, Calendar, PenLine } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useMemo, useCallback, memo } from 'react';
import { PostAuthorBadge } from '@/components/PostAuthorBadge';
import { UserBadge } from '@/components/UserBadge';
import { PageLoader } from '@/components/ui/page-loader';

interface CommentWithProfile {
  id: string;
  content_markdown: string;
  created_at: string;
  approved: boolean;
  postTitle: string;
  postSlug: string;
  profiles?: {
    full_name: string;
    profile_image_url: string;
    badge?: string | null;
    id: string;
  };
}

// Memoized components for better performance
const CommentItem = memo(({ comment, onDelete }: {
  comment: CommentWithProfile;
  onDelete: (id: string) => void;
}) => {
  return (
    <div className="group bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-slate-100 dark:ring-slate-700">
          <AvatarImage src={comment.profiles?.profile_image_url} alt={comment.profiles?.full_name} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
            {comment.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {comment.profiles?.full_name || 'Anonymous'}
                </span>
                {comment.profiles?.id && (
                  <UserBadge userId={comment.profiles.id} />
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                <Check className="h-3 w-3" />
                Auto-approved
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(comment.id)}
              className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Link to={`/post/${comment.postSlug}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
              On: {comment.postTitle}
            </Link>
            <div className="prose prose-sm prose-slate max-w-none text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {comment.content_markdown}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CommentItem.displayName = 'CommentItem';

const PostCard = memo(({ post, onDelete, onDeleteComment }: {
  post: Post;
  onDelete: (id: string) => void;
  onDeleteComment: (commentId: string) => void;
}) => {
  const [showComments, setShowComments] = useState(false);
  const approvedCount = useMemo(() =>
    post.comments.filter(c => c.approved).length, [post.comments]
  );
  const pendingCount = useMemo(() =>
    post.comments.filter(c => !c.approved).length, [post.comments]
  );

  const featuredImage = useMemo(() =>
    post.post_images?.find(img => img.order_index === 0) || post.post_images?.[0],
    [post.post_images]
  );

  return (
    <Card className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-blue-100 dark:hover:border-blue-900/50 transition-all duration-300 rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {featuredImage ? (
            <div className="w-full md:w-48 h-32 flex-shrink-0 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
              <img
                src={featuredImage.url}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : (
            <div className="w-full flex flex-col md:w-48 h-32 flex-shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500">
              <AlertCircle className="w-10 h-10" /> <p>No featured image</p>
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                  {post.title}
                </h3>
                <Badge
                  variant="outline"
                  className={`rounded-full px-3 py-0.5 border-0 font-medium ${post.status === 'published'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                >
                  {post.status === 'published' ? 'Published' : 'Draft'}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{approvedCount} comments</span>
                </div>
                {pendingCount > 0 && (
                  <span className="text-orange-600 dark:text-orange-400 font-medium text-xs bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                    {pendingCount} pending review
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-50 dark:border-slate-700 mt-2">
              <Link to={`/post/${post.slug}`}>
                <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                  <Eye className="h-4 w-4 mr-2" />
                  Read Post
                </Button>
              </Link>
              {post.comments.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {showComments ? 'Hide' : 'Show'} Comments ({post.comments.length})
                </Button>
              )}
              <Link to={`/create?edit=${post.id}`}>
                <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <div className="flex-1"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(post.id)}
                className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && post.comments.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Comments ({post.comments.length})
              </h4>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {approvedCount} approved, {pendingCount} pending
              </div>
            </div>
            <div className="space-y-3">
              {post.comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={{
                    ...comment,
                    postTitle: post.title,
                    postSlug: post.slug
                  }}
                  onDelete={onDeleteComment}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

PostCard.displayName = 'PostCard';

interface Post {
  id: string;
  title: string;
  slug: string;
  created_at: string;
  status: string;
  post_images: { url: string; order_index: number }[];
  comments: CommentWithProfile[];
}

const MyPosts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['my-posts', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          slug,
          created_at,
          status,
          post_images(url),
          comments (
            id,
            content_markdown,
            created_at,
            approved,
            profiles:author_id (id, full_name, profile_image_url, badge)
          )
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100); // Increased limit but still bounded

      if (error) {
        console.error('Query error:', error);
        throw error;
      }

      return data as unknown as Post[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      console.log('Deleting comment:', commentId);
      console.log('Current user:', user?.id);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Try direct delete first (as comment author)
      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (deleteError) {
        console.error('Error deleting comment:', deleteError);
        throw new Error(`Failed to delete comment: ${deleteError.message}`);
      }

      console.log('Comment deleted successfully');
    },
    onMutate: async (commentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['my-posts', user?.id] });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData(['my-posts', user?.id]);

      // Optimistically update the posts data (remove the comment)
      queryClient.setQueryData(['my-posts', user?.id], (old: Post[] | undefined) => {
        if (!old) return old;

        return old.map((post: Post) => ({
          ...post,
          comments: post.comments.filter((comment: CommentWithProfile) => comment.id !== commentId)
        }));
      });

      return { previousPosts };
    },
    onError: (err, commentId, context) => {
      console.error('Error in deleteComment mutation:', err);
      if (context?.previousPosts) {
        queryClient.setQueryData(['my-posts', user?.id], context.previousPosts);
      }
      toast.error(err.message || 'Failed to delete comment');
    },
    onSuccess: () => {
      toast.success('Comment deleted successfully');
    },
    onSettled: () => {
      // Refetch to ensure server state is reflected
      queryClient.invalidateQueries({ queryKey: ['my-posts', user?.id] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-posts', user?.id] });
      toast.success('Post deleted');
    },
    onError: () => {
      toast.error('Failed to delete post');
    },
  });

  // Memoized values and callbacks must be defined before early returns
  const handleDeleteComment = useCallback((commentId: string) => {
    if (confirm('Delete this comment? This action cannot be undone.')) {
      deleteComment.mutate(commentId);
    }
  }, [deleteComment]);

  const handleDeletePost = useCallback((postId: string) => {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      deletePost.mutate(postId);
    }
  }, [deletePost]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Error loading posts</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">Please try refreshing the page</p>
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/20">
      <div className="fixed inset-0 z-0 pointer-events-none dark:opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}>
      </div>

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FileText size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">My Posts</h1>
                  <p className="text-slate-500 dark:text-slate-400">Manage your stories and community interactions</p>
                </div>
              </div>
              <Link to="/create">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 px-4 py-2 sm:px-6 text-sm sm:text-base">
                  <PenLine className="w-4 h-4 mr-2" />
                  Write New Story
                </Button>
              </Link>
            </div>

            <div className="space-y-6">
              {posts && posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onDelete={handleDeletePost}
                    onDeleteComment={handleDeleteComment}
                  />
                ))
              ) : (
                <Card className="border-dashed border-2 border-slate-200 dark:border-slate-700 shadow-none bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl">
                  <CardContent className="p-16 text-center">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300 dark:text-slate-600">
                      <PenLine className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">No stories yet</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                      You haven't published any stories yet. Share your first thought with the world!
                    </p>
                    <Link to="/create">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 px-8 py-6">
                        Write Your First Story
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyPosts;
