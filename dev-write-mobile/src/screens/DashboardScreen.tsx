import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Platform,
  Modal,
  FlatList,
  Image,
  Alert,
  Animated,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Eye, Bookmark, Edit3, Trash2, Send, X, Calendar, Clock, MessageCircle, Heart, Share2 } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { supabase } from '../lib/supabase';
import RenderHtml from 'react-native-render-html';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Post {
  id: string;
  title: string;
  content_markdown: string;
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
  post_images?: Array<{ url: string; alt_text?: string }>;
  is_bookmarked?: boolean;
  likes_count?: number;
  comments_count?: number;
}

interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalBookmarks: number;
  totalComments: number;
  lastUpdated?: string;
}

type SheetType = 'all' | 'published' | 'bookmarks' | null;

const PAGE_SIZE = 20;

const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
    totalBookmarks: 0,
    totalComments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType>(null);
  const [sheetPosts, setSheetPosts] = useState<Post[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetPage, setSheetPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sheetRefreshing, setSheetRefreshing] = useState(false);

  // Post viewer state
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerStats, setViewerStats] = useState<{
    likes: number;
    comments: number;
    bookmarks: number;
  } | null>(null);

  // Animations
  const sheetAnimation = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const { isDark } = useTheme();
  const { user } = useAuth();
  const { refreshBookmarks } = useBookmarks();

  // Color palette
  const colors = {
    bg: isDark ? '#000000' : '#F9FAFB',
    cardBg: isDark ? '#1C1C1E' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#8E8E93' : '#6B7280',
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    border: isDark ? '#2C2C2E' : '#E5E7EB',
    inputBg: isDark ? '#1C1C1E' : '#FFFFFF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
  };

  // Sheet animation
  useEffect(() => {
    if (sheetVisible) {
      Animated.parallel([
        Animated.spring(sheetAnimation, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(sheetAnimation, {
          toValue: height,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [sheetVisible]);

  // Fetch stats
  useEffect(() => {
    fetchStats();
  }, [user]);
  
  // Refresh stats when screen comes into focus (to catch bookmark changes from other screens)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStats();
    });
    return unsubscribe;
  }, [navigation]);

  // Fetch posts when sheet opens
  useEffect(() => {
    if (sheetVisible && sheetType) {
      setSheetPage(0);
      setSheetPosts([]);
      setHasMore(true);
      fetchSheetPosts(sheetType, 0, true);
    }
  }, [sheetVisible, sheetType]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Total posts count
      const { count: totalPosts, error: totalError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id);

      if (totalError) throw totalError;

      // Published posts count
      const { count: publishedPosts, error: publishedError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id)
        .eq('status', 'published');

      if (publishedError) throw publishedError;

      // Draft posts count
      const { count: draftPosts, error: draftError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id)
        .eq('status', 'draft');

      if (draftError) throw draftError;

      // Total views - SUM of views
      const { data: postsData, error: viewsError } = await supabase
        .from('posts')
        .select('views')
        .eq('author_id', user.id);

      if (viewsError) throw viewsError;

      const totalViews = postsData?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;

      // Bookmarks count
      const { count: totalBookmarks, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (bookmarksError) throw bookmarksError;

      // Comments count
      const { count: totalComments, error: commentsError } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id);

      if (commentsError) throw commentsError;

      setStats({
        totalPosts: totalPosts || 0,
        publishedPosts: publishedPosts || 0,
        draftPosts: draftPosts || 0,
        totalViews,
        totalBookmarks: totalBookmarks || 0,
        totalComments: totalComments || 0,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      Alert.alert('Error', 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSheetPosts = async (
    type: SheetType,
    page: number,
    reset: boolean = false
  ) => {
    if (!user || !type) return;

    setSheetLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          categories:category_id (name, slug),
          post_images (url, alt_text)
        `);

      // Apply filters based on type
      if (type === 'published') {
        query = query.eq('author_id', user.id).eq('status', 'published');
      } else if (type === 'all') {
        query = query.eq('author_id', user.id);
      } else if (type === 'bookmarks') {
        // Get bookmarked post IDs first
        const { data: bookmarks, error: bookmarksError } = await supabase
          .from('bookmarks')
          .select('post_id')
          .eq('user_id', user.id);

        if (bookmarksError) throw bookmarksError;

        if (!bookmarks || bookmarks.length === 0) {
          setSheetPosts([]);
          setHasMore(false);
          return;
        }

        const postIds = bookmarks.map(b => b.post_id);
        query = query.in('id', postIds);
      }

      // Order and paginate
      query = query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error } = await query;

      if (error) throw error;

      // Check if user has bookmarked these posts
      if (data && data.length > 0) {
        const postIds = data.map(p => p.id);
        const { data: userBookmarks } = await supabase
          .from('bookmarks')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        const bookmarkedIds = new Set(userBookmarks?.map(b => b.post_id) || []);

        const postsWithBookmarks = data.map((post: any) => ({
          ...post,
          is_bookmarked: bookmarkedIds.has(post.id),
        }));

        if (reset) {
          setSheetPosts(postsWithBookmarks);
        } else {
          setSheetPosts(prev => [...prev, ...postsWithBookmarks]);
        }

        setHasMore(postsWithBookmarks.length === PAGE_SIZE);
      } else {
        if (reset) {
          setSheetPosts([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching sheet posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setSheetLoading(false);
      setSheetRefreshing(false);
    }
  };

  const openSheet = (type: SheetType) => {
    setSheetType(type);
    setSheetVisible(true);
  };

  const closeSheet = () => {
    setSheetVisible(false);
    // Refresh stats after closing
    fetchStats();
  };

  const loadMore = () => {
    if (!sheetLoading && hasMore && sheetType) {
      const nextPage = sheetPage + 1;
      setSheetPage(nextPage);
      fetchSheetPosts(sheetType, nextPage, false);
    }
  };

  const onSheetRefresh = () => {
    if (sheetType) {
      setSheetRefreshing(true);
      setSheetPage(0);
      setSheetPosts([]);
      setHasMore(true);
      fetchSheetPosts(sheetType, 0, true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    
    return `${month} ${day}, ${year} • ${hours}:${minutesStr} ${ampm}`;
  };

  const getExcerpt = (post: Post): string => {
    if (post.excerpt) return post.excerpt;
    // Strip markdown and get first 120 characters
    const plainText = post.content_markdown
      .replace(/[#*_`\[\]()]/g, '')
      .replace(/\n/g, ' ')
      .trim();
    return plainText.substring(0, 120) + (plainText.length > 120 ? '...' : '');
  };

  const getThumbnail = (post: Post): string | null => {
    if (post.featured_image) return post.featured_image;
    if (post.post_images && post.post_images.length > 0) {
      return post.post_images[0].url;
    }
    return null;
  };

  const handleViewPost = async (post: Post) => {
    setViewingPost(post);
    setViewerLoading(true);
    setViewerVisible(true);

    try {
      // Fetch post stats
      const [likesResult, commentsResult, bookmarksResult] = await Promise.all([
        supabase.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
        supabase.from('bookmarks').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
      ]);

      setViewerStats({
        likes: likesResult.count || 0,
        comments: commentsResult.count || 0,
        bookmarks: bookmarksResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching post stats:', error);
    } finally {
      setViewerLoading(false);
    }
  };

  const handleEditPost = (post: Post) => {
    closeSheet();
    navigation.navigate('Create', { postId: post.id });
  };

  const handleDeletePost = async (post: Post) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update
            const originalPosts = [...sheetPosts];
            setSheetPosts(prev => prev.filter(p => p.id !== post.id));

            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id);

              if (error) throw error;

              // Update stats
              await fetchStats();
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error) {
              // Rollback
              setSheetPosts(originalPosts);
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleTogglePublish = async (post: Post) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const newIsPublished = newStatus === 'published';

    // Optimistic update
    const originalPosts = [...sheetPosts];
    setSheetPosts(prev =>
      prev.map(p =>
        p.id === post.id
          ? { ...p, status: newStatus as 'draft' | 'published' | 'archived' }
          : p
      )
    );

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          status: newStatus,
          is_published: newIsPublished,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (error) throw error;

      // Refresh stats
      await fetchStats();
      Alert.alert('Success', `Post ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`);
    } catch (error) {
      // Rollback
      setSheetPosts(originalPosts);
      console.error('Toggle publish error:', error);
      Alert.alert('Error', 'Failed to update post status. Please try again.');
    }
  };

  const handleToggleBookmark = async (post: Post) => {
    if (!user) return;

    const isBookmarked = post.is_bookmarked;
    
    // Optimistic update
    const originalPosts = [...sheetPosts];
    setSheetPosts(prev =>
      prev.map(p =>
        p.id === post.id ? { ...p, is_bookmarked: !isBookmarked } : p
      )
    );

    try {
      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);

        if (error) throw error;
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            post_id: post.id,
          });

        if (error) throw error;
      }

      // Refresh stats and bookmarks
      await Promise.all([fetchStats(), refreshBookmarks()]);
    } catch (error) {
      // Rollback
      setSheetPosts(originalPosts);
      console.error('Toggle bookmark error:', error);
      Alert.alert('Error', 'Failed to update bookmark. Please try again.');
    }
  };

  // Markdown to HTML conversion
  const markdownToHtml = (markdown: string): string => {
    let html = markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/__(.*?)__/gim, '<u>$1</u>')
      .replace(/~~(.*?)~~/gim, '<s>$1</s>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
      .replace(/\n/g, '<br />');
    
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    
    return html;
  };

  const renderPostItem = ({ item }: { item: Post }) => {
    const thumbnail = getThumbnail(item);
    const excerpt = getExcerpt(item);

    return (
      <View style={[styles.postItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.postItemContent}
          onPress={() => handleViewPost(item)}
          activeOpacity={0.7}
        >
          {thumbnail && (
            <Image source={{ uri: thumbnail }} style={[styles.postThumbnail, { backgroundColor: colors.border }]} />
          )}
          <View style={styles.postItemText}>
            <View style={styles.postItemHeader}>
              <Text style={[styles.postItemTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  item.status === 'draft'
                    ? styles.draftBadge
                    : item.status === 'published'
                    ? styles.publishedBadge
                    : styles.archivedBadge,
                ]}
              >
                <Text style={styles.badgeText}>
                  {item.status === 'draft'
                    ? 'Draft'
                    : item.status === 'published'
                    ? 'Published'
                    : 'Archived'}
                </Text>
              </View>
            </View>
            <Text style={[styles.postItemExcerpt, { color: colors.textSecondary }]} numberOfLines={2}>
              {excerpt}
            </Text>
            <View style={styles.postItemMeta}>
              <Text style={[styles.postItemDate, { color: colors.textSecondary }]}>{formatDate(item.created_at)}</Text>
              <View style={styles.postItemStats}>
                <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.postItemStatText, { color: colors.textSecondary }]}>{item.views || 0}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        <View style={[styles.postItemActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: colors.inputBg }]}
            onPress={() => handleViewPost(item)}
          >
            <Eye size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: colors.inputBg }]}
            onPress={() => handleEditPost(item)}
          >
            <Edit3 size={18} color={colors.primary} />
          </TouchableOpacity>
          {item.status !== 'archived' && (
            <TouchableOpacity
              style={[styles.actionIcon, { backgroundColor: colors.inputBg }]}
              onPress={() => handleTogglePublish(item)}
            >
              <Send
                size={18}
                color={item.status === 'published' ? colors.warning : colors.success}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: colors.inputBg }]}
            onPress={() => handleToggleBookmark(item)}
          >
            <Bookmark
              size={18}
              color={item.is_bookmarked ? colors.warning : colors.textSecondary}
              fill={item.is_bookmarked ? colors.warning : 'none'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: colors.inputBg }]}
            onPress={() => handleDeletePost(item)}
          >
            <Trash2 size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSkeletonLoader = () => (
    <View style={[styles.skeletonItem, { backgroundColor: colors.cardBg }]}>
      <View style={[styles.skeletonThumbnail, { backgroundColor: colors.border }]} />
      <View style={styles.skeletonText}>
        <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '80%' }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '60%', marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: '40%', marginTop: 8 }]} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
            onRefresh={() => {
              setRefreshing(true);
              fetchStats();
            }}
            tintColor={colors.textPrimary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Overview</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your creative performance today.
          </Text>
          {stats.lastUpdated && (
            <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
              Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
            </Text>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => openSheet('all')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBubble, { backgroundColor: '#3B82F615' }]}>
              <Ionicons name="document-text" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats.totalPosts}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total Posts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => openSheet('published')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBubble, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats.publishedPosts}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Published
            </Text>
          </TouchableOpacity>

          <View
            style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          >
            <View style={[styles.iconBubble, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="eye" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats.totalViews}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total Views
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
            onPress={() => openSheet('bookmarks')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBubble, { backgroundColor: '#EF444415' }]}>
              <Ionicons name="bookmark" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {stats.totalBookmarks}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Bookmarks
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.cardBg }]}
            onPress={() => navigation.navigate('Create')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBubble, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="add" size={24} color={colors.textPrimary} />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Create Post</Text>
              <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                Draft a new story
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Sheet */}
      {sheetVisible && (
        <>
          <Animated.View
            style={[
              styles.sheetOverlay,
              {
                opacity: overlayOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeSheet}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.cardBg,
                transform: [{ translateY: sheetAnimation }],
              },
            ]}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.textSecondary }]} />
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                {sheetType === 'all'
                  ? 'All Posts'
                  : sheetType === 'published'
                  ? 'Published Posts'
                  : 'Bookmarked Posts'}
              </Text>
              <TouchableOpacity onPress={closeSheet} style={styles.sheetCloseButton}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {sheetLoading && sheetPosts.length === 0 ? (
              <View style={styles.sheetContent}>
                {[...Array(3)].map((_, i) => (
                  <React.Fragment key={i}>{renderSkeletonLoader()}</React.Fragment>
                ))}
              </View>
            ) : (
              <FlatList
                data={sheetPosts}
                renderItem={renderPostItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.sheetContent}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                  <RefreshControl
                    refreshing={sheetRefreshing}
                    onRefresh={onSheetRefresh}
                    tintColor={colors.textSecondary}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      No posts found.
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  sheetLoading && sheetPosts.length > 0 ? (
                    <View style={styles.loadingFooter}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : null
                }
              />
            )}
          </Animated.View>
        </>
      )}

      {/* Post Viewer Modal */}
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        {viewingPost && (
          <View style={[styles.viewerContainer, { backgroundColor: colors.bg }]}>
            <View style={[styles.viewerHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.viewerTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {viewingPost.title}
              </Text>
              <TouchableOpacity
                onPress={() => setViewerVisible(false)}
                style={styles.viewerCloseButton}
              >
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.viewerContent}>
              {viewingPost.featured_image && (
                <Image
                  source={{ uri: viewingPost.featured_image }}
                  style={[styles.viewerImage, { backgroundColor: colors.border }]}
                />
              )}
              <View style={[styles.viewerMeta, { borderBottomColor: colors.border }]}>
                <View style={styles.viewerMetaRow}>
                  <Calendar size={16} color={colors.textSecondary} />
                  <Text style={[styles.viewerMetaText, { color: colors.textSecondary }]}>
                    {formatDate(viewingPost.created_at)}
                  </Text>
                </View>
                <View style={styles.viewerMetaRow}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={[styles.viewerMetaText, { color: colors.textSecondary }]}>
                    {viewingPost.read_time || 5} min read
                  </Text>
                </View>
                {viewingPost.categories && (
                  <View style={styles.viewerMetaRow}>
                    <Text style={[styles.viewerMetaText, { color: colors.primary }]}>
                      {viewingPost.categories.name}
                    </Text>
                  </View>
                )}
              </View>
              {viewerLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <>
                  <RenderHtml
                    contentWidth={width - 40}
                    source={{ html: markdownToHtml(viewingPost.content_markdown) }}
                    baseStyle={{
                      color: colors.textPrimary,
                      fontSize: 16,
                      lineHeight: 24,
                    }}
                  />
                  {viewerStats && (
                    <View style={[styles.viewerStats, { borderTopColor: colors.border }]}>
                      <View style={styles.viewerStatItem}>
                        <Heart size={18} color={colors.error} />
                        <Text style={[styles.viewerStatText, { color: colors.textPrimary }]}>
                          {viewerStats.likes}
                        </Text>
                      </View>
                      <View style={styles.viewerStatItem}>
                        <MessageCircle size={18} color={colors.primary} />
                        <Text style={[styles.viewerStatText, { color: colors.textPrimary }]}>
                          {viewerStats.comments}
                        </Text>
                      </View>
                      <View style={styles.viewerStatItem}>
                        <Bookmark size={18} color={colors.warning} />
                        <Text style={[styles.viewerStatText, { color: colors.textPrimary }]}>
                          {viewerStats.bookmarks}
                        </Text>
                      </View>
                      <View style={styles.viewerStatItem}>
                        <Eye size={18} color={colors.textSecondary} />
                        <Text style={[styles.viewerStatText, { color: colors.textPrimary }]}>
                          {viewingPost.views || 0}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
  },
  lastUpdated: {
    fontSize: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    width: (width - 52) / 2,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    justifyContent: 'space-between',
    height: 140,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  actionButton: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  actionIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  
  // Bottom Sheet Styles
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    zIndex: 1001,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  sheetHeader: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sheetCloseButton: {
    position: 'absolute',
    right: 20,
    top: 12,
    padding: 8,
  },
  sheetContent: {
    padding: 16,
  },
  postItem: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  postItemContent: {
    flexDirection: 'row',
    padding: 12,
  },
  postThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#2C2C2E',
  },
  postItemText: {
    flex: 1,
  },
  postItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  postItemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  draftBadge: {
    backgroundColor: '#F59E0B',
  },
  publishedBadge: {
    backgroundColor: '#10B981',
  },
  archivedBadge: {
    backgroundColor: '#6B7280',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  postItemExcerpt: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  postItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postItemDate: {
    fontSize: 11,
  },
  postItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postItemStatText: {
    fontSize: 11,
  },
  postItemActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  actionIcon: {
    padding: 8,
    borderRadius: 8,
  },
  
  // Skeleton Loader
  skeletonItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 16,
  },
  skeletonThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  skeletonText: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  
  // Viewer Styles
  viewerContainer: {
    flex: 1,
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  viewerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    marginRight: 12,
  },
  viewerCloseButton: {
    padding: 8,
  },
  viewerContent: {
    padding: 20,
  },
  viewerImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 20,
  },
  viewerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  viewerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewerMetaText: {
    fontSize: 14,
  },
  viewerStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  viewerStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewerStatText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DashboardScreen;
