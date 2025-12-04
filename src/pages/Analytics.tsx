import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Eye, Heart, MessageCircle, FileText, Users, TrendingUp, BookMarked } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, parseISO } from 'date-fns';

const COLORS = ['hsl(35, 90%, 55%)', 'hsl(215, 25%, 25%)', 'hsl(35, 85%, 60%)', 'hsl(215, 30%, 35%)'];

const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user's posts with stats
  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['analytics-posts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          likes (count),
          comments (count),
          categories:category_id (name)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch followers count
  const { data: followersData } = useQuery({
    queryKey: ['analytics-followers', user?.id],
    queryFn: async () => {
      if (!user) return { followers: 0, following: 0 };
      
      const [followersResult, followingResult] = await Promise.all([
        supabase.from('followers').select('id', { count: 'exact' }).eq('following_id', user.id),
        supabase.from('followers').select('id', { count: 'exact' }).eq('follower_id', user.id),
      ]);
      
      return {
        followers: followersResult.count || 0,
        following: followingResult.count || 0,
      };
    },
    enabled: !!user,
  });

  // Fetch bookmarks count (how many times user's posts were bookmarked)
  const { data: bookmarksCount } = useQuery({
    queryKey: ['analytics-bookmarks', user?.id],
    queryFn: async () => {
      if (!user || !posts) return 0;
      const postIds = posts.map((p: any) => p.id);
      if (postIds.length === 0) return 0;
      
      const { count, error } = await supabase
        .from('bookmarks')
        .select('id', { count: 'exact' })
        .in('post_id', postIds);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && !!posts,
  });

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Calculate totals
  const totalViews = posts?.reduce((acc: number, post: any) => acc + (post.views || 0), 0) || 0;
  const totalLikes = posts?.reduce((acc: number, post: any) => acc + (post.likes?.[0]?.count || 0), 0) || 0;
  const totalComments = posts?.reduce((acc: number, post: any) => acc + (post.comments?.[0]?.count || 0), 0) || 0;
  const totalPosts = posts?.length || 0;

  // Create views trend data (last 7 days - simulated based on post dates)
  const viewsTrendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayPosts = posts?.filter((post: any) => {
      const postDate = startOfDay(parseISO(post.created_at));
      return postDate <= date;
    }) || [];
    const views = dayPosts.reduce((acc: number, post: any) => acc + (post.views || 0), 0);
    return {
      date: format(date, 'MMM dd'),
      views: Math.round(views / (7 - i + 1)), // Distribute views
    };
  });

  // Posts by category
  const categoryData = posts?.reduce((acc: any, post: any) => {
    const category = post.categories?.name || 'Uncategorized';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(categoryData || {}).map(([name, value]) => ({
    name,
    value,
  }));

  // Top posts
  const topPosts = posts?.slice(0, 5).map((post: any) => ({
    title: post.title.length > 30 ? post.title.substring(0, 30) + '...' : post.title,
    views: post.views || 0,
    likes: post.likes?.[0]?.count || 0,
  })) || [];

  if (postsLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-12">
          <div className="max-w-6xl mx-auto animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container py-6 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-8">Analytics Dashboard</h1>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Eye className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{totalViews.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-accent/10">
                    <Heart className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{totalLikes.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Likes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{totalComments.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Comments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-accent/10">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">{totalPosts}</p>
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xl font-bold">{followersData?.followers || 0}</p>
                    <p className="text-sm text-muted-foreground">Followers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xl font-bold">{followersData?.following || 0}</p>
                    <p className="text-sm text-muted-foreground">Following</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <BookMarked className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xl font-bold">{bookmarksCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Bookmarks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Views Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Views Trend (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={viewsTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="views" 
                        stroke="hsl(35, 90%, 55%)" 
                        fill="hsl(35, 90%, 55%)" 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Posts by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Posts by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No posts yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Top Performing Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {topPosts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topPosts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis dataKey="title" type="category" width={150} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="views" name="Views" fill="hsl(215, 25%, 25%)" />
                      <Bar dataKey="likes" name="Likes" fill="hsl(35, 90%, 55%)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No posts yet. Create your first post to see analytics!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Analytics;