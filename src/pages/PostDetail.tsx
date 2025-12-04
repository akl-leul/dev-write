import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Trash2, Edit, Share2, Copy, Twitter, Facebook, Linkedin, Eye, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CommentSection } from '@/components/blog/CommentSection';
import { useEffect, useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { BookmarkButton } from '@/components/social/BookmarkButton';
import { FollowButton } from '@/components/social/FollowButton';

const PostDetail = () => {
  const { '*': slugPath } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Extract the slug from path (handles both old and new format)
  const slug = slugPath || '';

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
          comments (count),
          categories:category_id (name, slug)
        `)
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Increment view count when post is loaded (works for all users)
  const viewIncremented = useRef(false);
  useEffect(() => {
    const incrementViews = async () => {
      if (post?.id && !viewIncremented.current) {
        viewIncremented.current = true;
        await supabase
          .from('posts')
          .update({ views: (post.views || 0) + 1 })
          .eq('id', post.id);
      }
    };
    
    if (post) {
      incrementViews();
    }
  }, [post?.id]);

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
  const postDate = new Date(post.created_at);

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
          {/* Meta info bar - likes/date/month/year/title */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span>{post.likes?.length || 0} likes</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>{post.views || 0} views</span>
            </div>
            <span>•</span>
            <span>{format(postDate, 'dd')} / {format(postDate, 'MM')} / {format(postDate, 'yyyy')}</span>
            <span>•</span>
            <span className="font-medium text-foreground">{post.title}</span>
          </div>

          {/* Category and Read Time */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {post.categories && (
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {post.categories.name}
              </span>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{post.read_time || 5} min read</span>
            </div>
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
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <p className="font-medium text-lg">{post.profiles?.full_name}</p>
                  <FollowButton userId={post.author_id} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(postDate, 'PPP')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <BookmarkButton postId={post.id} />
              
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

          {/* Featured Image or Image Carousel */}
          {(post.featured_image || (post.post_images && post.post_images.length > 0)) && (
            <div className="mb-8 sm:mb-12">
              {post.featured_image ? (
                <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-lift">
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full h-auto max-h-[600px] object-cover"
                  />
                </div>
              ) : post.post_images && post.post_images.length > 0 && (
                <>
                  <Carousel className="w-full">
                    <CarouselContent>
                      {post.post_images
                        .sort((a: any, b: any) => a.order_index - b.order_index)
                        .map((image: any, index: number) => (
                          <CarouselItem key={index}>
                            <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-lift">
                              <img
                                src={image.url}
                                alt={image.alt_text || `${post.title} - Image ${index + 1}`}
                                className="w-full h-auto max-h-[600px] object-cover"
                              />
                            </div>
                          </CarouselItem>
                        ))}
                    </CarouselContent>
                    {post.post_images.length > 1 && (
                      <>
                        <CarouselPrevious className="left-2 sm:left-4" />
                        <CarouselNext className="right-2 sm:right-4" />
                      </>
                    )}
                  </Carousel>
                  {post.post_images.length > 1 && (
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      {post.post_images.length} images
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm sm:prose-base lg:prose-lg prose-slate max-w-none mb-8 sm:mb-12">
            <div dangerouslySetInnerHTML={{ __html: post.content_markdown }} />
          </div>

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

            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="h-5 w-5" />
              <span>{post.views || 0} views</span>
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