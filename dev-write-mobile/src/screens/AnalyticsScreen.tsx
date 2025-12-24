import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const AnalyticsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalViews: 0,
    totalComments: 0,
    totalLikes: 0,
    postsThisMonth: 0,
    viewsThisMonth: 0,
  });
  const [chartData, setChartData] = useState({
    viewsData: [0, 0, 0, 0, 0, 0, 0],
    postsData: [0, 0, 0, 0, 0, 0, 0],
  });

  const { isDark } = useTheme();
  const { user } = useAuth();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#ffffff',
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#111827',
      marginBottom: 24,
    },
    statsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 32,
    },
    statCard: {
      width: '48%',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#3b82f6',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    chartContainer: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#f9fafb' : '#111827',
      marginBottom: 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 18,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
    },
  });

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's posts with views count
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          id, 
          created_at, 
          is_published,
          views,
          views_count,
          likes:likes(count),
          comments:comments(count)
        `)
        .eq('author_id', user.id);

      if (postsError) throw postsError;

      // Get comments on user's posts
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('id, post_id, created_at')
        .in('post_id', posts?.map(p => p.id) || []);

      if (commentsError) throw commentsError;

      // Get likes on user's posts
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('id, post_id, created_at')
        .in('post_id', posts?.map(p => p.id) || []);

      if (likesError) throw likesError;

      // Calculate real stats
      const publishedPosts = posts?.filter(p => p.is_published) || [];
      const totalPosts = publishedPosts.length;
      const totalComments = comments?.length || 0;
      const totalLikes = likes?.length || 0;
      
      // Calculate total views (use views_count if available, fallback to views)
      const totalViews = publishedPosts.reduce((sum, post) => {
        return sum + (post.views_count || post.views || 0);
      }, 0);
      
      // Calculate monthly stats
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      const postsThisMonth = publishedPosts.filter(p => {
        const postDate = new Date(p.created_at);
        return postDate.getMonth() === thisMonth && postDate.getFullYear() === thisYear;
      }).length;

      const viewsThisMonth = publishedPosts.filter(p => {
        const postDate = new Date(p.created_at);
        return postDate.getMonth() === thisMonth && postDate.getFullYear() === thisYear;
      }).reduce((sum, post) => {
        return sum + (post.views_count || post.views || 0);
      }, 0);

      const commentsThisMonth = comments?.filter(c => {
        const commentDate = new Date(c.created_at);
        return commentDate.getMonth() === thisMonth && commentDate.getFullYear() === thisYear;
      }).length || 0;

      const likesThisMonth = likes?.filter(l => {
        const likeDate = new Date(l.created_at);
        return likeDate.getMonth() === thisMonth && likeDate.getFullYear() === thisYear;
      }).length || 0;

      // Generate real chart data for last 7 days
      const last7Days = [];
      const viewsData = [];
      const postsData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayViews = publishedPosts
          .filter(p => p.created_at.split('T')[0] === dateStr)
          .reduce((sum, post) => sum + (post.views_count || post.views || 0), 0);
        
        const dayPosts = publishedPosts.filter(p => p.created_at.split('T')[0] === dateStr).length;
        
        last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        viewsData.push(dayViews);
        postsData.push(dayPosts);
      }

      setStats({
        totalPosts,
        totalViews,
        totalComments,
        totalLikes,
        postsThisMonth,
        viewsThisMonth,
      });

      setChartData({
        viewsData,
        postsData,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    backgroundGradientFrom: isDark ? '#1f2937' : '#ffffff',
    backgroundGradientTo: isDark ? '#1f2937' : '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(156, 163, 175, ${opacity})` : `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#3b82f6',
    },
  };

  const pieChartConfig = {
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(156, 163, 175, ${opacity})` : `rgba(107, 114, 128, ${opacity})`,
  };

  if (loading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Analytics</Text>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalPosts}</Text>
          <Text style={styles.statLabel}>Total Posts</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalViews}</Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalComments}</Text>
          <Text style={styles.statLabel}>Comments</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalLikes}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Views This Week</Text>
        <LineChart
          data={{
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              data: chartData.viewsData,
            }],
          }}
          width={300}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Posts This Week</Text>
        <BarChart
          data={{
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              data: chartData.postsData,
            }],
          }}
          width={300}
          height={200}
          chartConfig={chartConfig}
          yAxisLabel=""
          yAxisSuffix=""
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>
    </ScrollView>
  );
};

export default AnalyticsScreen;
