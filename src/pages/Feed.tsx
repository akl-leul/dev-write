import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  MessageCircle,
  Eye,
  Clock,
  Filter,
  Search,
  Sparkles,
  Loader2,
  Users,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect, useCallback, useRef } from "react";
import { SuggestedAuthors } from "@/components/social/SuggestedAuthors";
import { TrendingPosts } from "@/components/social/TrendingPosts";
import { PersonalizedFeed } from "@/components/feed/PersonalizedFeed";
import { PostAuthorBadge } from "@/components/PostAuthorBadge";

const POSTS_PER_PAGE = 10;

const Feed = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("discover");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Handle OAuth callback from Google login
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.get('code') || urlParams.get('access_token');
    
    // Debug OAuth callback
    console.log('Feed OAuth callback check:', { 
      hasCode, 
      user: !!user, 
      urlParams: Object.fromEntries(urlParams.entries())
    });
    
    // If user arrives from OAuth callback and is authenticated, clear URL parameters
    if (hasCode && user) {
      console.log('OAuth callback successful in Feed - clearing URL parameters');
      // Clear the URL parameters to prevent issues with future navigation
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Calculate posts count per author for first post badge
  const getAuthorPostsCount = useCallback((authorId: string, allPosts: any[]) => {
    return allPosts.filter(post => post.profiles?.id === authorId).length;
  }, []);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - categories rarely change
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["posts", searchQuery, selectedCategory],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("posts")
        .select(`*, categories:category_id (name, slug), post_images (url), likes (count), comments (count), profiles:author_id (id, full_name, profile_image_url), featured_image, views, content_markdown`)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + POSTS_PER_PAGE - 1);

      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,content_markdown.ilike.%${searchQuery}%`,
        );
      }

      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as any[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < POSTS_PER_PAGE) return undefined;
      return allPages.flat().length;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  const allPosts = postsData?.pages.flat() || [];

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm animate-pulse h-64"
                  >
                    <div className="flex gap-4 items-center mb-6">
                      <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                    <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                    <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  </div>
                ))}
              </div>
              <div className="hidden lg:block space-y-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 h-64 animate-pulse"></div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 h-80 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-slate-900 font-sans selection:bg-accent/20 dark:selection:bg-blue-900/20">
      {/* Background Dot Pattern */}
      <div
        className="fixed inset-0 z-0 pointer-events-none dark:opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      ></div>

      <div className="relative z-10">
        <Header />

        <main className="container mx-auto py-12 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Page Header with Tabs */}
            <div className="mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4 tracking-tight text-center md:text-left">
                {activeTab === "discover" ? "Discover Stories" : 
                 activeTab === "following" ? "Your Feed" :
                 activeTab === "trending" ? "Trending Stories" :
                 "Suggested Authors"}
              </h1>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl text-center md:text-left mb-6">
                {activeTab === "discover"
                  ? "Read, learn, and share perspectives from writers around the world."
                  : activeTab === "following"
                  ? "Posts from authors you follow."
                  : activeTab === "trending"
                  ? "Discover the most popular stories and trending topics."
                  : "Connect with amazing writers and expand your network."}
              </p>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-1 w-full">
                  <div className="grid grid-cols-2 lg:grid-cols-2 gap-1 w-full">
                    <TabsTrigger
                      value="discover"
                      className="rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 px-2 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm lg:px-6 lg:py-2 lg:text-base"
                    >
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 lg:w-4 lg:h-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline sm:inline lg:inline">Discover</span>
                      <span className="xs:hidden sm:hidden lg:hidden">Discover</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="following"
                      className="rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 px-2 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm lg:px-6 lg:py-2 lg:text-base"
                    >
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 lg:w-4 lg:h-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline sm:inline lg:inline">For You</span>
                      <span className="xs:hidden sm:hidden lg:hidden">For You</span>
                    </TabsTrigger>
                  </div>
                  
                  {/* Mobile-only additional tabs */}
                  <div className="lg:hidden grid grid-cols-2 gap-1 mt-1 w-full">
                    <TabsTrigger
                      value="trending"
                      className="rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 px-2 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm"
                    >
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden xs:inline sm:inline">Trending</span>
                      <span className="xs:hidden sm:hidden">Trending</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="authors"
                      className="rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 px-2 py-2 text-xs sm:px-4 sm:py-2 sm:text-sm"
                    >
                      <UserCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden xs:inline sm:inline">Authors</span>
                      <span className="xs:hidden sm:hidden">Authors</span>
                    </TabsTrigger>
                  </div>
                </TabsList>
              </Tabs>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              {/* Main Feed Column */}
              <div>
                {activeTab === "following" ? (
                  <PersonalizedFeed />
                ) : activeTab === "trending" ? (
                  <div className="space-y-6">
                    <TrendingPosts />
                  </div>
                ) : activeTab === "authors" ? (
                  <div className="space-y-6">
                    <SuggestedAuthors />
                  </div>
                ) : (
                  <>
                    {/* Controls Bar */}
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-20 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60">
                      <div className="flex items-center gap-2 w-full sm:w-auto px-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                          <Filter className="h-4 w-4" />
                        </div>
                        <Select
                          value={selectedCategory}
                          onValueChange={setSelectedCategory}
                        >
                          <SelectTrigger className="w-full sm:w-[200px] border-0 shadow-none bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 focus:ring-0 text-slate-700 dark:text-slate-300 font-medium">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {(categories as any)?.map((cat: any) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedCategory !== "all" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCategory("all")}
                          className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Reset Filter
                        </Button>
                      )}
                    </div>

                    {searchQuery && (
                      <div className="mb-8 flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm text-slate-600 dark:text-slate-400">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Search size={16} />
                        </div>
                        <p>
                          Results for:{" "}
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {searchQuery}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Feed List */}
                    <div className="space-y-8">
                      {allPosts.map((post) => (
                        <article key={post.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-100 dark:hover:border-blue-900/50 transition-all duration-300 relative overflow-hidden">

          <div className="flex items-center justify-between mb-6">
            <PostAuthorBadge
              author={post.profiles}
              createdAt={post.created_at}
              postsCount={getAuthorPostsCount(post.profiles?.id || '', allPosts)}
              likesCount={0}
              followersCount={0}
            />

            {post.categories && (
              <span className="hidden sm:inline-block px-3 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 rounded-full text-xs font-semibold tracking-wide">
                {post.categories.name}
              </span>
            )}
          </div>

          <Link to={`/post/${post.slug}`} className="block group ">
            <div className="space-y-6">
              {(post.featured_image || post.post_images?.[0]) && (
                <div className="w-full h-48 sm:h-80 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                  <img
                    src={post.featured_image || post.post_images[0].url}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                  {post.title}
                </h2>

                {/* Show excerpt if available, otherwise show HTML content preview */}
                {post.excerpt ? (
                  <div 
                    className="prose prose-sm prose-slate max-w-none text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-2 text-sm prose-p:my-1 prose-p:first:mt-0 prose-p:last:mb-0 prose-headings:my-1 prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-headings:text-base prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-img:hidden prose-blockquote:hidden prose-pre:hidden prose-code:hidden prose-hr:hidden prose-table:hidden"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: post.excerpt
                    }}
                  />
                ) : post.content_markdown ? (
                  <div 
                    className="prose prose-sm prose-slate max-w-none text-slate-500 dark:text-slate-400 leading-relaxed mb-6 line-clamp-3 text-sm prose-p:my-1 prose-p:first:mt-0 prose-p:last:mb-0 prose-headings:my-1 prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-headings:text-base prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-img:hidden prose-blockquote:hidden prose-pre:hidden prose-code:hidden prose-hr:hidden prose-table:hidden"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: post.content_markdown
                    }}
                  />
                ) : null}

                <div className="flex flex-wrap items-center gap-4 mt-auto pt-2">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-sm font-medium">
                    <Heart className="h-4 w-4" />
                    <span>{post.likes?.[0]?.count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-sm font-medium">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comments?.[0]?.count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-sm font-medium">
                    <Eye className="h-4 w-4" />
                    <span>{post.views || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 text-xs font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md ml-auto sm:ml-0">
                    <Clock className="h-3 w-3" />
                    <span>{post.read_time || 5} min</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </article>
                      ))}

                      {/* Load More Trigger */}
                      <div
                        ref={loadMoreRef}
                        className="py-8 flex justify-center"
                      >
                        {isFetchingNextPage && (
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                            <span className="text-sm font-medium">
                              Loading more...
                            </span>
                          </div>
                        )}
                        {!hasNextPage && allPosts.length > 0 && (
                          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                            You've reached the end
                          </p>
                        )}
                      </div>

                      {allPosts.length === 0 && (
                        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 border-dashed">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
                            <Sparkles className="w-8 h-8" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            No stories found
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400">
                            Try adjusting your filters or search query.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar */}
              <aside className="hidden lg:block space-y-6 sticky top-20 self-start">
                <TrendingPosts />
                <SuggestedAuthors />
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Feed;
