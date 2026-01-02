import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FollowButton } from "@/components/social/FollowButton";
import { RepostButton } from "@/components/social/RepostButton";
import { Heart, MessageCircle, Eye, Clock, Sparkles, Loader2, Repeat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useCallback, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageWithFallback } from "@/components/ui/image-fallback";
import { PostAuthorBadge } from "@/components/PostAuthorBadge";
import { SuggestedAuthors } from "@/components/social/SuggestedAuthors";

const POSTS_PER_PAGE = 10;

export const PersonalizedFeed = () => {
  const { user } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Calculate posts count per author for first post badge
  const getAuthorPostsCount = useCallback((authorId: string, allPosts: any[]) => {
    return allPosts.filter(post => post.profiles?.id === authorId).length;
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isError
  } = useInfiniteQuery({
    queryKey: ["following-feed", user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return { data: [], hasNextPage: false };

      const { data: followingData, error: followError } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followError) {
        console.error('PersonalizedFeed: Error fetching following list:', followError);
      }

      // Unique list of IDs: current user + anyone they follow
      const distinctFollowingIds = Array.from(new Set([
        user.id,
        ...(followingData?.map((f: any) => f.following_id) || [])
      ].filter(Boolean)));

      console.log('PersonalizedFeed: Starting fetch for IDs:', distinctFollowingIds);

      if (distinctFollowingIds.length === 0) {
        return { data: [], hasNextPage: false };
      }

      // Fetch direct posts from followed authors
      const { data: directPosts, error: postsError } = await supabase
        .from("posts")
        .select(`
          *,
          categories:category_id (name, slug),
          post_images (url),
          likes (count),
          comments (count),
          profiles:author_id (id, full_name, profile_image_url),
          featured_image,
          views,
          content_markdown
        `)
        .eq("status", "published")
        .in("author_id", distinctFollowingIds)
        .order("created_at", { ascending: false })
        .range((pageParam as number) * POSTS_PER_PAGE, ((pageParam as number) + 1) * POSTS_PER_PAGE - 1);

      // Fetch reposts from followed authors
      const { data: repostsData, error: repostsError } = await supabase
        .from("reposts")
        .select(`
          *,
          posts:original_post_id (
            *,
            categories:category_id (name, slug),
            post_images (url),
            likes (count),
            comments (count),
            profiles:author_id (id, full_name, profile_image_url),
            featured_image,
            views,
            content_markdown
          ),
          profiles:user_id (id, full_name, profile_image_url)
        `)
        .in("user_id", distinctFollowingIds)
        .order("created_at", { ascending: false })
        .range((pageParam as number) * POSTS_PER_PAGE, ((pageParam as number) + 1) * POSTS_PER_PAGE - 1);

      if (postsError) {
        console.error('Error fetching direct posts:', postsError);
        throw postsError;
      }
      if (repostsError) {
        console.error('Error fetching reposts:', repostsError);
        throw repostsError;
      }

      console.log('PersonalizedFeed results:', {
        directPostsCount: directPosts?.length || 0,
        repostsCount: repostsData?.length || 0
      });

      // Format reposts to look like posts but with "reposted_by" info
      const formattedReposts = (repostsData || [])
        .filter(r => r.posts) // Ensure the original post still exists
        .map(r => ({
          ...(r.posts as any),
          id: `${r.posts.id}-repost-${r.id}`, // Unique ID to avoid collisions
          reposted_by: r.profiles,
          repost_id: r.id,
          repost_created_at: r.created_at,
          quote_text: r.quote_text
        }));

      // Combine and sort by created_at (repost time for reposts, post time for original posts)
      const combined = [...(directPosts || []), ...formattedReposts]
        .sort((a, b) => {
          const timeA = new Date(a.repost_created_at || a.created_at).getTime();
          const timeB = new Date(b.repost_created_at || b.created_at).getTime();
          return timeB - timeA;
        })
        .slice(0, POSTS_PER_PAGE);

      return {
        data: combined,
        hasNextPage: (directPosts?.length || 0) === POSTS_PER_PAGE || (repostsData?.length || 0) === POSTS_PER_PAGE,
      };
    },
    getNextPageParam: (lastPage: any, allPages: any) => {
      if (!lastPage.hasNextPage) return undefined;
      return allPages.length;
    },
    initialPageParam: 0,
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten all pages into a single array
  const allPosts = data?.pages.flatMap((page: any) => page.data) || [];

  // Infinite scroll logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              </div>
            </div>
            <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state check
  if (!user || (!isLoading && allPosts.length === 0)) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 border-dashed">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Nothing to see here yet</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Follow more authors or write your first post to populate your feed!</p>
        <div className="flex flex-col items-center gap-6">
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-colors"
          >
            Refresh Feed
          </button>
          <div className="w-full max-w-md">
            <SuggestedAuthors />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
      {allPosts.map((post: any) => (
        <article key={post.repost_id || post.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-100 dark:hover:border-blue-900/50 transition-all duration-300 relative overflow-hidden flex flex-col">
          {/* Repost Header */}
          {post.reposted_by && (
            <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400 font-medium text-xs sm:text-sm bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full w-fit">
              <span className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5" />
                {post.reposted_by.full_name} reposted
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <PostAuthorBadge
              author={{
                id: post.profiles?.id || '',
                full_name: post.profiles?.full_name || '',
                profile_image_url: post.profiles?.profile_image_url || '',
              }}
              createdAt={post.created_at}
            />
            {/* Follow Button */}
            {post.profiles?.id && (
              <FollowButton userId={post.profiles.id} size="sm" variant="outline" />
            )}
          </div>

          {post.quote_text && (
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 italic text-slate-700 dark:text-slate-300">
              "{post.quote_text}"
            </div>
          )}

          <Link to={`/post/${post.slug}`} className="block group flex-1">
            <div className="space-y-4">
              <div className="w-full h-40 sm:h-48 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <ImageWithFallback
                  src={post.featured_image || post.post_images?.[0]?.url}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  fallbackClassName="w-full h-full"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight line-clamp-2">
                    {post.title}
                  </h2>
                  {post.categories && (
                    <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                      {post.categories.name}
                    </span>
                  )}
                </div>

                {post.excerpt && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-2">
                    {post.excerpt.replace(/<[^>]*>/g, '').substring(0, 100)}...
                  </p>
                )}
              </div>
            </div>
          </Link>
          {/* Post Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-sm">
              <Heart className="h-4 w-4" />
              <span>{post.likes?.[0]?.count || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-sm">
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments?.[0]?.count || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-sm">
              <Eye className="h-4 w-4" />
              <span>{post.views || 0}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <RepostButton
                postId={post.id}
                postTitle={post.title}
                authorName={post.profiles?.full_name || 'Unknown'}
              />
              <span className="text-xs text-blue-500 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                {post.read_time || 5} min
              </span>
            </div>
          </div>
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
