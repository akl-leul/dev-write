import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  views_count: number;
  views: number;
  read_time: number;
  featured_image: string | null;
  category_id: string | null;
  categories?: { name: string; slug: string } | null;
  is_bookmarked?: boolean;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  likes?: Array<{ count: number }>;
  comments?: Array<{ count: number }>;
}

interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgReadTime: number;
  topPerformingPost?: Post;
  recentActivity: Array<{
    id: string;
    type: 'post_created' | 'post_published' | 'comment_received' | 'like_received';
    message: string;
    timestamp: string;
  }>;
}

interface ViewAnalytics {
  date: string;
  views: number;
  likes: number;
  comments: number;
}

const WriterDashboard: React.FC<{ navigation: any }> = ({ navigation }: { navigation: any }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    avgReadTime: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewAnalytics, setViewAnalytics] = useState<ViewAnalytics[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [uniqueKeyPrefix, setUniqueKeyPrefix] = useState(() => `dashboard-${Date.now()}`);

  const { isDark } = useTheme();
  const { user } = useAuth();

  const colors = {
    bg: isDark ? '#000000' : '#F9FAFB',
    cardBg: isDark ? '#1C1C1E' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#8E8E93' : '#6B7280',
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    border: isDark ? '#2C2C2E' : '#E5E7EB',
    inputBg: isDark ? '#1C1C1E' : '#FFFFFF',
    shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch posts with analytics
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          categories:category_id (name, slug),
          likes (count),
          comments (count)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const postsData = posts || [];
      
      // Debug: Log the raw data
      console.log('Fetched posts:', postsData.length);
      console.log('Sample post data:', postsData.slice(0, 2));
      
      // Calculate stats
      const publishedPosts = postsData.filter((p: Post) => p.status === 'published');
      const draftPosts = postsData.filter((p: Post) => p.status === 'draft');
      
      // Debug: Log filtered data
      console.log('Published posts:', publishedPosts.length);
      console.log('Published posts with views:', publishedPosts.map(p => ({ title: p.title, views: p.views, views_count: p.views_count })));
      
      const totalViews = publishedPosts.reduce((sum: number, p: Post) => sum + (p.views || 0), 0);
      
      // Debug: Log final calculation
      console.log('Total views calculated:', totalViews);
      const totalLikes = publishedPosts.reduce((sum: number, p: Post) => sum + (p.likes?.[0]?.count || 0), 0);
      const totalComments = publishedPosts.reduce((sum: number, p: Post) => sum + (p.comments?.[0]?.count || 0), 0);
      const totalShares = publishedPosts.reduce((sum: number, p: Post) => sum + (p.shares_count || 0), 0);
      const avgReadTime = publishedPosts.length > 0 
        ? publishedPosts.reduce((sum: number, p: Post) => sum + (p.read_time || 5), 0) / publishedPosts.length 
        : 0;

      // Find top performing post
      const topPerformingPost = publishedPosts.reduce((top: Post, post: Post) => 
        (post.views || 0) > (top.views || 0) ? post : top, publishedPosts[0]);

      // Generate view analytics for the selected period
      const analytics = generateAnalytics(postsData, selectedPeriod);
      setViewAnalytics(analytics);

      // Generate recent activity
      const activity = generateRecentActivity(postsData);

      setStats({
        totalPosts: postsData.length,
        publishedPosts: publishedPosts.length,
        draftPosts: draftPosts.length,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        avgReadTime,
        topPerformingPost,
        recentActivity: activity,
      });

      setRecentPosts(postsData.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Generate analytics data
  const generateAnalytics = (posts: Post[], period: '7d' | '30d' | '90d'): ViewAnalytics[] => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const analytics: ViewAnalytics[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const postsOnDate = posts.filter((post: Post) => {
        const postDate = new Date(post.created_at);
        return postDate.toDateString() === date.toDateString();
      });
      
      analytics.push({
        date: dateStr,
        views: postsOnDate.reduce((sum: number, p: Post) => sum + (p.views || 0), 0),
        likes: postsOnDate.reduce((sum: number, p: Post) => sum + (p.likes?.[0]?.count || 0), 0),
        comments: postsOnDate.reduce((sum: number, p: Post) => sum + (p.comments?.[0]?.count || 0), 0),
      });
    }
    
    return analytics;
  };

  // Generate recent activity
  const generateRecentActivity = (posts: Post[]) => {
    const activity: DashboardStats['recentActivity'] = [];
    
    posts.slice(0, 10).forEach((post: Post, postIndex: number) => {
      activity.push({
        id: `${uniqueKeyPrefix}-activity-${postIndex}-created-${post.id}`,
        type: 'post_created',
        message: `Created post "${post.title}"`,
        timestamp: post.created_at,
      });
      
      if (post.status === 'published') {
        activity.push({
          id: `${uniqueKeyPrefix}-activity-${postIndex}-published-${post.id}`,
          type: 'post_published',
          message: `Published "${post.title}"`,
          timestamp: post.updated_at,
        });
      }
      
      const commentCount = post.comments?.[0]?.count || 0;
      if (commentCount > 0) {
        activity.push({
          id: `${uniqueKeyPrefix}-activity-${postIndex}-comments-${post.id}`,
          type: 'comment_received',
          message: `Received ${commentCount} comment${commentCount > 1 ? 's' : ''} on "${post.title}"`,
          timestamp: post.updated_at,
        });
      }
    });
    
    return activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, selectedPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderStatCard = (title: string, value: string | number, icon: string, color: string, subtitle?: string) => (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBubble, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && <Text style={[styles.statSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  const renderRecentPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={[styles.postItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
      onPress={() => navigation.navigate('Create', { postId: item.id, isEdit: true })}
    >
      <View style={styles.postContent}>
        <Text style={[styles.postTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.postExcerpt, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.excerpt || 'No excerpt available'}
        </Text>
        <View style={styles.postMeta}>
          <View style={[
            styles.statusBadge,
            item.status === 'published' ? styles.publishedBadge : styles.draftBadge
          ]}>
            <Text style={styles.statusText}>
              {item.status === 'published' ? 'Published' : 'Draft'}
            </Text>
          </View>
          <Text style={[styles.postDate, { color: colors.textSecondary }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
      <View style={styles.postStats}>
        <View style={styles.statRow}>
          <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {formatNumber(item.views || 0)}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Ionicons name="heart-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {formatNumber(item.likes?.[0]?.count || 0)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderActivityItem = ({ item }: { item: DashboardStats['recentActivity'][0] }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'post_created': return 'document-text-outline';
        case 'post_published': return 'checkmark-circle-outline';
        case 'comment_received': return 'chatbubble-outline';
        case 'like_received': return 'heart-outline';
        default: return 'information-circle-outline';
      }
    };

    const getColor = () => {
      switch (item.type) {
        case 'post_created': return colors.primary;
        case 'post_published': return colors.success;
        case 'comment_received': return colors.warning;
        case 'like_received': return colors.error;
        default: return colors.textSecondary;
      }
    };

    return (
      <View style={styles.activityItem}>
        <View style={[styles.activityIcon, { backgroundColor: getColor() + '15' }]}>
          <Ionicons name={getIcon() as any} size={16} color={getColor()} />
        </View>
        <View style={styles.activityContent}>
          <Text style={[styles.activityMessage, { color: colors.textPrimary }]}>
            {item.message}
          </Text>
          <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
            {new Date(item.timestamp).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textPrimary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Writer Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track your writing performance and analytics
          </Text>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['7d', '30d', '90d'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && [styles.activePeriod, { backgroundColor: colors.primary }]
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period && styles.activePeriodText
              ]}>
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {renderStatCard('Total Posts', stats.totalPosts, 'document-text', colors.primary)}
          {renderStatCard('Published', stats.publishedPosts, 'checkmark-circle', colors.success)}
          {renderStatCard('Total Views', formatNumber(stats.totalViews), 'eye', colors.warning)}
          {renderStatCard('Total Likes', formatNumber(stats.totalLikes), 'heart', colors.error)}
        </View>

        {/* Analytics Chart */}
        <View style={[styles.chartContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Performance Analytics</Text>
          {viewAnalytics.length > 0 ? (
            <View style={styles.simpleChart}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {viewAnalytics.map((item, index) => (
                  <View key={`${uniqueKeyPrefix}-chart-${index}-${item.date.replace(/\s+/g, '-')}`} style={styles.chartColumn}>
                    <Text style={[styles.chartDate, { color: colors.textSecondary }]}>
                      {item.date.split(' ')[0]}
                    </Text>
                    <View style={styles.chartBars}>
                      <View style={[
                        styles.chartBar,
                        { 
                          height: Math.min((item.views / Math.max(...viewAnalytics.map(d => d.views))) * 100, 100),
                          backgroundColor: colors.primary 
                        }
                      ]} />
                      <View style={[
                        styles.chartBar,
                        { 
                          height: Math.min((item.likes / Math.max(...viewAnalytics.map(d => d.likes))) * 100, 100),
                          backgroundColor: colors.error 
                        }
                      ]} />
                      <View style={[
                        styles.chartBar,
                        { 
                          height: Math.min((item.comments / Math.max(...viewAnalytics.map(d => d.comments))) * 100, 100),
                          backgroundColor: colors.warning 
                        }
                      ]} />
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Views</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Likes</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>Comments</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No data available for selected period
              </Text>
            </View>
          )}
        </View>

        {/* Top Performing Post */}
        {stats.topPerformingPost && (
          <View style={[styles.topPostContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Top Performing Post</Text>
            <TouchableOpacity
              style={styles.topPost}
              onPress={() => navigation.navigate('Create', { postId: stats.topPerformingPost!.id, isEdit: true })}
            >
              {stats.topPerformingPost.featured_image && (
                <Image source={{ uri: stats.topPerformingPost.featured_image }} style={styles.topPostImage} />
              )}
              <View style={styles.topPostContent}>
                <Text style={[styles.topPostTitle, { color: colors.textPrimary }]}>
                  {stats.topPerformingPost.title}
                </Text>
                <Text style={[styles.topPostExcerpt, { color: colors.textSecondary }]} numberOfLines={2}>
                  {stats.topPerformingPost.excerpt}
                </Text>
                <View style={styles.topPostStats}>
                  <View style={styles.statRow}>
                    <Ionicons name="eye" size={16} color={colors.primary} />
                    <Text style={[styles.statText, { color: colors.textPrimary }]}>
                      {formatNumber(stats.topPerformingPost.views || 0)} views
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Ionicons name="heart" size={16} color={colors.error} />
                    <Text style={[styles.statText, { color: colors.textPrimary }]}>
                      {formatNumber(stats.topPerformingPost.likes?.[0]?.count || 0)} likes
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Posts */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Posts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Create')}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Create New</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentPosts}
            renderItem={renderRecentPost}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No posts yet. Start writing!
                </Text>
              </View>
            }
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent Activity</Text>
          {stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((item) => (
              <View key={item.id}>{renderActivityItem({ item })}</View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No recent activity
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activePeriod: {},
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activePeriodText: {
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  chartContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleChart: {
    paddingVertical: 16,
  },
  chartColumn: {
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 60,
  },
  chartDate: {
    fontSize: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 4,
  },
  chartBar: {
    width: 8,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
  },
  topPostContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  topPost: {
    flexDirection: 'row',
  },
  topPostImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  topPostContent: {
    flex: 1,
  },
  topPostTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  topPostExcerpt: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  topPostStats: {
    flexDirection: 'row',
    gap: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  postItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  postContent: {
    flex: 1,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  postExcerpt: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  publishedBadge: {
    backgroundColor: '#10B981',
  },
  draftBadge: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  postDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  postStats: {
    justifyContent: 'center',
    marginLeft: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
});

export default WriterDashboard;
