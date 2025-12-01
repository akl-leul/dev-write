import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Trash2, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CommentSection } from '@/components/blog/CommentSection';

const PostDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (full_name, profile_image_url),
          post_images (url, alt_text, order_index),
          likes (user_id),
          comments (count)
        `)
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const likePost = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      
      const isLiked = post?.likes?.some((like: any) => like.user_id === user.id);
      
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', slug] });
    },
    onError: () => {
      toast.error('Failed to update like');
    },
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      if (!post || post.author_id !== user?.id) {
        throw new Error('Unauthorized');
      }
      
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Post deleted');
      navigate('/feed');
    },
    onError: () => {
      toast.error('Failed to delete post');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-12">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-12 text-center">
          <h1 className="text-4xl font-serif font-bold mb-4">Post not found</h1>
          <Button onClick={() => navigate('/feed')}>Back to Feed</Button>
        </div>
      </div>
    );
  }

  const isLiked = post.likes?.some((like: any) => like.user_id === user?.id);
  const isAuthor = user?.id === post.author_id;

  return (
    <div className="min-h-screen">
      <Header />
      
      <article className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* Author info */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={post.profiles?.profile_image_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {post.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-lg">{post.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            {isAuthor && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.info('Edit feature coming soon')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this post?')) {
                      deletePost.mutate();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-serif font-bold mb-8 text-balance">
            {post.title}
          </h1>

          {/* Main image if exists */}
          {post.post_images && post.post_images.length > 0 && (
            <div className="mb-12 rounded-2xl overflow-hidden shadow-lift">
              <img
                src={post.post_images[0].url}
                alt={post.post_images[0].alt_text || post.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg prose-slate max-w-none mb-12">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content_markdown}
            </ReactMarkdown>
          </div>

          {/* Additional images */}
          {post.post_images && post.post_images.length > 1 && (
            <div className="grid grid-cols-2 gap-4 mb-12">
              {post.post_images.slice(1).map((image: any, index: number) => (
                <div key={index} className="rounded-lg overflow-hidden shadow-elegant">
                  <img
                    src={image.url}
                    alt={image.alt_text || `Image ${index + 2}`}
                    className="w-full h-auto"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Engagement bar */}
          <div className="flex items-center gap-6 py-6 border-y">
            <Button
              variant={isLiked ? 'default' : 'outline'}
              onClick={() => user ? likePost.mutate() : navigate('/auth')}
              className={isLiked ? 'bg-accent' : ''}
            >
              <Heart className={`h-5 w-5 mr-2 ${isLiked ? 'fill-current' : ''}`} />
              {post.likes?.length || 0}
            </Button>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageCircle className="h-5 w-5" />
              <span>{post.comments?.[0]?.count || 0} comments</span>
            </div>
          </div>

          {/* Comments section */}
          <div className="mt-12">
            <CommentSection postId={post.id} />
          </div>
        </div>
      </article>
    </div>
  );
};

export default PostDetail;
