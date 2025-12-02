import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Trash2, Edit, Share2, Copy, Twitter, Facebook, Linkedin } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CommentSection } from '@/components/blog/CommentSection';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const postUrl = window.location.href;

  const handleShare = (platform: string) => {
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`,
    };
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(postUrl);
      toast.success('Link copied to clipboard!');
    } else {
      window.open(shareUrls[platform as keyof typeof shareUrls], '_blank');
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <article className="container py-6 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Meta info bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span>{post.likes?.length || 0} likes</span>
            </div>
            <span>•</span>
            <span>{format(new Date(post.created_at), 'MMMM dd, yyyy')}</span>
            <span>•</span>
            <span className="font-medium text-foreground">{post.title}</span>
          </div>

          {/* Author info and actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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
                  {format(new Date(post.created_at), 'PPP')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleShare('copy')}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('twitter')}>
                    <Twitter className="h-4 w-4 mr-2" />
                    Share on Twitter
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('facebook')}>
                    <Facebook className="h-4 w-4 mr-2" />
                    Share on Facebook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('linkedin')}>
                    <Linkedin className="h-4 w-4 mr-2" />
                    Share on LinkedIn
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {isAuthor && (
                <>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/create?edit=${post.id}`)}>
                    <Edit className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Edit</span>
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
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-8 text-balance">
            {post.title}
          </h1>

          {/* Main image if exists */}
          {post.post_images && post.post_images.length > 0 && (
            <div className="mb-8 sm:mb-12 rounded-xl sm:rounded-2xl overflow-hidden shadow-lift">
              <img
                src={post.post_images[0].url}
                alt={post.post_images[0].alt_text || post.title}
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm sm:prose-base lg:prose-lg prose-slate max-w-none mb-8 sm:mb-12">
            <div dangerouslySetInnerHTML={{ __html: post.content_markdown }} />
          </div>

          {/* Additional images */}
          {post.post_images && post.post_images.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 sm:mb-12">
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
