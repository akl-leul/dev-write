import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Users,
  MessageSquare,
  Heart,
  Bookmark,
  Eye,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  UserPlus,
  Zap,
  Target,
  Award,
  Star,
} from "lucide-react";

// Create untyped client for database operations
const supabaseClient = supabase as any;

interface DatabaseStats {
  posts: number;
  users: number;
  blockedUsers: number;
  comments: number;
  likes: number;
  bookmarks: number;
  totalViews: number;
  recentPosts: any[];
  recentUsers: any[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DatabaseStats>({
    posts: 0,
    users: 0,
    blockedUsers: 0,
    comments: 0,
    likes: 0,
    bookmarks: 0,
    totalViews: 0,
    recentPosts: [],
    recentUsers: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      console.log('Fetching database stats...');
      
      // Fetch all database data
      const [
        postsResult,
        usersResult, 
        commentsResult,
        likesResult,
        bookmarksResult,
        recentPostsResult,
        recentUsersResult
      ] = await Promise.all([
        supabaseClient.from('posts').select('id', { count: 'exact', head: true }),
        supabaseClient.from('profiles').select('id, blocked', { count: 'exact', head: true }),
        supabaseClient.from('comments').select('id', { count: 'exact', head: true }),
        supabaseClient.from('likes').select('id', { count: 'exact', head: true }),
        supabaseClient.from('bookmarks').select('id', { count: 'exact', head: true }),
        supabaseClient.from('posts').select('id, title, created_at, author_id').order('created_at', { ascending: false }).limit(5),
        supabaseClient.from('profiles').select('id, full_name, created_at, blocked').order('created_at', { ascending: false }).limit(5)
      ]);

      // Fetch total views
      const { data: postsData } = await supabaseClient
        .from('posts')
        .select('views_count');

      const totalViews = postsData?.reduce((sum: number, post: any) => sum + (post.views_count || 0), 0) || 0;

      // Count blocked users separately
      const { data: blockedUsersData } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('blocked', true);

      const newStats = {
        posts: postsResult.count || 0,
        users: usersResult.count || 0,
        blockedUsers: blockedUsersData?.length || 0,
        comments: commentsResult.count || 0,
        likes: likesResult.count || 0,
        bookmarks: bookmarksResult.count || 0,
        totalViews,
        recentPosts: recentPostsResult.data || [],
        recentUsers: recentUsersResult.data || []
      };

      console.log('Database stats fetched:', newStats);
      setStats(newStats);
      
    } catch (error) {
      console.error('Error fetching database stats:', error);
      toast.error('Failed to load database statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8">
        {/* Hero Section with Key Metrics */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Dashboard Overview</h1>
                <p className="text-blue-100">Real-time platform analytics and insights</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm text-blue-100">Total Posts</span>
                </div>
                <p className="text-2xl font-bold">{stats.posts}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-300" />
                  <span className="text-xs text-green-300">Active</span>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm text-blue-100">Total Users</span>
                </div>
                <p className="text-2xl font-bold">{stats.users}</p>
                <div className="flex items-center gap-1 mt-1">
                  <UserPlus className="h-3 w-3 text-green-300" />
                  <span className="text-xs text-green-300">Growing</span>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm text-blue-100">Total Views</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Activity className="h-3 w-3 text-yellow-300" />
                  <span className="text-xs text-yellow-300">Engaged</span>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm text-blue-100">Interactions</span>
                </div>
                <p className="text-2xl font-bold">{stats.likes + stats.comments + stats.bookmarks}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Zap className="h-3 w-3 text-purple-300" />
                  <span className="text-xs text-purple-300">Dynamic</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards with Enhanced Visuals */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Platform Analytics</h2>
              <p className="text-muted-foreground">Key performance indicators and metrics</p>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full -mr-10 -mt-10"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">+12%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Published Posts</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.posts}</p>
                  <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full -mr-10 -mt-10"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">+8%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Users</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.users}</p>
                  <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-green-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-100 dark:bg-purple-900/20 rounded-full -mr-10 -mt-10"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                    <Heart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">+24%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Likes</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.likes}</p>
                  <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-4/5 bg-purple-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-100 dark:bg-indigo-900/20 rounded-full -mr-10 -mt-10"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl">
                    <Eye className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">+15%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Page Views</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.totalViews.toLocaleString()}</p>
                  <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full w-5/6 bg-indigo-600 rounded-full"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Charts Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Engagement Metrics Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <PieChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>Engagement Overview</CardTitle>
                    <p className="text-sm text-muted-foreground">User interaction metrics</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Last 30 days</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Bar Chart Visualization */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Comments</span>
                    <span className="text-sm text-muted-foreground">{stats.comments}</span>
                  </div>
                  <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-end pr-3"
                      style={{ width: `${Math.min((stats.comments / Math.max(stats.comments, 1)) * 100, 100)}%` }}
                    >
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Likes</span>
                    <span className="text-sm text-muted-foreground">{stats.likes}</span>
                  </div>
                  <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg flex items-center justify-end pr-3"
                      style={{ width: `${Math.min((stats.likes / Math.max(stats.likes, 1)) * 100, 100)}%` }}
                    >
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bookmarks</span>
                    <span className="text-sm text-muted-foreground">{stats.bookmarks}</span>
                  </div>
                  <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-end pr-3"
                      style={{ width: `${Math.min((stats.bookmarks / Math.max(stats.bookmarks, 1)) * 100, 100)}%` }}
                    >
                      <Bookmark className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
                
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.comments}</div>
                    <div className="text-xs text-muted-foreground">Comments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600">{stats.likes}</div>
                    <div className="text-xs text-muted-foreground">Likes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.bookmarks}</div>
                    <div className="text-xs text-muted-foreground">Bookmarks</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <CardTitle>Quick Actions</CardTitle>
                  <p className="text-sm text-muted-foreground">Common tasks</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg text-left transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium">View All Posts</div>
                    <div className="text-xs text-muted-foreground">Manage content</div>
                  </div>
                </div>
              </button>
              
              <button className="w-full p-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg text-left transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">User Management</div>
                    <div className="text-xs text-muted-foreground">View users</div>
                  </div>
                </div>
              </button>
              
              <button className="w-full p-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 rounded-lg text-left transition-colors">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="text-sm font-medium">Analytics</div>
                    <div className="text-xs text-muted-foreground">View reports</div>
                  </div>
                </div>
              </button>
              
              <button className="w-full p-3 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 rounded-lg text-left transition-colors">
                <div className="flex items-center gap-3">
                  <Award className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="text-sm font-medium">Achievements</div>
                    <div className="text-xs text-muted-foreground">Platform stats</div>
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Recent Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Posts with Enhanced Visuals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>Recent Posts</CardTitle>
                    <p className="text-sm text-muted-foreground">Latest published content</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Clock className="h-4 w-4" />
                  <span>Live</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentPosts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full w-12 h-12 mx-auto mb-3">
                    <FileText className="h-6 w-6 text-slate-400 mx-auto" />
                  </div>
                  <p className="text-muted-foreground">No posts found</p>
                  <p className="text-sm text-muted-foreground mt-1">Posts will appear here once published</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentPosts.map((post: any, index) => (
                    <div key={post.id} className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded">
                                <FileText className="h-3 w-3 text-blue-600 dark:text-400" />
                              </div>
                              <span className="text-xs font-medium text-blue Privileged">POST</span>
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {post.title || 'Untitled Post'}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(post.created_at).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Users with Enhanced Visuals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle>Recent Users</CardTitle>
                    <p className="text-sm text-muted-foreground">Newest platform members</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <UserPlus className="h-4 w-4" />
                  <span>Active</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentUsers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full w-12 h-12 mx-auto mb-3">
                    <Users className="h-6 w-6 text-slate-400 mx-auto" />
                  </div>
                  <p className="text-muted-foreground">No users found</p>
                  <p className="text-sm text-muted-foreground mt-1">Users will appear here once registered</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentUsers.map((user: any, index) => (
                    <div key={user.id} className="group relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-800 transition-all">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1 bg-green-100 dark:bg-green-900/20 rounded">
                                <Users className="h-3 w-3 text-green-600 dark:text-green-400" />
                              </div>
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">USER</span>
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                              {user.full_name || user.email || 'Anonymous User'}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(user.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span>New Member</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-center">
          <button
            onClick={fetchDatabaseStats}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Refresh Database Stats
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};
