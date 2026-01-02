import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Eye, Clock, Sparkles, Loader2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useRef } from 'react';
import { FollowButton } from "@/components/social/FollowButton";
import { RepostButton } from "@/components/social/RepostButton";
import { PostAuthorBadge } from "@/components/PostAuthorBadge";
import { ImageWithFallback } from "@/components/ui/image-fallback";

const POSTS_PER_PAGE = 12;

interface DiscoverFeedProps {
    searchQuery?: string;
}

export const DiscoverFeed = ({ searchQuery = "" }: DiscoverFeedProps) => {
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ["discover-feed", searchQuery],
        queryFn: async ({ pageParam = 0 }) => {
            let query = supabase
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
                .order("created_at", { ascending: false })
                .range((pageParam as number) * POSTS_PER_PAGE, ((pageParam as number) + 1) * POSTS_PER_PAGE - 1);

            if (searchQuery) {
                query = query.or(
                    `title.ilike.%${searchQuery}%,content_markdown.ilike.%${searchQuery}%`,
                );
            }

            const { data: posts, error } = await query;
            if (error) throw error;

            return {
                data: posts || [],
                hasNextPage: (posts || []).length === POSTS_PER_PAGE,
            };
        },
        getNextPageParam: (lastPage: any, allPages: any) => {
            if (!lastPage.hasNextPage) return undefined;
            return allPages.length;
        },
        initialPageParam: 0,
        staleTime: 2 * 60 * 1000,
    });

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

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 animate-pulse">
                        <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4"></div>
                        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (allPosts.length === 0) {
        return (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 border-dashed">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
                    <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No stories found</h3>
                <p className="text-slate-500 dark:text-slate-400">Try adjusting your search query.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
            {allPosts.map((post: any) => (
                <article key={post.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-100 dark:hover:border-blue-900/50 transition-all duration-300 relative overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <PostAuthorBadge
                            author={{
                                id: post.profiles?.id || '',
                                full_name: post.profiles?.full_name || '',
                                profile_image_url: post.profiles?.profile_image_url || '',
                            }}
                            createdAt={post.created_at}
                        />
                        {post.profiles?.id && (
                            <FollowButton userId={post.profiles.id} size="sm" variant="outline" />
                        )}
                    </div>

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

            <div ref={loadMoreRef} className="py-8 flex justify-center col-span-full">
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
