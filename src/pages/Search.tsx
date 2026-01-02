import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FollowButton } from '@/components/social/FollowButton';
import {
  Search,
  Users,
  FileText,
  Hash,
  TrendingUp,
  Clock,
  Heart,
  MessageCircle,
  Eye,
  Loader2,
  X,
  Filter,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '@/components/ui/image-fallback';
import { AllAuthors } from '@/components/social/AllAuthors';
import { TrendingPosts } from '@/components/social/TrendingPosts';
import { ProfileBadge } from '@/components/ProfileBadge';
import { useProfileBadge } from '@/hooks/useProfileBadge';

const AuthorBadge = ({ userId }: { userId: string }) => {
  const { badge } = useProfileBadge({ userId });
  if (!badge) return null;
  return <ProfileBadge badge={badge} size="sm" />;
};

const SearchPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'users' | 'tags'>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Custom debounce function
  const debounce = useCallback((func: Function, delay: number) => {
    return (...args: any[]) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => func(...args), delay);
    };
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    if (query.trim()) {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      const updatedHistory = [query, ...history.filter(h => h !== query)].slice(0, 10);
      setSearchHistory(updatedHistory);
      localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
    }
  }, []);

  // Optimized search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debounce(debouncedSearch, 300)(value);
  }, [debouncedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    searchInputRef.current?.blur();
    setIsSearchFocused(false);
  };

  const removeHistoryItem = (item: string) => {
    const updatedHistory = searchHistory.filter(h => h !== item);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };

  // Memoized search query
  const memoizedSearchQuery = useMemo(() => searchQuery.trim(), [searchQuery]);

  // Search posts and users
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search-results', memoizedSearchQuery, activeTab],
    queryFn: async () => {
      const results = { posts: [], users: [], tags: [] };
      const query = memoizedSearchQuery;

      if (!query) {
        // Fetch trending posts for "initial state" (TikTok-like)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [postsRes, authorsRes] = await Promise.all([
          supabase
            .from('posts')
            .select(`
              id, title, slug, excerpt, created_at, views, read_time, featured_image,
              profiles:author_id (id, full_name, profile_image_url, badge),
              likes (count),
              comments (count),
              categories:category_id (name, slug),
              post_images (url, alt_text)
            `)
            .eq('status', 'published')
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('views', { ascending: false })
            .limit(10),
          supabase
            .from('profiles')
            .select(`
              id, full_name, profile_image_url, bio, badge,
              followers:followers!following_id(count),
              posts:posts(count)
            `)
            .limit(50)
        ]);

        results.posts = postsRes.data || [];

        // Sort authors by follower count
        results.users = (authorsRes.data || [])
          .sort((a: any, b: any) => {
            const aFollowers = a.followers?.[0]?.count || 0;
            const bFollowers = b.followers?.[0]?.count || 0;
            return bFollowers - aFollowers;
          })
          .slice(0, 5);

        return results;
      }

      // Search posts
      if (activeTab === 'all' || activeTab === 'posts') {
        const { data: posts } = await supabase
          .from('posts')
          .select(`
            id, title, slug, excerpt, created_at, views, read_time, featured_image,
            profiles:author_id (id, full_name, profile_image_url, badge),
            likes (count),
            comments (count),
            categories:category_id (name, slug),
            post_images (url, alt_text)
          `)
          .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(20);

        results.posts = posts || [];
      }

      // Search users
      if (activeTab === 'all' || activeTab === 'users') {
        const { data: users } = await supabase
          .from('profiles')
          .select(`
            id, 
            full_name, 
            profile_image_url, 
            bio, 
            created_at,
            badge,
            followers:followers!following_id(count),
            posts:posts(count)
          `)
          .or(`full_name.ilike.%${query}%,bio.ilike.%${query}%`)
          .limit(40);

        // Sort users based on followers and post count
        results.users = (users || []).sort((a: any, b: any) => {
          const aScore = (a.followers?.[0]?.count || 0) * 2 + (a.posts?.[0]?.count || 0);
          const bScore = (b.followers?.[0]?.count || 0) * 2 + (b.posts?.[0]?.count || 0);
          return bScore - aScore;
        }).slice(0, 20);
      }

      // Search tags (categories)
      if (activeTab === 'all' || activeTab === 'tags') {
        const { data: tags } = await supabase
          .from('categories')
          .select('id, name, slug')
          .ilike('name', `%${query}%`)
          .order('name')
          .limit(20);

        results.tags = tags || [];
      }

      return results;
    },
    enabled: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Trending searches
  const { data: trendingSearches } = useQuery({
    queryKey: ['trending-searches'],
    queryFn: async () => {
      // This would typically come from analytics, but for now we'll use popular categories
      const { data: categories } = await supabase
        .from('categories')
        .select('name')
        .order('name')
        .limit(10);

      return categories?.map(c => c.name) || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans ">
      {/* Background Pattern */}
      <div
        className="fixed inset-0 z-0 pointer-events-none dark:opacity-20"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 pt-8 mb-10">
        <Header className="hidden md:block" />
        <main className="container mx-auto px-4 max-w-4xl">
          {/* Search Header */}
          <div className="mb-10 sticky top-0 md:top-[6.5rem] z-30 bg-background/80 backdrop-blur-md pt-4 pb-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search posts, users, or tags..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-lg"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>

            {/* Search Suggestions Dropdown */}
            {isSearchFocused && !searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
                {/* Search History */}
                {searchHistory.length > 0 && (
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Recent</h3>
                      <button
                        onClick={() => {
                          setSearchHistory([]);
                          localStorage.removeItem('searchHistory');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-2">
                      {searchHistory.slice(0, 5).map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer group"
                          onClick={() => handleHistoryClick(item)}
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeHistoryItem(item);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Searches */}
                {trendingSearches && trendingSearches.length > 0 && (
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Trending</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {trendingSearches.map((tag, index) => (
                        <button
                          key={index}
                          onClick={() => handleHistoryClick(tag)}
                          className="px-3 py-1 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Tabs */}
          {searchQuery && (
            <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'all'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'posts'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('tags')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'tags'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                Tags
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {/* Search Results */}
          {searchQuery && searchResults && !isLoading && (
            <div className="space-y-8">
              {/* Posts Results */}
              {(activeTab === 'all' || activeTab === 'posts') && searchResults.posts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Posts ({searchResults.posts.length})
                  </h3>
                  <div className="space-y-4">
                    {searchResults.posts.map((post: any) => (
                      <Link key={post.id} to={`/post/${post.slug}`} className="block group">
                        <Card className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all overflow-hidden">
                          <div className="p-6">
                            <div className="flex items-start gap-4">
                              {/* Post Image */}
                              {(post.featured_image || post.post_images?.[0]) && (
                                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                  <ImageWithFallback
                                    src={post.featured_image || post.post_images[0].url}
                                    alt={post.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>
                              )}

                              {/* Post Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {post.categories && (
                                    <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                                      {post.categories.name}
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-400 dark:text-slate-500">
                                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                  </span>
                                </div>

                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                  {post.title}
                                </h4>

                                {post.excerpt && (
                                  <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-3">
                                    {post.excerpt.replace(/<[^>]*>/g, '')}
                                  </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    {post.likes?.[0]?.count || 0}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" />
                                    {post.comments?.[0]?.count || 0}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {post.views || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Users Results */}
              {(activeTab === 'all' || activeTab === 'users') && searchResults.users.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Users ({searchResults.users.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {searchResults.users.map((user: any) => (
                      <Card key={user.id} className="group p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:border-blue-100 dark:hover:border-blue-900/50 transition-all duration-300">
                        <div className="flex items-start gap-4">
                          <Link to={`/author/${user.id}`} className="shrink-0 relative">
                            <Avatar className="h-16 w-16 border-2 border-white dark:border-slate-900 shadow-md group-hover:ring-4 group-hover:ring-blue-100 dark:group-hover:ring-blue-900/20 transition-all duration-300">
                              <AvatarImage src={user.profile_image_url || ''} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 text-blue-600 dark:text-blue-400 font-bold text-xl">
                                {user.full_name?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </Link>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <Link to={`/author/${user.id}`} className="block group/name">
                                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg truncate group-hover/name:text-blue-600 dark:group-hover/name:text-blue-400 transition-colors flex items-center gap-2">
                                    {user.full_name}
                                    <AuthorBadge userId={user.id} />
                                  </h4>
                                </Link>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                      {user.followers?.[0]?.count || 0}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Followers</span>
                                  </div>
                                  <div className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                      {user.posts?.[0]?.count || 0}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Posts</span>
                                  </div>
                                </div>
                              </div>
                              <FollowButton userId={user.id} size="sm" className="rounded-xl shadow-sm" />
                            </div>
                            {user.bio && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-3">
                                {user.bio}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                          <Link
                            to={`/author/${user.id}`}
                            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                          >
                            View Full Profile
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Results */}
              {(activeTab === 'all' || activeTab === 'tags') && searchResults.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    Tags ({searchResults.tags.length})
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {searchResults.tags.map((tag: any) => (
                      <button
                        key={tag.id}
                        onClick={() => handleHistoryClick(tag.name)}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchResults.posts.length === 0 &&
                searchResults.users.length === 0 &&
                searchResults.tags.length === 0 && (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      No results found
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      Try adjusting your search terms or browse different categories.
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* Initial State - TikTok like results */}
          {!searchQuery && !isSearchFocused && (
            <div className="space-y-12">
              {activeTab === 'users' ? (
                <div className="space-y-6">
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Discover Authors</h2>
                    <p className="text-slate-500 dark:text-slate-400">Meet the creative minds behind the stories on DevWrite.</p>
                  </div>
                  <AllAuthors showSearch={false} />
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Top Authors Section */}
                  {searchResults?.users && searchResults.users.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <TrendingUp className="w-6 h-6 text-orange-500" />
                          Top Authors
                        </h2>

                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.users.map((author: any) => (
                          <Card key={author.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3">
                              <Link to={`/author/${author.id}`} className="shrink-0">
                                <Avatar className="h-12 w-12 border-2 border-white dark:border-slate-900 shadow-sm group-hover:ring-2 group-hover:ring-blue-100 dark:group-hover:ring-blue-900/20 transition-all">
                                  <AvatarImage src={author.profile_image_url} />
                                  <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">
                                    {author.full_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                              <div className="flex-1 min-w-0">
                                <Link to={`/author/${author.id}`} className="block">
                                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                    {author.full_name}
                                    <AuthorBadge userId={author.id} />
                                  </h4>
                                </Link>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                                  {author.followers?.[0]?.count || 0} Followers • {author.posts?.[0]?.count || 0} Posts
                                </p>
                              </div>
                              <FollowButton userId={author.id} size="sm" className="h-8 rounded-lg px-3" />
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-blue-500" />
                        For You
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {searchResults?.posts.map((post: any) => (
                        <Link key={post.id} to={`/post/${post.slug}`} className="block group">
                          <Card className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 overflow-hidden h-full flex flex-col">
                            <div className="aspect-video w-full overflow-hidden relative">
                              <ImageWithFallback
                                src={post.featured_image || post.post_images?.[0]?.url}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              {post.categories && (
                                <div className="absolute top-4 left-4">
                                  <span className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-900 dark:text-slate-100 rounded-full text-xs font-bold shadow-sm">
                                    {post.categories.name}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {post.title}
                              </h3>
                              <div className="flex items-center gap-3 mt-auto pt-4">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={post.profiles?.profile_image_url} />
                                  <AvatarFallback>{post.profiles?.full_name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                      {post.profiles?.full_name}
                                    </span>
                                    {post.profiles?.id && (
                                      <AuthorBadge userId={post.profiles.id} />
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                  <div className="flex items-center gap-1">
                                    <Heart className="h-3 w-3" />
                                    <span className="text-[10px]">{post.likes?.[0]?.count || 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>

                    <div className="pt-8 text-center">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Explore More</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-6">Search for specific topics, authors, or tags.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchPage;
