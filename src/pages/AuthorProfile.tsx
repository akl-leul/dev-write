import { useParams, Link } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FollowButton } from '@/components/social/FollowButton';
import { Heart, MessageCircle, Eye, Clock, Users, FileText, Calendar, Loader2, Share2, Copy, Twitter, Facebook, Linkedin } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const POSTS_PER_PAGE = 10;

const AuthorProfile = () => {
  const { authorId } = useParams<{ authorId: string }>();
  const { user } = useAuth();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['author-profile', authorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authorId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!authorId,
  });

  const { data: stats } = useQuery({
    queryKey: ['author-stats', authorId],
    queryFn: async () => {
      const [postsRes, followersRes, followingRes] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact' }).eq('author_id', authorId).eq('status', 'published'),
        supabase.from('followers').select('id', { count: 'exact' }).eq('following_id', authorId),
        supabase.from('followers').select('id', { count: 'exact' }).eq('follower_id', authorId),
      ]);
      return {
        posts: postsRes.count || 0,
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
      };
    },
    enabled: !!authorId,
  });

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: postsLoading,
  } = useInfiniteQuery({
    queryKey: ['author-posts', authorId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('posts')
        .select(`*, likes (count), comments (count), post_images (url), categories:category_id (name)`)
        .eq('author_id', authorId!)
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
    enabled: !!authorId,
  });

  const { data: followers } = useQuery({
    queryKey: ['author-followers-list', authorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('followers')
        .select('follower_id, profiles:follower_id (id, full_name, profile_image_url, bio)')
        .eq('following_id', authorId!)
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!authorId,
  });

  const { data: following } = useQuery({
    queryKey: ['author-following-list', authorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('followers')
        .select('following_id, profiles:following_id (id, full_name, profile_image_url, bio)')
        .eq('follower_id', authorId!)
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!authorId,
  });

  // Infinite scroll observer
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

  // Generate random background image for each page load
  const generateProfileBackground = () => {
    const backgrounds = [
      'https://images.unsplash.com/photo-1707759642885-42994e023046?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFic3RyYWN0JTIwaW1hZ2VzfGVufDB8fDB8fHww', 
      'https://images.unsplash.com/photo-1755534015012-a9c9dbc53d4b?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGFic3RyYWN0JTIwaW1hZ2VzfGVufDB8MHwwfHx8MA%3D%3D',  
      'https://images.unsplash.com/photo-1690049121171-7cdbf383533b?q=80&w=2215&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3Dt',  
      'https://images.unsplash.com/photo-1690049098415-29f96fca22c0?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fGFic3RyYWN0JTIwaW1hZ2VzfGVufDB8MHwwfHx8MA%3D%3D',
      'https://plus.unsplash.com/premium_photo-1667119472093-242b3e2c501f?q=80&w=2800&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://images.unsplash.com/vector-1753855748130-7a97b4c15e22?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHx0b3BpYy1mZWVkfDR8SWY2NUF1Tk9PeFF8fGVufDB8fHx8fA%3D%3D',
      'https://plus.unsplash.com/premium_photo-1667538960183-82690c60a2a5?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8aW1hZ2VzfGVufDB8MHwwfHx8MA%3D%3D',
      'https://images.unsplash.com/photo-1685926942337-aff9f087a8b8?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGltYWdlc3xlbnwwfDB8MHx8fDA%3D',
      'https://images.unsplash.com/photo-1695214493949-302b31df689d?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTl8fGltYWdlc3xlbnwwfDB8MHx8fDA%3D',
      'https://plus.unsplash.com/premium_vector-1762792065400-e1870b82e187?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxpbGx1c3RyYXRpb25zLWZlZWR8M3x8fGVufDB8fHx8fA%3D%3D',
      'https://images.unsplash.com/vector-1761781321379-b2079a54327f?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxpbGx1c3RyYXRpb25zLWZlZWR8MTh8fHxlbnwwfHx8fHw%3D',
      'https://images.unsplash.com/vector-1763282961442-b0429fb4e70a?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxpbGx1c3RyYXRpb25zLWZlZWR8MjJ8fHxlbnwwfHx8fHw%3D',
      'https://images.unsplash.com/vector-1762984672204-476378d9aef9?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxpbGx1c3RyYXRpb25zLWZlZWR8MzJ8fHxlbnwwfHx8fHw%3D',
      'https://images.unsplash.com/vector-1763449577047-d1095d2ee05a?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxpbGx1c3RyYXRpb25zLWZlZWR8Mzh8fHxlbnwwfHx8fHw%3D',
      'https://plus.unsplash.com/premium_vector-1761371032807-dc44148706a2?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxpbGx1c3RyYXRpb25zLWZlZWR8Mzl8fHxlbnwwfHx8fHw%3D',
      'https://plus.unsplash.com/premium_vector-1762359738304-cae7571f2220?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxpbGx1c3RyYXRpb25zLWZlZWR8NDd8fHxlbnwwfHx8fHw%3D',
      'https://images.unsplash.com/vector-1763266642857-589735840399?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxpbGx1c3RyYXRpb25zLWZlZWR8NjB8fHxlbnwwfHx8fHw%3D',

    ];
    
    // Generate random index for variety on each page load
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    return backgrounds[randomIndex];
  };

  const profileBackground = generateProfileBackground();

  const handleShare = (platform: string) => {
    const profileUrl = window.location.href;
    const shareText = `Check out ${profile.full_name}'s profile on Chronicle!`;
    
    const shareUrls = {
      x: `https://x.com/intent/tweet?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(shareText)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
    };
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(profileUrl);
      toast.success('Profile link copied to clipboard!');
    } else {
      window.open(shareUrls[platform as keyof typeof shareUrls], '_blank');
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Author not found</h1>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === authorId;

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none dark:opacity-20" 
           style={{ backgroundImage: 'radial-gradient(hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10">
        <Header />
        
        <main className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto">
            
            {/* Profile Header Card */}
            <Card className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden mb-8">
              <div className="h-48 relative">
                <img 
                  src={profileBackground} 
                  alt="Profile background" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              
              <div className="px-6 sm:px-8 pb-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4  mb-6">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-xl">
                    <AvatarImage src={profile.profile_image_url || ''} />
                    <AvatarFallback className="bg-slate-900 text-white text-3xl font-bold">
                      {profile.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">{profile.full_name}</h1>
                    {profile.bio && <p className="text-slate-500 line-clamp-2">{profile.bio}</p>}
                  </div>
                  
                  <div className="flex gap-2">
                    {!isOwnProfile && <FollowButton userId={authorId!} size="default" />}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="default" className="rounded-xl">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-lg">
                        <DropdownMenuItem onClick={() => handleShare('copy')} className="focus:bg-slate-400 cursor-pointer">
                          <Copy className="h-4 w-4 mr-2 text-slate-400" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare('x')} className="focus:bg-slate-400 cursor-pointer">
                          <Twitter className="h-4 w-4 mr-2 text-blue-400" />
                          X
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare('facebook')} className="focus:bg-slate-400 cursor-pointer">
                          <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                          Facebook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare('linkedin')} className="focus:bg-slate-400 cursor-pointer">
                          <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
                          LinkedIn
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {isOwnProfile && (
                      <Button variant="outline" asChild className="rounded-xl">
                        <Link to="/profile">Edit Profile</Link>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex justify-center sm:justify-start gap-8 pt-4 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats?.posts || 0}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1"><FileText className="w-3 h-3" /> Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats?.followers || 0}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{stats?.following || 0}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> Following</p>
                  </div>
                </div>

                {profile.created_at && (
                  <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                  </p>
                )}
              </div>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="w-full justify-start bg-white border border-slate-100 rounded-2xl p-1 mb-6">
                <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
                  Posts ({stats?.posts || 0})
                </TabsTrigger>
                <TabsTrigger value="followers" className="rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
                  Followers ({stats?.followers || 0})
                </TabsTrigger>
                <TabsTrigger value="following" className="rounded-xl data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
                  Following ({stats?.following || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="space-y-6">
                {postsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : allPosts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No posts yet</p>
                  </div>
                ) : (
                  <>
                    {allPosts.map((post: any) => (
                      <Link key={post.id} to={`/post/${post.slug}`} className="block group">
                        <article className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all">
                          <div className="flex items-center justify-between mb-3">
                            {post.categories && (
                              <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-medium">
                                {post.categories.name}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p className="text-slate-500 line-clamp-2 mb-4">{post.excerpt}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.likes?.[0]?.count || 0}</span>
                            <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.comments?.[0]?.count || 0}</span>
                            <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {post.views || 0}</span>
                            <span className="flex items-center gap-1 text-blue-500"><Clock className="w-4 h-4" /> {post.read_time || 5} min</span>
                          </div>
                        </article>
                      </Link>
                    ))}
                    
                    <div ref={loadMoreRef} className="py-4 flex justify-center">
                      {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-blue-600" />}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="followers" className="space-y-4">
                {followers?.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No followers yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {followers?.map((f: any) => (
                      <Link key={f.follower_id} to={`/author/${f.profiles.id}`} className="block">
                        <Card className="p-4 bg-white hover:shadow-md transition-shadow rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={f.profiles.profile_image_url || ''} />
                              <AvatarFallback className="bg-slate-100 font-bold">
                                {f.profiles.full_name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{f.profiles.full_name}</p>
                              {f.profiles.bio && <p className="text-sm text-slate-500 truncate">{f.profiles.bio}</p>}
                            </div>
                            <FollowButton userId={f.profiles.id} size="sm" />
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="following" className="space-y-4">
                {following?.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Not following anyone yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {following?.map((f: any) => (
                      <Link key={f.following_id} to={`/author/${f.profiles.id}`} className="block">
                        <Card className="p-4 bg-white hover:shadow-md transition-shadow rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={f.profiles.profile_image_url || ''} />
                              <AvatarFallback className="bg-slate-100 font-bold">
                                {f.profiles.full_name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{f.profiles.full_name}</p>
                              {f.profiles.bio && <p className="text-sm text-slate-500 truncate">{f.profiles.bio}</p>}
                            </div>
                            <FollowButton userId={f.profiles.id} size="sm" />
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuthorProfile;