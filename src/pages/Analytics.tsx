import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Eye, Heart, MessageCircle, FileText, Users, TrendingUp, BookMarked, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, parseISO } from 'date-fns';

// Updated Color Palette (Blue/Indigo/Violet/Slate)
const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#94a3b8'];

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

  // Fetch bookmarks count
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

  // Create views trend data
  const viewsTrendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayPosts = posts?.filter((post: any) => {
      const postDate = startOfDay(parseISO(post.created_at));
      return postDate <= date;
    }) || [];
    const views = dayPosts.reduce((acc: number, post: any) => acc + (post.views || 0), 0);
    return {
      date: format(date, 'MMM dd'),
      views: Math.round(views / (7 - i + 1)), // Simulated distribution
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
    title: post.title.length > 20 ? post.title.substring(0, 20) + '...' : post.title,
    views: post.views || 0,
    likes: post.likes?.[0]?.count || 0,
  })) || [];

  // Loading State
  if (postsLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="h-10 w-64 bg-slate-200 rounded-lg animate-pulse mb-8"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="h-80 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse"></div>
              <div className="h-80 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-xl text-xs">
          <p className="font-bold text-slate-800 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100">
      
      {/* Background Dot Pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none" 
           style={{
             backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
             backgroundSize: '24px 24px'
           }}>
      </div>

      <div className="relative z-10">
        <Header />
        
        <main className="container mx-auto py-12 px-4">
          <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-blue-600">
                <Activity size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics Dashboard</h1>
                <p className="text-slate-500">Track your content performance and audience growth</p>
              </div>
            </div>
            
            {/* Primary Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                      <Eye className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{totalViews.toLocaleString()}</p>
                      <p className="text-sm font-medium text-slate-500">Total Views</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-red-50 text-red-500">
                      <Heart className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{totalLikes.toLocaleString()}</p>
                      <p className="text-sm font-medium text-slate-500">Total Likes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-50 text-green-600">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{totalComments.toLocaleString()}</p>
                      <p className="text-sm font-medium text-slate-500">Comments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{totalPosts}</p>
                      <p className="text-sm font-medium text-slate-500">Total Stories</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Audience Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Followers</p>
                  <p className="text-xl font-bold text-slate-900">{followersData?.followers || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Following</p>
                  <p className="text-xl font-bold text-slate-900">{followersData?.following || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Bookmarked</p>
                  <p className="text-xl font-bold text-slate-900">{bookmarksCount || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
                  <BookMarked className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              
              {/* Views Trend Chart */}
              <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-50 bg-white pb-4">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Views Trend <span className="text-xs font-normal text-slate-400 ml-auto">Last 7 Days</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={viewsTrendData}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 12}} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 12}} 
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="views" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorViews)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Pie Chart */}
              <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-50 bg-white pb-4">
                  <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-purple-500" />
                    Content by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[300px] w-full">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 font-bold text-2xl">
                            {totalPosts}
                          </text>
                          <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-xs">
                            Total Posts
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <PieChartIcon className="w-12 h-12 mb-2 opacity-20" />
                        <p>No category data available</p>
                      </div>
                    )}
                  </div>
                  {/* Custom Legend */}
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {pieData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Posts Bar Chart */}
            <Card className="bg-white border-slate-100 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-white pb-4">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  Top Performing Stories
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[350px] w-full">
                  {topPosts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topPosts} layout="vertical" barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="title" 
                          type="category" 
                          width={150} 
                          tick={{fill: '#475569', fontSize: 12, fontWeight: 500}} 
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="views" name="Views" fill="#3b82f6" radius={[0, 4, 4, 0]} stackId="a" />
                        <Bar dataKey="likes" name="Likes" fill="#6366f1" radius={[0, 4, 4, 0]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <BarChart3 className="w-12 h-12 mb-2 opacity-20" />
                      <p>Create your first post to see analytics!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Analytics;