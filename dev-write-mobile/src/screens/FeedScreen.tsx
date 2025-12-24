import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  Modal,
  Dimensions,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Info, AlertCircle, CheckCircle, XCircle, Bell, Trash2, Bookmark } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import { supabase } from '../lib/supabase';
import { PostWithProfile, CommentWithProfile } from '../lib/supabase';
import RenderHtml from 'react-native-render-html';
import { Platform as RNPlatform } from 'react-native';

const FeedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<{ [key: string]: CommentWithProfile[] }>({});
  const [commentTexts, setCommentTexts] = useState<{ [key: string]: string }>({});
  const [submittingComments, setSubmittingComments] = useState<Set<string>>(new Set());
  const [postLikes, setPostLikes] = useState<{ [key: string]: number }>({});
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: number }>({});
  const [userCommentLikes, setUserCommentLikes] = useState<Set<string>>(new Set());
  const [likingComments, setLikingComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<string>('discover');
  const [trendingPosts, setTrendingPosts] = useState<PostWithProfile[]>([]);
  const [suggestedAuthors, setSuggestedAuthors] = useState<any[]>([]);
  const [followingPosts, setFollowingPosts] = useState<PostWithProfile[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [postShares, setPostShares] = useState<{ [key: string]: number }>({});
  const [postBookmarks, setPostBookmarks] = useState<{ [key: string]: number }>({});
  const [bookmarkingPosts, setBookmarkingPosts] = useState<Set<string>>(new Set());

  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());

  const { width, height } = Dimensions.get('window');
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark, getBookmarkCount, refreshBookmarkCounts } = useBookmarks();

  // Notification drawer state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsRefreshing, setNotificationsRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(width)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Search state for all tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // --- LOGIC FUNCTIONS (Unchanged) ---
  const togglePostExpansion = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`*, profiles:author_id (full_name, profile_image_url), comment_likes (count)`)
        .eq('post_id', postId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const comments = data || [];
      setPostComments(prev => ({ ...prev, [postId]: comments }));

      const likesData: { [key: string]: number } = {};
      comments.forEach(comment => {
        likesData[comment.id] = comment.comment_likes?.[0]?.count || 0;
      });
      setCommentLikes(prev => ({ ...prev, ...likesData }));

      if (user && comments.length > 0) {
        const { data: userLikesData } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', comments.map(c => c.id));
        if (userLikesData) {
          setUserCommentLikes(prev => new Set([...prev, ...userLikesData.map(like => like.comment_id)]));
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmitComment = async (postId: string) => {
    if (!user) return Alert.alert('Error', 'You must be logged in to comment');
    const commentText = commentTexts[postId]?.trim();
    if (!commentText) return Alert.alert('Error', 'Please enter a comment');

    try {
      setSubmittingComments(prev => new Set(prev).add(postId));
      const { error } = await supabase.from('comments').insert({
        post_id: postId, author_id: user.id, content_markdown: commentText,
      });
      if (error) throw error;
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      fetchComments(postId);
    } catch (error) {
      console.error('Comment error:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmittingComments(prev => { const newSet = new Set(prev); newSet.delete(postId); return newSet; });
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return Alert.alert('Error', 'You must be logged in to like posts');
    try {
      setLikingPosts(prev => new Set(prev).add(postId));
      if (userLikes.has(postId)) {
        const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
        if (error) throw error;
        setUserLikes(prev => { const newSet = new Set(prev); newSet.delete(postId); return newSet; });
        setPostLikes(prev => ({ ...prev, [postId]: (prev[postId] || 0) - 1 }));
      } else {
        const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
        setUserLikes(prev => new Set(prev).add(postId));
        setPostLikes(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      }
    } catch (error) {
      console.error('Like error:', error);
    } finally {
      setLikingPosts(prev => { const newSet = new Set(prev); newSet.delete(postId); return newSet; });
    }
  };

  const handleShare = async (post: PostWithProfile) => {
    try {
      const postUrl = `https://Chronicle.netlify.app/${post.slug}`;
      const result = await Share.share({ message: `Check out this post: ${post.title}\n\n${postUrl}`, url: postUrl, title: post.title });
      if (result.action === Share.sharedAction) {
        setPostShares(prev => ({ ...prev, [post.id]: (prev[post.id] || 0) + 1 }));
      }
    } catch (error) { console.error('Share error:', error); }
  };

  const handleBookmark = async (postId: string) => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to bookmark posts');
      return;
    }

    try {
      setBookmarkingPosts(prev => new Set(prev).add(postId));

      // Optimistic update
      const wasBookmarked = isBookmarked(postId);
      const currentCount = postBookmarks[postId] || 0;
      setPostBookmarks(prev => ({
        ...prev,
        [postId]: wasBookmarked ? Math.max(0, currentCount - 1) : currentCount + 1,
      }));

      await toggleBookmark(postId);

      // Refresh count to ensure accuracy
      const updatedCount = getBookmarkCount(postId);
      setPostBookmarks(prev => ({ ...prev, [postId]: updatedCount }));
    } catch (error) {
      console.error('Bookmark error:', error);
      // Revert optimistic update
      const currentCount = postBookmarks[postId] || 0;
      const wasBookmarked = isBookmarked(postId);
      setPostBookmarks(prev => ({
        ...prev,
        [postId]: wasBookmarked ? currentCount + 1 : Math.max(0, currentCount - 1),
      }));
      Alert.alert('Error', 'Failed to update bookmark. Please try again.');
    } finally {
      setBookmarkingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const handleView = async (postId: string) => {
    if (!viewedPosts.has(postId)) {
      setViewedPosts(prev => new Set([...prev, postId]));
      setPosts(prev => prev.map(post => post.id === postId ? { ...post, views: (post.views || post.views_count || 0) + 1 } : post));
    }
  };

  const handleFollow = async (authorId: string) => {
    if (!user) return Alert.alert('Login Required', 'Please login to follow authors');
    try {
      if (followingUsers.has(authorId)) {
        // Unfollow
        const { error } = await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', authorId);
        if (error) throw error;
        setFollowingUsers(prev => { const newSet = new Set(prev); newSet.delete(authorId); return newSet; });
        setSuggestedAuthors(prev => prev.filter(author => author.id !== authorId));
      } else {
        // Follow - check if already exists to avoid duplicate constraint error
        const { data: existingFollow } = await supabase.from('followers')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', authorId)
          .single();

        if (!existingFollow) {
          const { error } = await supabase.from('followers').insert({ follower_id: user.id, following_id: authorId });
          if (error) throw error;
        }
        setFollowingUsers(prev => new Set([...prev, authorId]));
        setSuggestedAuthors(prev => prev.filter(author => author.id !== authorId));
      }
    } catch (error) {
      console.error('Follow error:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' }); // e.g. "Mon"
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g. "Oct 12"
  };

  const openLightbox = (images: string[], index: number = 0) => {
    setLightboxImages(images);
    setCurrentImageIndex(index);
    setLightboxVisible(true);
  };
  const closeLightbox = () => setLightboxVisible(false);
  const nextImage = () => { if (currentImageIndex < lightboxImages.length - 1) setCurrentImageIndex(prev => prev + 1); };
  const prevImage = () => { if (currentImageIndex > 0) setCurrentImageIndex(prev => prev - 1); };

  const handleCommentLike = async (commentId: string) => {
    if (!user) return Alert.alert('Error', 'Login to like comments');
    try {
      setLikingComments(prev => new Set(prev).add(commentId));
      if (userCommentLikes.has(commentId)) {
        const { error } = await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
        if (error) throw error;
        setUserCommentLikes(prev => { const newSet = new Set(prev); newSet.delete(commentId); return newSet; });
        setCommentLikes(prev => ({ ...prev, [commentId]: (prev[commentId] || 0) - 1 }));
      } else {
        const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
        setUserCommentLikes(prev => new Set(prev).add(commentId));
        setCommentLikes(prev => ({ ...prev, [commentId]: (prev[commentId] || 0) + 1 }));
      }
    } catch (error) { console.error('Comment like error:', error); } finally { setLikingComments(prev => { const newSet = new Set(prev); newSet.delete(commentId); return newSet; }); }
  };

  const handleReply = async (postId: string, parentCommentId: string) => {
    if (!user) return Alert.alert('Error', 'Login to reply');
    const replyText = replyTexts[parentCommentId]?.trim();
    if (!replyText) return Alert.alert('Error', 'Enter a reply');
    try {
      setSubmittingComments(prev => new Set(prev).add(`${parentCommentId}-reply`));
      const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: user.id, content_markdown: replyText, parent_comment_id: parentCommentId });
      if (error) throw error;
      setReplyTexts(prev => ({ ...prev, [parentCommentId]: '' }));
      setReplyingTo(null);
      fetchComments(postId);
    } catch (error) { console.error('Reply error:', error); } finally { setSubmittingComments(prev => { const newSet = new Set(prev); newSet.delete(`${parentCommentId}-reply`); return newSet; }); }
  };

  // --- DATA FETCHING (Unchanged) ---
  const fetchTrendingPosts = async () => {
    setTrendingLoading(true);
    try {
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase.from('posts').select(`*, profiles:author_id (full_name, profile_image_url), categories:category_id (name, slug), likes (count), comments (count), post_tags(tags(id, name, slug, color))`).eq('status', 'published').gte('created_at', sevenDaysAgo.toISOString()).order('views', { ascending: false }).limit(10);
      if (error) throw error;
      const postsData = data || [];
      setTrendingPosts(postsData);

      // Fetch bookmark counts
      if (postsData.length > 0) {
        const postIds = postsData.map((p: any) => p.id);
        await refreshBookmarkCounts(postIds);
        const bookmarkCountsData: { [key: string]: number } = {};
        postIds.forEach((id: string) => {
          bookmarkCountsData[id] = getBookmarkCount(id);
        });
        setPostBookmarks(prev => ({ ...prev, ...bookmarkCountsData }));
      }
    } catch (error) { console.error('Error fetching trending:', error); } finally { setTrendingLoading(false); }
  };

  const fetchSuggestedAuthors = async () => {
    setAuthorsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select(`id, full_name, profile_image_url, bio, posts:posts!posts_author_id_fkey(count), followers:followers!followers_following_id_fkey(count), following:followers!followers_follower_id_fkey(count)`).neq('id', user?.id || null).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      setSuggestedAuthors((data || []).filter(author => !followingUsers.has(author.id)));
    } catch (error) { console.error('Error fetching authors:', error); } finally { setAuthorsLoading(false); }
  };

  const fetchFollowingUsers = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('followers').select('following_id').eq('follower_id', user.id);
      if (error) throw error;
      setFollowingUsers(new Set((data || []).map(follow => follow.following_id)));
    } catch (error) { console.error('Error fetching following:', error); }
  };

  const fetchFollowingPosts = async () => {
    if (!user) return;
    setFollowingLoading(true);
    try {
      const { data: followingData } = await supabase.from('followers').select('following_id').eq('follower_id', user.id);
      if (!followingData?.length) { setFollowingPosts([]); return; }
      const followingIds = followingData.map(f => f.following_id);
      const { data, error } = await supabase.from('posts').select(`*, profiles!posts_author_id_fkey (id, full_name, profile_image_url), categories!posts_category_id_fkey (id, name, slug), post_images (id, url, alt_text, order_index), likes (count), comments (count), post_tags(tags(id, name, slug, color))`).eq('status', 'published').in('author_id', followingIds).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      const postsData = data || []; setFollowingPosts(postsData);
      const likesData: { [key: string]: number } = {};
      postsData.forEach(post => likesData[post.id] = post.likes?.[0]?.count || 0);
      setPostLikes(prev => ({ ...prev, ...likesData }));
      // Initialize shares
      const sharesData: { [key: string]: number } = {};
      postsData.forEach(post => sharesData[post.id] = (post as any).shares_count || 0);
      setPostShares(prev => ({ ...prev, ...sharesData }));

      // Fetch bookmark counts
      if (postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        await refreshBookmarkCounts(postIds);
        const bookmarkCountsData: { [key: string]: number } = {};
        postIds.forEach(id => {
          bookmarkCountsData[id] = getBookmarkCount(id);
        });
        setPostBookmarks(prev => ({ ...prev, ...bookmarkCountsData }));
      }

      if (user && postsData.length > 0) {
        const { data: userLikesData } = await supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postsData.map(post => post.id));
        if (userLikesData) setUserLikes(prev => new Set([...prev, ...new Set(userLikesData.map(like => like.post_id))]));
      }
    } catch (error) { console.error('Error fetching following posts:', error); } finally { setFollowingLoading(false); }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase.from('posts').select(`*, profiles!posts_author_id_fkey (id, full_name, profile_image_url), categories!posts_category_id_fkey (id, name, slug), post_images (id, url, alt_text, order_index), likes (count), comments (count), post_tags(tags(id, name, slug, color))`).eq('status', 'published').order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      const postsData = data || []; setPosts(postsData);
      const likesData: { [key: string]: number } = {};
      postsData.forEach(post => likesData[post.id] = post.likes?.[0]?.count || 0);
      setPostLikes(likesData);
      const sharesData: { [key: string]: number } = {};
      postsData.forEach(post => sharesData[post.id] = (post as any).shares_count || 0);
      setPostShares(sharesData);

      // Fetch bookmark counts
      if (postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        await refreshBookmarkCounts(postIds);
        const bookmarkCountsData: { [key: string]: number } = {};
        postIds.forEach(id => {
          bookmarkCountsData[id] = getBookmarkCount(id);
        });
        setPostBookmarks(bookmarkCountsData);
      }

      if (user && postsData.length > 0) {
        const { data: userLikesData } = await supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postsData.map(p => p.id));
        if (userLikesData) setUserLikes(new Set(userLikesData.map(like => like.post_id)));
      }
    } catch (error) { console.error('Error fetching posts:', error); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchPosts(); if (user) { fetchFollowingUsers(); fetchNotifications(); } }, [user]);
  useEffect(() => { expandedPosts.forEach(postId => { if (!postComments[postId]) fetchComments(postId); }); }, [expandedPosts]);
  useEffect(() => { if (activeTab === 'trending' && !trendingPosts.length) fetchTrendingPosts(); else if (activeTab === 'authors' && !suggestedAuthors.length) fetchSuggestedAuthors(); else if (activeTab === 'following' && !followingPosts.length) fetchFollowingPosts(); }, [activeTab]);

  // Update bookmark counts when posts change
  useEffect(() => {
    const allPostIds = [
      ...posts.map(p => p.id),
      ...trendingPosts.map((p: any) => p.id),
      ...followingPosts.map(p => p.id),
    ];
    if (allPostIds.length > 0) {
      refreshBookmarkCounts(allPostIds);
      const bookmarkCountsData: { [key: string]: number } = {};
      allPostIds.forEach(id => {
        bookmarkCountsData[id] = getBookmarkCount(id);
      });
      setPostBookmarks(prev => ({ ...prev, ...bookmarkCountsData }));
    }
  }, [posts.length, trendingPosts.length, followingPosts.length]);

  // Notification drawer animation
  useEffect(() => {
    if (drawerVisible) {
      Animated.parallel([
        Animated.spring(drawerAnimation, {
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
        Animated.spring(drawerAnimation, {
          toValue: width,
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
  }, [drawerVisible]);

  const onRefresh = () => { setRefreshing(true); fetchPosts(); };

  // Notification functions
  const fetchNotifications = async () => {
    if (!user) return null;
    setNotificationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const notificationsData = data || [];
      setNotifications(notificationsData);
      return notificationsData;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return null;
    } finally {
      setNotificationsLoading(false);
      setNotificationsRefreshing(false);
    }
  };

  const onNotificationsRefresh = () => {
    setNotificationsRefreshing(true);
    fetchNotifications();
  };

  const openNotificationDrawer = async () => {
    setDrawerVisible(true);
    const fetchedNotifications = await fetchNotifications();
    // Mark all as read when drawer opens
    if (fetchedNotifications && fetchedNotifications.length > 0) {
      await markAllNotificationsAsRead(fetchedNotifications);
    }
  };

  const closeNotificationDrawer = () => {
    setDrawerVisible(false);
  };

  const markAllNotificationsAsRead = async (notificationsToCheck?: any[]) => {
    if (!user) return;
    const notificationsList = notificationsToCheck || notifications;
    const unreadNotifications = notificationsList.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      const unreadIds = unreadNotifications.map(n => n.id);
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => unreadIds.includes(n.id) ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Optimistically update UI
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      // Sync with backend
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        // Revert on error
        fetchNotifications();
        throw error;
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
      // Refresh to restore correct state
      fetchNotifications();
    }
  };

  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;

    return `${month} ${day}, ${year} • ${hours}:${minutesStr} ${ampm}`;
  };

  const getNotificationTypeConfig = (type: string) => {
    const typeLower = type?.toLowerCase() || 'info';
    switch (typeLower) {
      case 'success':
        return {
          icon: CheckCircle,
          color: '#10B981',
          bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
          borderColor: '#10B981',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          color: '#F59E0B',
          bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
          borderColor: '#F59E0B',
        };
      case 'error':
        return {
          icon: XCircle,
          color: '#EF4444',
          bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
          borderColor: '#EF4444',
        };
      case 'system':
        return {
          icon: Bell,
          color: '#8B5CF6',
          bgColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF',
          borderColor: '#8B5CF6',
        };
      default: // info
        return {
          icon: Info,
          color: '#3B82F6',
          bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
          borderColor: '#3B82F6',
        };
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Search filtering functions
  const filterPosts = (postsList: PostWithProfile[]) => {
    if (!searchQuery.trim()) return postsList;
    const query = searchQuery.toLowerCase();
    return postsList.filter(post =>
      post.title?.toLowerCase().includes(query) ||
      post.content_markdown?.toLowerCase().includes(query) ||
      post.excerpt?.toLowerCase().includes(query) ||
      post.profiles?.full_name?.toLowerCase().includes(query) ||
      post.categories?.name?.toLowerCase().includes(query)
    );
  };

  const filterAuthors = (authorsList: any[]) => {
    if (!searchQuery.trim()) return authorsList;
    const query = searchQuery.toLowerCase();
    return authorsList.filter(author =>
      author.full_name?.toLowerCase().includes(query) ||
      author.bio?.toLowerCase().includes(query)
    );
  };

  // Get filtered data for current tab
  const getFilteredData = () => {
    switch (activeTab) {
      case 'discover':
        return filterPosts(posts);
      case 'following':
        return filterPosts(followingPosts);
      case 'trending':
        return filterPosts(trendingPosts);
      case 'authors':
        return filterAuthors(suggestedAuthors);
      default:
        return [];
    }
  };

  // --- STYLES & RENDERING ---
  const colors = {
    bg: isDark ? '#111827' : '#FFFFFF',
    cardBg: isDark ? '#1F2937' : '#FFFFFF',
    textPrimary: isDark ? '#F9FAFB' : '#111827',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    primary: '#3B82F6',
    border: isDark ? '#374151' : '#F3F4F6',
    inputBg: isDark ? '#374151' : '#F9FAFB',
    shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
    warning: '#F59E0B',
  };

  const getHtmlConfig = (isExpanded: boolean) => ({
    baseStyle: {
      fontSize: 16,
      color: colors.textPrimary,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      lineHeight: 24,
    },
    tagsStyles: {
      p: { marginBottom: 12, lineHeight: 24 },
      strong: { fontWeight: '700' as const, color: colors.textPrimary },
      h1: { fontSize: 24, fontWeight: '700' as const, marginVertical: 12, color: colors.textPrimary },
      h2: { fontSize: 20, fontWeight: '700' as const, marginVertical: 10, color: colors.textPrimary },
      a: { color: colors.primary, textDecorationLine: 'none' as const },
      img: { borderRadius: 12, marginVertical: 8 },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        paddingLeft: 12,
        fontStyle: 'italic' as const,
        opacity: 0.8
      },
    },
  });

  const DefaultAvatar = ({ size = 40, name = '' }: { size?: number; name?: string }) => (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: isDark ? '#374151' : '#E5E7EB',
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ fontSize: size * 0.4, fontWeight: '600', color: colors.textSecondary }}>
        {name ? name.charAt(0).toUpperCase() : 'A'}
      </Text>
    </View>
  );

  const renderPost = ({ item }: { item: PostWithProfile }) => {
    const isExpanded = expandedPosts.has(item.id);
    const currentHtmlConfig = getHtmlConfig(isExpanded);
    const comments = postComments[item.id] || [];
    const isLiked = userLikes.has(item.id);
    const likesCount = postLikes[item.id] || 0;
    const sharesCount = postShares[item.id] || 0;
    const bookmarksCount = postBookmarks[item.id] || getBookmarkCount(item.id);
    const isPostBookmarked = isBookmarked(item.id);
    const isBookmarking = bookmarkingPosts.has(item.id);

    return (
      <View style={styles.postCard}>


        {/* Featured Image */}
        {item.featured_image && (
          <TouchableOpacity onPress={() => openLightbox([item.featured_image!])} activeOpacity={0.9}>
            <Image source={{ uri: item.featured_image }} style={styles.featuredImage} />
          </TouchableOpacity>
        )}

        {/* Gallery Images */}
        {item.post_images && item.post_images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {item.post_images.sort((a, b) => a.order_index - b.order_index).map((image, index) => (
              <TouchableOpacity key={image.id} onPress={() => openLightbox(item.post_images!.map(i => i.url), index)}>
                <Image source={{ uri: image.url }} style={styles.galleryImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {/* Modern Header: Author First */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.authorContainer}
            onPress={() => item.profiles?.id && navigation.navigate('Settings', { screen: 'AuthorProfile', params: { authorId: item.profiles.id } })}
          >
            {item.profiles?.profile_image_url ? (
              <Image source={{ uri: item.profiles.profile_image_url }} style={styles.authorAvatar} />
            ) : (
              <DefaultAvatar size={36} name={item.profiles?.full_name} />
            )}
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.authorName}>{item.profiles?.full_name || 'Anonymous'}</Text>
              <Text style={styles.postDate}>{formatDate(item.created_at)} • {item.categories?.name || 'Story'}</Text>
            </View>
          </TouchableOpacity>
          {/* Follow Button - Only show in discover tab and if not following */}
          {activeTab === 'discover' && user && item.profiles?.id && item.profiles.id !== user.id && (
            <TouchableOpacity
              style={[styles.followButton, followingUsers.has(item.profiles.id) && styles.unfollowButton]}
              onPress={() => handleFollow(item.profiles!.id)}
            >
              <Text style={[styles.followButtonText, followingUsers.has(item.profiles.id) && styles.unfollowButtonText]}>
                {followingUsers.has(item.profiles.id) ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <Text style={styles.postTitle}>{item.title}</Text>



        {/* Content Preview / Full */}
        <View style={isExpanded ? styles.contentFull : styles.contentPreview}>
          <RenderHtml
            contentWidth={width - 48}
            source={{ html: item.content_markdown || item.excerpt || '' }}
            {...currentHtmlConfig}
          />
          {!isExpanded && (
            <View style={[styles.readMoreGradient, { backgroundColor: 'transparent' }]} />
          )}
        </View>

        {/* Tags */}
        {item.post_tags && item.post_tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagRow}>
            {item.post_tags.map(pt => pt.tags).map(tag => (
              <View key={tag.id} style={[styles.tagChip, { backgroundColor: tag.color || '#3B82F6' }]}>
                <Text style={styles.tagText}>#{tag.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.readMoreBtn} onPress={() => togglePostExpansion(item.id)}>
          <Text style={styles.readMoreText}>{isExpanded ? "Collapse" : "Read full story"}</Text>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
        </TouchableOpacity>

        {/* Action Bar */}
        <View style={styles.actionBar}>
          <View style={styles.actionLeft}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? '#EF4444' : colors.textSecondary} />
              <Text style={[styles.actionText, isLiked && { color: '#EF4444' }]}>{likesCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => togglePostExpansion(item.id)}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.actionText}>{comments.length}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
              <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.actionText}>{sharesCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleBookmark(item.id)}
              disabled={isBookmarking}
            >
              {isBookmarking ? (
                <ActivityIndicator size="small" color={colors.warning} />
              ) : (
                <>
                  <Bookmark
                    size={20}
                    color={isPostBookmarked ? colors.warning : colors.textSecondary}
                    fill={isPostBookmarked ? colors.warning : 'none'}
                  />
                  <Text style={[styles.actionText, isPostBookmarked && { color: colors.warning }]}>
                    {bookmarksCount > 0 ? bookmarksCount : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => handleView(item.id)} style={styles.viewCount}>
            <Ionicons name="stats-chart-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.viewCountText}>{item.views || item.views_count || 0} views</Text>
          </TouchableOpacity>
        </View>

        {/* Expanded Comments Section */}
        {isExpanded && (
          <View style={styles.commentsSection}>
            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>Comments</Text>

            {/* Input */}
            <View style={styles.commentInputWrapper}>
              <TextInput
                style={styles.mainInput}
                placeholder="Add a thought..."
                placeholderTextColor={colors.textSecondary}
                value={commentTexts[item.id] || ''}
                onChangeText={(text) => setCommentTexts(prev => ({ ...prev, [item.id]: text }))}
                multiline
              />
              {commentTexts[item.id]?.length > 0 && (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={() => handleSubmitComment(item.id)}
                  disabled={submittingComments.has(item.id)}
                >
                  <Ionicons name="arrow-up" size={18} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => comment.profiles?.id && navigation.navigate('Settings', { screen: 'AuthorProfile', params: { authorId: comment.profiles.id } })}
                  >
                    {comment.profiles?.profile_image_url ?
                      <Image source={{ uri: comment.profiles.profile_image_url }} style={styles.commentAvatar} /> :
                      <DefaultAvatar size={24} name={comment.profiles?.full_name} />
                    }
                    <Text style={styles.commentAuthor}>{comment.profiles?.full_name}</Text>
                  </TouchableOpacity>
                  <Text style={styles.commentDate}>{formatDate(comment.created_at)}</Text>
                </View>

                <Text style={styles.commentBody}>{comment.content_markdown}</Text>

                <View style={styles.commentActions}>
                  <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleCommentLike(comment.id)}>
                    <Text style={styles.commentActionText}>Like {commentLikes[comment.id] > 0 && `(${commentLikes[comment.id]})`}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commentActionBtn} onPress={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
                    <Text style={styles.commentActionText}>Reply</Text>
                  </TouchableOpacity>
                </View>

                {replyingTo === comment.id && (
                  <View style={styles.replyInputBox}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder="Write a reply..."
                      placeholderTextColor={colors.textSecondary}
                      value={replyTexts[comment.id] || ''}
                      onChangeText={(text) => setReplyTexts(prev => ({ ...prev, [comment.id]: text }))}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => handleReply(item.id, comment.id)}>
                      <Text style={styles.replySendText}>Send</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
            {comments.length === 0 && <Text style={styles.emptyCommentsText}>No comments yet.</Text>}
          </View>
        )}
      </View>
    );
  };

  const renderAuthorItem = ({ item }: { item: any }) => (
    <View style={styles.authorCard}>
      <TouchableOpacity
        style={styles.authorCardInner}
        onPress={() => navigation.navigate('Settings', { screen: 'AuthorProfile', params: { authorId: item.id } })}
      >
        {item.profile_image_url ? (
          <Image source={{ uri: item.profile_image_url }} style={styles.largeAvatar} />
        ) : (
          <DefaultAvatar size={60} name={item.full_name} />
        )}
        <View style={styles.authorDetails}>
          <Text style={styles.authorCardName}>{item.full_name}</Text>
          <Text style={styles.authorBio} numberOfLines={2}>{item.bio || 'No bio available'}</Text>
          <View style={styles.authorStatsRow}>
            <Text style={styles.authorStat}>{item.posts?.[0]?.count || 0} Posts</Text>
            <Text style={styles.authorStatDot}>•</Text>
            <Text style={styles.authorStat}>{item.followers?.[0]?.count || 0} Followers</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.followBtn, followingUsers.has(item.id) && styles.followingBtn]}
        onPress={() => handleFollow(item.id)}
      >
        <Text style={[styles.followBtnText, followingUsers.has(item.id) && styles.followingBtnText]}>
          {followingUsers.has(item.id) ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingBottom: 60,
    },
    // Modern Header
    header: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 60,
      paddingBottom: 15,
      backgroundColor: colors.bg,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    screenTitle: {
      fontSize: 32,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    iconBtn: {
      padding: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
      borderRadius: 50,
    },
    notificationIconContainer: {
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 6,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.bg,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    // Pill Tabs
    tabsWrapper: {
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    tabPill: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 25,
      marginRight: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: 'transparent',
    },
    activeTabPill: {
      backgroundColor: colors.textPrimary, // Black in light, White in dark
      borderColor: colors.textPrimary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    activeTabText: {
      color: isDark ? '#111827' : '#FFFFFF', // Inverted text color
    },

    // Post Card
    postCard: {
      backgroundColor: colors.cardBg,
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 20,
      borderRadius: 20, // More rounded
      // Subtle border instead of shadow for modern look
      borderWidth: 1,
      borderColor: colors.border,
    },
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    authorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    authorAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    authorName: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    postDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    postTitle: {
      fontSize: 20,
      fontWeight: '800', // Extra bold
      color: colors.textPrimary,
      marginBottom: 12,
      lineHeight: 28,
    },
    featuredImage: {
      width: '100%',
      height: 220,
      borderRadius: 16,
      marginBottom: 16,
      backgroundColor: colors.border,
    },
    galleryScroll: {
      marginBottom: 16,
    },
    galleryImage: {
      width: 100,
      height: 100,
      borderRadius: 12,
      marginRight: 10,
      backgroundColor: colors.border,
    },
    contentPreview: {
      maxHeight: 100,
      overflow: 'hidden',
    },
    contentFull: {
      marginBottom: 10,
    },
    readMoreGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 40,
    },
    readMoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 16,
    },
    readMoreText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 14,
      marginRight: 4,
    },

    // Actions
    actionBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 24,
    },
    actionText: {
      marginLeft: 6,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    viewCount: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    viewCountText: {
      marginLeft: 4,
      fontSize: 12,
      color: colors.textSecondary,
    },

    // Follow Button in Post Header
    followButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 16,
      alignItems: 'center',
    },
    followButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    unfollowButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    unfollowButtonText: {
      color: colors.primary,
    },

    // Comments
    commentsSection: {
      marginTop: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: 16,
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    commentInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: 24,
      paddingHorizontal: 6,
      paddingVertical: 6,
      marginBottom: 20,
    },
    mainInput: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.textPrimary,
      maxHeight: 100,
    },
    sendButton: {
      backgroundColor: colors.primary,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    commentItem: {
      marginBottom: 20,
    },
    commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    commentAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginRight: 8,
    },
    commentAuthor: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    commentDate: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    commentBody: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
      marginTop: 2,
    },
    commentActions: {
      flexDirection: 'row',
      marginTop: 6,
      gap: 16,
    },
    commentActionBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    commentActionText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    replyInputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
      paddingLeft: 12,
    },
    replyInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      paddingVertical: 4,
    },
    replySendText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 13,
      marginLeft: 8,
    },
    emptyCommentsText: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: 10,
      fontStyle: 'italic',
    },

    // Author Card (For 'Authors' tab)
    authorCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
    },
    authorCardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
    },
    largeAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.border,
    },
    authorDetails: {
      marginLeft: 14,
      flex: 1,
    },
    authorCardName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    authorBio: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    authorStatsRow: {
      flexDirection: 'row',
      marginTop: 4,
    },
    authorStat: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    authorStatDot: {
      fontSize: 12,
      color: colors.textSecondary,
      marginHorizontal: 6,
    },
    followBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: isDark ? '#374151' : '#F3F4F6',
    },
    followingBtn: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    followBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    followingBtnText: {
      color: colors.textSecondary,
    },

    // Misc
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 12 },
    lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    lightboxImage: { width: width, height: height * 0.7, resizeMode: 'contain' },
    lightboxClose: { position: 'absolute', top: 50, right: 20, padding: 10 },

    // Notification Drawer
    drawerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
    },
    drawerContainer: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: Math.min(width * 0.85, 400),
      backgroundColor: colors.cardBg,
      zIndex: 1001,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: -2, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        android: {
          elevation: 10,
        },
      }),
    },
    drawerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    drawerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    drawerCloseButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
    },
    drawerListContent: {
      paddingBottom: 20,
    },
    drawerLoading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    drawerEmpty: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
      paddingHorizontal: 40,
    },
    drawerEmptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
      textAlign: 'center',
    },
    notificationItem: {
      flexDirection: 'row',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBg,
      borderLeftWidth: 3,
    },
    unreadNotificationItem: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#F0F9FF',
    },
    notificationContentWrapper: {
      flex: 1,
      flexDirection: 'row',
    },
    notificationTypeIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    notificationItemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: 8,
    },
    notificationItemMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 6,
    },
    notificationItemDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    deleteNotificationButton: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },

    // Search Bar Styles
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.bg,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: 12,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    searchInputFocused: {
      borderColor: colors.primary,
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      paddingVertical: 10,
    },
    searchClearButton: {
      padding: 4,
      marginLeft: 8,
    },
    tagRow: {
      flexDirection: 'row',
      marginTop: 6,
      marginBottom: 8,
    },
    tagChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 6,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'white',
    },
  });

  const renderTabs = () => (
    <View style={styles.tabsWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {['discover', 'following', 'trending', 'authors'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabPill, activeTab === tab && styles.activeTabPill]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'following' ? 'For You' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) return <View style={styles.emptyState}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.screenTitle}>
            {activeTab === 'discover' ? 'Discover' : activeTab === 'following' ? 'Your Feed' : activeTab === 'trending' ? 'Trending' : 'Authors'}
          </Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={openNotificationDrawer}
            activeOpacity={0.7}
          >
            <View style={styles.notificationIconContainer}>
              <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {activeTab === 'discover' ? 'Explore the latest stories.' :
            activeTab === 'following' ? 'Updates from people you follow.' :
              activeTab === 'trending' ? 'What everyone is reading.' :
                'Find writers to connect with.'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, searchFocused && styles.searchInputFocused]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab === 'following' ? 'your feed' : activeTab}...`}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.searchClearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderTabs()}

      {activeTab === 'discover' && (
        <FlatList
          data={filterPosts(posts)}
          renderItem={renderPost}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textSecondary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No posts found matching your search.' : 'No posts yet.'}
              </Text>
            </View>
          }
        />
      )}
      {activeTab === 'following' && (
        followingLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filterPosts(followingPosts)}
            renderItem={renderPost}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchFollowingPosts(); setRefreshing(false); }}
                tintColor={colors.textSecondary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No posts found matching your search.' : 'Follow authors to see their posts here.'}
                </Text>
              </View>
            }
          />
        )
      )}
      {activeTab === 'trending' && (
        trendingLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filterPosts(trendingPosts)}
            renderItem={renderPost}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchTrendingPosts(); setRefreshing(false); }}
                tintColor={colors.textSecondary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No posts found matching your search.' : 'No trending posts right now.'}
                </Text>
              </View>
            }
          />
        )
      )}
      {activeTab === 'authors' && (
        authorsLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={filterAuthors(suggestedAuthors)}
            renderItem={renderAuthorItem}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchSuggestedAuthors(); setRefreshing(false); }}
                tintColor={colors.textSecondary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No authors found matching your search.' : 'No new authors to discover.'}
                </Text>
              </View>
            }
          />
        )
      )}

      <Modal visible={lightboxVisible} transparent={true} animationType="fade" onRequestClose={closeLightbox}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={closeLightbox}><Ionicons name="close" size={28} color="#FFF" /></TouchableOpacity>
          {lightboxImages.length > 0 && <Image source={{ uri: lightboxImages[currentImageIndex] }} style={styles.lightboxImage} />}
          {lightboxImages.length > 1 && <View style={{ position: 'absolute', bottom: 50, flexDirection: 'row', gap: 40 }}><TouchableOpacity onPress={prevImage} disabled={currentImageIndex === 0}><Ionicons name="chevron-back" size={40} color={currentImageIndex === 0 ? '#555' : '#FFF'} /></TouchableOpacity><TouchableOpacity onPress={nextImage} disabled={currentImageIndex === lightboxImages.length - 1}><Ionicons name="chevron-forward" size={40} color={currentImageIndex === lightboxImages.length - 1 ? '#555' : '#FFF'} /></TouchableOpacity></View>}
        </View>
      </Modal>

      {/* Notification Drawer */}
      {drawerVisible && (
        <>
          <Animated.View
            style={[
              styles.drawerOverlay,
              {
                opacity: overlayOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeNotificationDrawer}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.drawerContainer,
              {
                transform: [{ translateX: drawerAnimation }],
              },
            ]}
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Notifications</Text>
              <TouchableOpacity
                onPress={closeNotificationDrawer}
                style={styles.drawerCloseButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {notificationsLoading && notifications.length === 0 ? (
              <View style={styles.drawerLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const typeConfig = getNotificationTypeConfig(item.type);
                  const IconComponent = typeConfig.icon;

                  return (
                    <View
                      style={[
                        styles.notificationItem,
                        !item.read && styles.unreadNotificationItem,
                        { borderLeftColor: typeConfig.borderColor },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.notificationContentWrapper}
                        onPress={() => {
                          if (!item.read) {
                            markNotificationAsRead(item.id);
                          }
                          // Handle notification tap (navigate to post, etc.)
                          if (item.data?.post_id) {
                            // Could navigate to post detail here
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.notificationTypeIconContainer, { backgroundColor: typeConfig.bgColor }]}>
                          <IconComponent size={20} color={typeConfig.color} />
                        </View>
                        <View style={styles.notificationContent}>
                          <View style={styles.notificationHeader}>
                            <Text style={styles.notificationItemTitle}>{item.title}</Text>
                            {!item.read && <View style={[styles.unreadDot, { backgroundColor: typeConfig.color }]} />}
                          </View>
                          <Text style={styles.notificationItemMessage}>
                            {item.message}
                          </Text>
                          <Text style={styles.notificationItemDate}>
                            {formatNotificationDate(item.created_at)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteNotificationButton}
                        onPress={() => deleteNotification(item.id)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  );
                }}
                refreshControl={
                  <RefreshControl
                    refreshing={notificationsRefreshing}
                    onRefresh={onNotificationsRefresh}
                    tintColor={colors.textSecondary}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.drawerEmpty}>
                    <Ionicons name="notifications-outline" size={48} color={colors.textSecondary} />
                    <Text style={styles.drawerEmptyText}>No notifications yet</Text>
                  </View>
                }
                contentContainerStyle={styles.drawerListContent}
              />
            )}
          </Animated.View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

export default FeedScreen;