import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FollowButton } from '@/components/social/FollowButton';
import { Users, Loader2, Search, User, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const DiscoverAuthors = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allAuthors, isLoading } = useQuery({
    queryKey: ['discover-authors', searchQuery],
    queryFn: async () => {
      // Get all authors who have published posts
      const { data: authorsWithPosts, error: postsError } = await supabase
        .from('posts')
        .select('author_id')
        .eq('status', 'published')
        .neq('author_id', user?.id || 'anonymous');

      if (postsError) throw postsError;

      // Get unique author IDs
      const authorIds = [...new Set(authorsWithPosts?.map(p => p.author_id) || [])];

      if (authorIds.length === 0) return [];

      // Get author profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get posts count for each author
      const { data: postsCount, error: countError } = await supabase
        .from('posts')
        .select('author_id, count', { count: 'exact' })
        .eq('status', 'published')
        .in('author_id', authorIds)
        .group('author_id');

      if (countError) throw countError;

      // Get followers count for each author
      const { data: followersCount, error: followersError } = await supabase
        .from('followers')
        .select('following_id, count', { count: 'exact' })
        .in('following_id', authorIds)
        .group('following_id');

      if (followersError) throw followersError;

      // Get current user's following list
      const { data: followingList, error: followingError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user?.id || '');

      if (followingError && user) throw followingError;

      const followingIds = new Set(followingList?.map(f => f.following_id) || []);

      // Combine data
      const authorsWithStats = profiles?.map(profile => {
        const postsCountData = postsCount?.find(p => p.author_id === profile.id);
        const followersCountData = followersCount?.find(f => f.following_id === profile.id);
        
        return {
          ...profile,
          posts_count: postsCountData?.count || 0,
          followers_count: followersCountData?.count || 0,
          is_following: followingIds.has(profile.id),
        };
      }) || [];

      // Filter by search query
      if (searchQuery) {
        return authorsWithStats.filter(author =>
          author.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          author.bio?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return authorsWithStats;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="container py-20 text-center">
          <div className="max-w-md mx-auto bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <Users className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Sign in to Discover Authors
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Create an account or sign in to discover and follow amazing authors.
            </p>
            <Button
              onClick={() => window.location.href = '/auth'}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
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
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                Discover Authors
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Find and follow talented writers from our community. Discover new perspectives and stay updated with their latest posts.
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search authors by name or bio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </form>

            {/* Authors Grid */}
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : !allAuthors || allAuthors.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {searchQuery ? 'No authors found' : 'No authors available'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {searchQuery 
                    ? 'Try adjusting your search terms to find more authors.'
                    : 'Be the first to publish content and become discoverable!'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allAuthors.map((author) => (
                  <Card key={author.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="h-12 w-12 border-2 border-slate-100 dark:border-slate-700">
                          <AvatarImage 
                            src={author.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.full_name || 'user'}`} 
                          />
                          <AvatarFallback className="bg-slate-900 text-white font-bold">
                            {author.full_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {author.full_name || 'Unknown Author'}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Joined {author.created_at ? format(new Date(author.created_at), 'MMM yyyy') : 'Unknown'}
                          </p>
                        </div>
                      </div>

                      {author.bio && !author.bio.startsWith('Google user') && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                          {author.bio}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-6 mb-4 text-sm">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <FileText className="w-4 h-4" />
                          <span>{author.posts_count}</span>
                          <span className="hidden sm:inline">posts</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Users className="w-4 h-4" />
                          <span>{author.followers_count}</span>
                          <span className="hidden sm:inline">followers</span>
                        </div>
                      </div>

                      {/* Follow Button */}
                      <div className="flex gap-2">
                        <FollowButton 
                          userId={author.id} 
                          size="sm"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="flex-1"
                        >
                          <a href={`/author/${author.id}`}>
                            View Profile
                          </a>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DiscoverAuthors;
