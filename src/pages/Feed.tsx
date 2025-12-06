import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Eye, Clock, Filter, Search, Sparkles, Loader2, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useCallback, useRef } from 'react';
import { SuggestedAuthors } from '@/components/social/SuggestedAuthors';
import { TrendingPosts } from '@/components/social/TrendingPosts';
import { PersonalizedFeed } from '@/components/feed/PersonalizedFeed';

const POSTS_PER_PAGE = 10;

const Feed = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('discover');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['posts', searchQuery, selectedCategory],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('posts')
        .select(`*, profiles:author_id (id, full_name, profile_image_url), likes (count), comments (count), post_images (url), categories:category_id (name, slug)`)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + POSTS_PER_PAGE - 1);
      
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content_markdown.ilike.%${searchQuery}%`);
      }
      
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < POSTS_PER_PAGE) return undefined;
      return allPages.flat().length;
    },
    initialPageParam: 0,
  });

  // Intersection Observer for infinite scroll
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

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm animate-pulse h-64">
                    <div className="flex gap-4 items-center mb-6">
                      <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                      <div className="h-4 w-32 bg-slate-200 rounded"></div>
                    </div>
                    <div className="h-8 w-3/4 bg-slate-200 rounded mb-4"></div>
                    <div className="h-4 w-full bg-slate-200 rounded mb-2"></div>
                    <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
              <div className="hidden lg:block space-y-6">
                <div className="bg-white rounded-2xl border border-slate-100 p-6 h-64 animate-pulse"></div>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 h-80 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-accent/20">
      
      {/* Background Dot Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none dark:opacity-20" 
           style={{
             backgroundImage: 'radial-gradient(hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)',
             backgroundSize: '24px 24px'
           }}>
      </div>

      <div className="relative z-10">
        <Header />
        
        <main className="container mx-auto py-12 px-4">
          <div className="max-w-6xl mx-auto">
            
            {/* Page Header with Tabs */}
            <div className="mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight text-center md:text-left">
                {activeTab === 'discover' ? 'Discover Stories' : 'Your Feed'}
              </h1>
              <p className="text-lg text-slate-500 max-w-2xl text-center md:text-left mb-6">
                {activeTab === 'discover' 
                  ? 'Read, learn, and share perspectives from writers around the world.'
                  : 'Posts from authors you follow.'}
              </p>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white border border-slate-100 rounded-2xl p-1 w-full sm:w-auto">
                  <TabsTrigger value="discover" className="rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-6">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Discover
                  </TabsTrigger>
                  <TabsTrigger value="following" className="rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 px-6">
                    <Users className="w-4 h-4 mr-2" />
                    For You
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              
              {/* Main Feed Column */}
              <div>
                {activeTab === 'following' ? (
                  <PersonalizedFeed />
                ) : (
                  <>
                {/* Controls Bar */}
                <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-20 backdrop-blur-md bg-white/90 supports-[backdrop-filter]:bg-white/60">
                  <div className="flex items-center gap-2 w-full sm:w-auto px-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Filter className="h-4 w-4" />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full sm:w-[200px] border-0 shadow-none bg-transparent hover:bg-slate-50 focus:ring-0 text-slate-700 font-medium">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCategory !== 'all' && (
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       onClick={() => setSelectedCategory('all')}
                       className="text-red-500 hover:text-red-600 hover:bg-red-50"
                     >
                       Reset Filter
                     </Button>
                  )}
                </div>

                {searchQuery && (
                  <div className="mb-8 flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-600">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Search size={16} />
                    </div>
                    <p>Results for: <span className="font-bold text-slate-900">{searchQuery}</span></p>
                  </div>
                )}
                
                {/* Feed List */}
                <div className="space-y-8">
                  {allPosts.map((post: any) => (
                    <article key={post.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-100 transition-all duration-300 relative overflow-hidden">
                      
                      {/* Top Meta: Author & Category */}
                      <div className="flex items-center justify-between mb-6">
                        <Link 
                          to={`/author/${post.profiles?.id}`} 
                          className="flex items-center gap-3 group"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-blue-100 transition-all">
                            <AvatarImage src={post.profiles?.profile_image_url || ''} />
                            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                              {post.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{post.profiles?.full_name}</p>
                            <p className="text-xs text-slate-400 font-medium">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </Link>
                        
                        {post.categories && (
                          <span className="hidden sm:inline-block px-3 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-full text-xs font-semibold tracking-wide">
                            {post.categories.name}
                          </span>
                        )}
                      </div>

                      {/* Main Content - Clickable */}
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

                            {/* Mobile Category Badge */}
                            {post.categories && (
                              <span className="sm:hidden inline-block mb-4 px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-medium">
                                {post.categories.name}
                              </span>
                            )}

                            {/* Footer Stats */}
                            <div className="flex flex-wrap items-center gap-4 mt-auto pt-2">
                              <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium group-hover:text-slate-600 transition-colors">
                                <Heart className="h-4 w-4" />
                                <span>{post.likes?.[0]?.count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium group-hover:text-slate-600 transition-colors">
                                <MessageCircle className="h-4 w-4" />
                                <span>{post.comments?.[0]?.count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium group-hover:text-slate-600 transition-colors">
                                <Eye className="h-4 w-4" />
                                <span>{post.views || 0}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-blue-500 text-xs font-bold bg-blue-50 px-2 py-1 rounded-md ml-auto sm:ml-0">
                                <Clock className="h-3 w-3" />
                                <span>{post.read_time || 5} min</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Side Image */}
                          {post.post_images?.[0] && (
                            <div className="hidden md:block w-full h-28 rounded-2xl overflow-hidden border border-slate-100">
                              <img 
                                src={post.post_images[0].url} 
                                alt={post.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              />
                            </div>
                          )}
                          
                          {/* Mobile Image */}
                          {post.post_images?.[0] && (
                            <div className="md:hidden w-full h-40 rounded-2xl overflow-hidden border border-slate-100 mb-4 order-first">
                              <img 
                                src={post.post_images[0].url} 
                                alt={post.title} 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                          )}
                        </div>
                      </Link>
                    </article>
                  ))}

                  {/* Load More Trigger */}
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

                  {allPosts.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">No stories found</h3>
                      <p className="text-slate-500">Try adjusting your filters or search query.</p>
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
