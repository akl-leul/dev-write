import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Eye, Clock, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useCallback, useRef } from 'react';
import { PostAuthorBadge } from '@/components/PostAuthorBadge';

const POSTS_PER_PAGE = 10;

export const PersonalizedFeed = () => {
  const { user } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Calculate posts count per author for first post badge
  const getAuthorPostsCount = useCallback((authorId: string, allPosts: any[]) => {
    return allPosts.filter(post => post.profiles?.id === authorId).length;
  }, []);

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['personalized-feed', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      // Get list of users the current user follows
      const { data: following } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];
      
      if (followingIds.length === 0) return [];

      const { data, error } = await supabase
        .from('posts')
        .select(`*, profiles!inner (id, full_name, profile_image_url), likes (count), comments (count), post_images (url), categories:category_id (name, slug), featured_image`)
        .in('author_id', followingIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + POSTS_PER_PAGE - 1);

      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < POSTS_PER_PAGE) return undefined;
      return allPages.flat().length;
    },
    initialPageParam: 0,
    enabled: !!user,
  });

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  const allPosts = postsData?.pages.flat() || [];

  if (!user) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Sign in to see your feed</h3>
        <p className="text-slate-500 mb-4">Follow authors to see their posts here</p>
        <Link to="/auth" className="text-blue-600 font-medium hover:underline">Sign in</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (allPosts.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Your feed is empty</h3>
        <p className="text-slate-500">Follow some authors to see their posts here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {allPosts.map((post: any) => (
        <article key={post.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-100 transition-all duration-300 relative overflow-hidden">
          
          <div className="flex items-center justify-between mb-6">
            <PostAuthorBadge 
              author={post.profiles}
              createdAt={post.created_at}
              postsCount={getAuthorPostsCount(post.profiles?.id || '', allPosts)}
              likesCount={0}
              followersCount={0}
            />
            
            {post.categories && (
              <span className="hidden sm:inline-block px-3 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-full text-xs font-semibold tracking-wide">
                {post.categories.name}
              </span>
            )}
          </div>

          <Link to={`/post/${post.slug}`} className="block group">
            <div className="grid md:grid-cols-[1fr_180px] gap-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                  {post.title}
                </h2>
                
                {post.excerpt && (
                  <p className="text-slate-500 leading-relaxed mb-6 line-clamp-2 text-sm">
                    {post.excerpt}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 mt-auto pt-2">
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                    <Heart className="h-4 w-4" />
                    <span>{post.likes?.[0]?.count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comments?.[0]?.count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                    <Eye className="h-4 w-4" />
                    <span>{post.views || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-500 text-xs font-bold bg-blue-50 px-2 py-1 rounded-md ml-auto sm:ml-0">
                    <Clock className="h-3 w-3" />
                    <span>{post.read_time || 5} min</span>
                  </div>
                </div>
              </div>

              {(post.featured_image || post.post_images?.[0]) && (
                <div className="hidden md:block w-full h-28 rounded-2xl overflow-hidden border border-slate-100">
                  <img 
                    src={post.featured_image || post.post_images[0].url} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                </div>
              )}
            </div>
          </Link>
        </article>
      ))}

      <div ref={loadMoreRef} className="py-8 flex justify-center">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Loading more...</span>
          </div>
        )}
        {!hasNextPage && allPosts.length > 0 && (
          <p className="text-sm text-slate-400 font-medium">You've reached the end</p>
        )}
      </div>
    </div>
  );
};
