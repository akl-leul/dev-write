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
import { Heart, MessageCircle, Eye, Clock, Users, FileText, Calendar, Loader2, Share2, Copy, Twitter, Facebook, Linkedin, User, Instagram, Github, Youtube, Globe, Phone } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { ProfileBadge } from '@/components/ProfileBadge';
import { useProfileBadge } from '@/hooks/useProfileBadge';
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

  // Get author badge based on stats
  const { badge } = useProfileBadge({
    userId: authorId || '',
    postsCount: stats?.posts || 0,
    followersCount: stats?.followers || 0,
    likesCount: 0, // We don't have likes data yet
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

  // Use custom background image if available, otherwise use random background
  const profileBackground = (profile as any)?.background_image_url || generateProfileBackground();

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
      <div className="min-h-screen bg-background dark:bg-slate-900">
        <Header />
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Author not found</h1>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === authorId;

  return (
    <div className="min-h-screen bg-background dark:bg-slate-900 font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none dark:opacity-20" 
           style={{ backgroundImage: 'radial-gradient(hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10">
        <Header />
        
        <main className="container mx-auto py-8 px-4">
          <div className="max-w-4xl mx-auto">
            
            {/* Profile Header Card */}
            <Card className="bg-card dark:bg-slate-900 rounded-3xl border border-border dark:border-slate-800 shadow-sm overflow-hidden mb-8">
              <div className="h-48 relative">
                <img 
                  src={profileBackground} 
                  alt="Profile background" 
                  className="w-full h-full object-cover"
                />

                {/* Stronger fade with smoother gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-white/30 to-transparent" />
              </div>

              <div className="px-6 sm:px-8 pb-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-300 via-yellow-300 to-blue-300 opacity-30 blur-md scale-110" />
                    <Avatar className="relative h-32 w-32 border-4 border-white dark:border-slate-800 shadow-xl ring-4 ring-slate-100 dark:ring-slate-700">
                      <AvatarImage src={profile.profile_image_url || ''} />
                      <AvatarFallback className="bg-slate-900 text-white text-3xl font-bold">
                        {profile.full_name?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left sm:ml-4">
                    <div className="flex flex-col items-center sm:flex-row sm:items-center justify-center sm:justify-start gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 md:text-white font-bold drop-shadow-sm flex items-center gap-2">
                          {profile.full_name || 'Unknown User'}

                          {badge && (
                            <span className="inline-flex items-center justify-center bg-white rounded-full p-1 shadow-lg ring-2 ring-white">
                              <ProfileBadge badge={badge} size="sm" />
                            </span>
                          )}
                        </h1>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {profile.gender ? (
                        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
                          <User className="w-3 h-3 text-slate-500" />
                          <span className="capitalize font-medium">{profile.gender}</span>
                        </div>
                      ) : (
                        isOwnProfile && (
                          <div className="flex items-center gap-1 bg-blue-50/80 backdrop-blur-sm px-2 py-1 rounded-full">
                            <User className="w-3 h-3 text-blue-500" />
                            <span className="text-blue-600 font-medium">Add gender</span>
                          </div>
                        )
                      )}
                      {profile.phone && (profile as any).show_phone && (
                        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span className="font-medium">{profile.phone}</span>
                        </div>
                      )}
                      {profile.created_at && (
                        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span className="font-medium">Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-2 max-w-md bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-3 py-2 rounded-lg">
                      {profile.bio && !profile.bio.startsWith('Google user') ? profile.bio : 'No bio added yet'}
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    {!isOwnProfile && <FollowButton userId={authorId!} size="default" />}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="default" className="rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-white/20 dark:border-slate-700">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-100 dark:border-slate-800 shadow-lg">
                        <DropdownMenuItem onClick={() => handleShare('copy')} className="focus:bg-slate-100 dark:focus:bg-slate-700 cursor-pointer">
                          <Copy className="h-4 w-4 mr-2 text-slate-400" />
                          Copy Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare('x')} className="focus:bg-slate-100 dark:focus:bg-slate-700 cursor-pointer">
                          <Twitter className="h-4 w-4 mr-2 text-blue-400" />
                          X
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare('facebook')} className="focus:bg-slate-100 dark:focus:bg-slate-700 cursor-pointer">
                          <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                          Facebook
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare('linkedin')} className="focus:bg-slate-100 dark:focus:bg-slate-700 cursor-pointer">
                          <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
                          LinkedIn
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {isOwnProfile && (
                      <Button variant="outline" asChild className="rounded-xl bg-white/90 dark:bg-transparent backdrop-blur-sm border-white/20">
                        <Link to="/profile">Edit Profile</Link>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex justify-center sm:justify-start gap-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.posts || 0}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1"><FileText className="w-3 h-3" /> Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.followers || 0}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.following || 0}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1"><Users className="w-3 h-3" /> Following</p>
                  </div>
                </div>

                {profile.created_at && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                  </p>
                )}

                {/* Social Media Links */}
                {((profile as any).twitter || (profile as any).facebook || (profile as any).linkedin || (profile as any).instagram || (profile as any).github || (profile as any).youtube || (profile as any).website) && (
                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Connect</p>
                    <div className="flex flex-wrap gap-3">
                      {(profile as any).twitter && (
                        <a 
                          href={`https://twitter.com/${(profile as any).twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                        >
                          <Twitter className="w-4 h-4" />
                          <span className="text-sm font-medium">Twitter</span>
                        </a>
                      )}
                      {(profile as any).facebook && (
                        <a 
                          href={(profile as any).facebook.startsWith('http') ? (profile as any).facebook : `https://facebook.com/${(profile as any).facebook}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                        >
                          <Facebook className="w-4 h-4" />
                          <span className="text-sm font-medium">Facebook</span>
                        </a>
                      )}
                      {(profile as any).linkedin && (
                        <a 
                          href={(profile as any).linkedin.startsWith('http') ? (profile as any).linkedin : `https://linkedin.com/in/${(profile as any).linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg transition-colors"
                        >
                          <Linkedin className="w-4 h-4" />
                          <span className="text-sm font-medium">LinkedIn</span>
                        </a>
                      )}
                      {(profile as any).instagram && (
                        <a 
                          href={`https://instagram.com/${(profile as any).instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-lg transition-colors"
                        >
                          <Instagram className="w-4 h-4" />
                          <span className="text-sm font-medium">Instagram</span>
                        </a>
                      )}
                      {(profile as any).github && (
                        <a 
                          href={(profile as any).github.startsWith('http') ? (profile as any).github : `https://github.com/${(profile as any).github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg transition-colors"
                        >
                          <Github className="w-4 h-4" />
                          <span className="text-sm font-medium">GitHub</span>
                        </a>
                      )}
                      {(profile as any).youtube && (
                        <a 
                          href={(profile as any).youtube.startsWith('http') ? (profile as any).youtube : `https://youtube.com/${(profile as any).youtube}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        >
                          <Youtube className="w-4 h-4" />
                          <span className="text-sm font-medium">YouTube</span>
                        </a>
                      )}
                      {(profile as any).website && (
                        <a 
                          href={(profile as any).website.startsWith('http') ? (profile as any).website : `https://${(profile as any).website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                          <span className="text-sm font-medium">Website</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="w-full justify-start bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-1 mb-6">
                <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  Posts ({stats?.posts || 0})
                </TabsTrigger>
                <TabsTrigger value="followers" className="rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  Followers ({stats?.followers || 0})
                </TabsTrigger>
                <TabsTrigger value="following" className="rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400">
                  Following ({stats?.following || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="space-y-6">
                {postsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : allPosts.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">No posts yet</p>
                  </div>
                ) : (
                  <>
                    {allPosts.map((post: any) => (
                      <Link key={post.id} to={`/post/${post.slug}`} className="block group">
                        <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-blue-100 dark:hover:border-blue-900/50 transition-all overflow-hidden">
                          {/* Post Image */}
                          {post.post_images && post.post_images.length > 0 && (
                            <div className="aspect-video overflow-hidden">
                              <img 
                                src={post.post_images[0].url} 
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-3">
                              {post.categories && (
                                <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                                  {post.categories.name}
                                </span>
                              )}
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {post.title}
                            </h3>
                            {post.excerpt && (
                              <p className="text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{post.excerpt}</p>
                            )}
                            
                            <div className="flex items-center gap-4 text-sm text-slate-400 dark:text-slate-500">
                              <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> {post.likes?.[0]?.count || 0}</span>
                              <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {post.comments?.[0]?.count || 0}</span>
                              <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {post.views || 0}</span>
                              <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400"><Clock className="w-4 h-4" /> {post.read_time || 5} min</span>
                            </div>
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
                  <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">No followers yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {followers?.map((f: any) => (
                      <Link key={f.follower_id} to={`/author/${f.profiles.id}`} className="block">
                        <Card className="p-4 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={f.profiles.profile_image_url || ''} />
                              <AvatarFallback className="bg-slate-100 dark:bg-slate-800 font-bold">
                                {f.profiles.full_name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{f.profiles.full_name}</p>
                              {f.profiles.bio && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{f.profiles.bio}</p>}
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
                  <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">Not following anyone yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {following?.map((f: any) => (
                      <Link key={f.following_id} to={`/author/${f.profiles.id}`} className="block">
                        <Card className="p-4 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={f.profiles.profile_image_url || ''} />
                              <AvatarFallback className="bg-slate-100 dark:bg-slate-800 font-bold">
                                {f.profiles.full_name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{f.profiles.full_name}</p>
                              {f.profiles.bio && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{f.profiles.bio}</p>}
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
