import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
  Share,
  StatusBar,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AuthorProfileRouteProp } from '../types/navigation';

const { width, height } = Dimensions.get('window');

// ... [Interfaces remain exactly the same] ...
interface AuthorProfile {
  id: string;
  full_name: string;
  bio: string;
  profile_image_url: string;
  background_image_url: string;
  twitter: string;
  facebook: string;
  linkedin: string;
  instagram: string;
  github: string;
  youtube: string;
  website: string;
  posts_count: number;
  followers_count: number;
  following_count: number;
  created_at: string;
  age: string | null;
  gender: string | null;
  phone: string | null;
  show_phone: boolean;
  badges: string[];
  verified: boolean;
}

interface AuthorPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  created_at: string;
  views: number;
  likes_count: number;
  comments_count: number;
  featured_image: string | null;
  categories: { name: string; slug: string }[] | null;
  post_images: { id: string; url: string; alt_text: string | null; order_index: number }[] | null;
  read_time: number;
  is_liked: boolean;
}

interface FollowerUser {
  id: string;
  full_name: string;
  profile_image_url: string;
  bio: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

type Props = {
  route: AuthorProfileRouteProp;
  navigation: any;
};

const AuthorProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { authorId } = route.params;
  const { isDark } = useTheme();
  const { user } = useAuth();

  // State
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [posts, setPosts] = useState<AuthorPost[]>([]);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [following, setFollowing] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('posts');
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followButtonLoading, setFollowButtonLoading] = useState(false);
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());

  // ... [Logic functions: processMarkdownContent, truncateText, fetchProfile, etc. remain exactly the same] ...
  const processMarkdownContent = (markdown: string) => {
    if (!markdown) return '';
    return markdown
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/!\[(.*?)\]\(.*?\)/g, '[Image: $1]')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/^\s*>\s+/gm, '')
      .replace(/```[\s\S]*?```/g, '[Code Block]')
      .replace(/\n\s*\n/g, '\n')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength).replace(/\s+\S*$/, '') + '...';
  };

  const fetchProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`*, posts:posts!posts_author_id_fkey(count), followers:followers!followers_following_id_fkey(count), following:followers!followers_follower_id_fkey(count)`)
        .eq('id', authorId)
        .single();

      if (profileError) throw profileError;

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`id, title, excerpt, content_markdown, created_at, views, featured_image, categories:category_id (name, slug), post_images (id, url, alt_text, order_index), read_time, likes:likes(count), comments:comments(count), user_likes:likes!likes_post_id_fkey(user_id)`)
        .eq('author_id', authorId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(10);

      if (postsError) throw postsError;

      setProfile({
        ...profileData,
        posts_count: profileData.posts?.[0]?.count || 0,
        followers_count: profileData.followers?.[0]?.count || 0,
        following_count: profileData.following?.[0]?.count || 0,
        created_at: profileData.created_at || new Date().toISOString(),
        age: profileData.age || null,
        gender: profileData.gender || null,
        phone: profileData.phone || null,
        show_phone: profileData.show_phone || false,
        badges: profileData.badges || [],
        verified: profileData.verified || false,
      });

      setPosts(postsData.map(post => {
        const cleanContent = processMarkdownContent(post.content_markdown || '');
        const excerpt = post.excerpt || truncateText(cleanContent, 150);
        return {
          id: post.id,
          title: post.title,
          excerpt: excerpt,
          content: cleanContent,
          created_at: post.created_at,
          views: post.views || 0,
          likes_count: post.likes?.[0]?.count || 0,
          comments_count: post.comments?.[0]?.count || 0,
          featured_image: post.featured_image && post.featured_image.trim() ? post.featured_image : null,
          categories: post.categories,
          post_images: post.post_images,
          read_time: post.read_time || Math.max(1, Math.ceil(cleanContent.length / 200)),
          is_liked: user ? post.user_likes?.some((like: any) => like.user_id === user.id) : false,
        };
      }) || []);

      if (user) {
        const { data: followData } = await supabase
          .from('followers')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', authorId)
          .single();
        setIsFollowing(!!followData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowers = async () => {
    if (followers.length > 0) return;
    setFollowersLoading(true);
    try {
      const { data, error } = await supabase
        .from('followers')
        .select(`follower_id, profiles!followers_follower_id_fkey(id, full_name, profile_image_url, bio, followers:followers!followers_following_id_fkey(count), following:followers!followers_follower_id_fkey(count), posts:posts!posts_author_id_fkey(count))`)
        .eq('following_id', authorId);

      if (error) throw error;
      setFollowers(data?.map(item => {
        const profile = item.profiles as any;
        return {
          id: profile.id,
          full_name: profile.full_name,
          profile_image_url: profile.profile_image_url,
          bio: profile.bio,
          followers_count: profile.followers?.[0]?.count || 0,
          following_count: profile.following?.[0]?.count || 0,
          posts_count: profile.posts?.[0]?.count || 0,
        };
      }) || []);
    } catch (error) {
      console.error(error);
    } finally {
      setFollowersLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (following.length > 0) return;
    setFollowingLoading(true);
    try {
      const { data, error } = await supabase
        .from('followers')
        .select(`following_id, profiles!followers_following_id_fkey(id, full_name, profile_image_url, bio, followers:followers!followers_following_id_fkey(count), following:followers!followers_follower_id_fkey(count), posts:posts!posts_author_id_fkey(count))`)
        .eq('follower_id', authorId);

      if (error) throw error;
      setFollowing(data?.map(item => {
        const profile = item.profiles as any;
        return {
          id: profile.id,
          full_name: profile.full_name,
          profile_image_url: profile.profile_image_url,
          bio: profile.bio,
          followers_count: profile.followers?.[0]?.count || 0,
          following_count: profile.following?.[0]?.count || 0,
          posts_count: profile.posts?.[0]?.count || 0,
        };
      }) || []);
    } catch (error) {
      console.error(error);
    } finally {
      setFollowingLoading(false);
    }
  };

  const openLightbox = (images: string[], index: number = 0) => {
    setLightboxImages(images);
    setCurrentImageIndex(index);
    setLightboxVisible(true);
  };

  const closeLightbox = () => {
    setLightboxVisible(false);
    setLightboxImages([]);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (currentImageIndex < lightboxImages.length - 1) setCurrentImageIndex(prev => prev + 1);
  };

  const prevImage = () => {
    if (currentImageIndex > 0) setCurrentImageIndex(prev => prev - 1);
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    try {
      const profileUrl = `https://Chronicle.netlify.app/author/${authorId}`;
      const shareContent = `Check out ${profile.full_name}'s profile on DevWrite!\n\n${profileUrl}`;
      await Share.share({ message: shareContent, url: profileUrl, title: `${profile.full_name} - DevWrite` });
    } catch (error) {
      console.error(error);
    }
  };

  const handleFollow = async () => {
    if (!user) { Alert.alert('Login Required', 'Please login to follow authors'); return; }
    setFollowButtonLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', authorId);
        if (error) throw error;
        setIsFollowing(false);
        setProfile(prev => prev ? { ...prev, followers_count: prev.followers_count - 1 } : null);
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
        setIsFollowing(true);
        setProfile(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : null);
      }
    } catch (error) {
      console.error('Follow error:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowButtonLoading(false);
    }
  };

  useEffect(() => {
    setProfile(null); setPosts([]); setFollowers([]); setFollowing([]);
    setActiveTab('posts'); setIsFollowing(false); setLoading(true);
    fetchProfile();
  }, [authorId]);

  useEffect(() => {
    if (activeTab === 'followers') fetchFollowers();
    else if (activeTab === 'following') fetchFollowing();
  }, [activeTab]);

  const handleLikePost = async (postId: string) => {
    if (!user) { Alert.alert('Login Required', 'Please login to like posts'); return; }
    setLikingPosts(prev => new Set(prev).add(postId));
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      if (post.is_liked) {
        const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
        if (error) throw error;
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: false, likes_count: Math.max(0, p.likes_count - 1) } : p));
      } else {
        const { data: existingLike } = await supabase.from('likes').select('*').eq('post_id', postId).eq('user_id', user.id).single();
        if (!existingLike) {
          const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: user.id });
          if (error) throw error;
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: true, likes_count: p.likes_count + 1 } : p));
        } else {
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: true } : p));
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLikingPosts(prev => { const newSet = new Set(prev); newSet.delete(postId); return newSet; });
    }
  };

  const handleSharePost = async (post: AuthorPost) => {
    try {
      await Share.share({ message: `Check out this post: ${post.title}\n\n${post.excerpt}`, title: post.title });
    } catch (error) { console.error(error); }
  };

  const handleCommentPress = (postId: string) => {
    navigation.navigate('Settings', { screen: 'PostDetail', params: { postId, focusComments: true } });
  };

  const handlePostPress = (postId: string) => {
    supabase.from('posts').update({ views: (posts.find(p => p.id === postId)?.views || 0) + 1 }).eq('id', postId);
    navigation.navigate('Settings', { screen: 'PostDetail', params: { postId } });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const openUrl = async (url: string) => {
    try {
      let formattedUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) formattedUrl = `https://${url}`;
      const supported = await Linking.canOpenURL(formattedUrl);
      if (supported) await Linking.openURL(formattedUrl);
      else Alert.alert('Error', `Cannot open URL: ${formattedUrl}`);
    } catch (error) { console.error(error); }
  };

  const DefaultAvatar = ({ size = 40 }: { size?: number }) => (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: isDark ? '#374151' : '#e5e7eb', justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name="person-outline" size={size / 2.5} color={isDark ? '#9ca3af' : '#6b7280'} />
    </View>
  );

  // Modernized Colors
  const bg = isDark ? '#000000' : '#ffffff';
  const textPrimary = isDark ? '#ffffff' : '#111827';
  const textSecondary = isDark ? '#9ca3af' : '#6b7280';
  const accent = '#3b82f6';
  const borderColor = isDark ? '#27272a' : '#f3f4f6';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bg,
      paddingBottom: 50,
      paddingTop: 20,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      height: 240, // Taller header for drama
      position: 'relative',

    },
    backgroundImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    backgroundOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)', // Subtle overlay
    },
    backButton: {
      position: 'absolute',
      top: 60,
      left: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.3)', // Glass-like feel
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    profileSection: {
      marginTop: -60, // Significant overlap
      paddingHorizontal: 24,
      marginBottom: 20,
    },
    profileImageWrapper: {
      alignSelf: 'flex-start',
      padding: 4,
      backgroundColor: bg, // Cutout effect
      borderRadius: 60,
    },
    profileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    profileHeaderTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 12,
    },
    followButton: {
      backgroundColor: isDark ? '#ffffff' : '#111827', // High contrast button
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 30,
      minWidth: 100,
      alignItems: 'center',
      marginTop: 20, // Align with bottom of profile image
    },
    followButtonText: {
      color: isDark ? '#000000' : '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
    profileName: {
      fontSize: 28,
      fontWeight: '800',
      color: textPrimary,
      marginBottom: 4,
      letterSpacing: -0.5,
    },
    verifiedBadge: {
      marginLeft: 6,
    },
    badgesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 8,
    },
    badge: {
      backgroundColor: isDark ? '#27272a' : '#f3f4f6',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeText: {
      color: textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    profileBio: {
      fontSize: 15,
      color: textSecondary,
      lineHeight: 22,
      marginTop: 12,
    },
    profileDetails: {
      marginTop: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 16,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailText: {
      fontSize: 13,
      color: textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      marginTop: 24,
      gap: 32,
    },
    statItem: {
      alignItems: 'flex-start',
    },
    statNumber: {
      fontSize: 18,
      fontWeight: '700',
      color: textPrimary,
    },
    statLabel: {
      fontSize: 13,
      color: textSecondary,
      marginTop: 2,
    },
    socialLinks: {
      flexDirection: 'row',
      marginTop: 24,
      gap: 16,
    },
    socialLink: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#27272a' : '#f3f4f6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      marginTop: 20,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    },
    tabButton: {
      marginRight: 24,
      paddingVertical: 16,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: {
      borderBottomColor: textPrimary,
    },
    tabText: {
      fontSize: 15,
      fontWeight: '500',
      color: textSecondary,
    },
    tabTextActive: {
      color: textPrimary,
      fontWeight: '700',
    },
    contentSection: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
    },
    // Modern Post Card (Minimalist)
    postCard: {
      marginBottom: 32,
      backgroundColor: 'transparent',
    },
    postImage: {
      width: '100%',
      height: 220,
      borderRadius: 16,
      marginBottom: 16,
      backgroundColor: isDark ? '#27272a' : '#f3f4f6',
    },
    postMetaTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    postCategory: {
      fontSize: 11,
      fontWeight: '700',
      color: accent,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    postDate: {
      fontSize: 12,
      color: textSecondary,
    },
    postTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: textPrimary,
      marginBottom: 8,
      lineHeight: 28,
      letterSpacing: -0.3,
    },
    postExcerpt: {
      fontSize: 15,
      color: textSecondary,
      lineHeight: 22,
      marginBottom: 16,
    },
    postFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    postActions: {
      flexDirection: 'row',
      gap: 20,
    },
    iconTextBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    iconTextLabel: {
      fontSize: 13,
      color: textSecondary,
      fontWeight: '500',
    },
    // User List Item
    userListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      padding: 12,
      backgroundColor: isDark ? '#18181b' : '#ffffff', // Slight card feel for users
      borderRadius: 16,
      borderWidth: 1,
      borderColor: borderColor,
    },
    userAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 14,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: textPrimary,
    },
    userBio: {
      fontSize: 13,
      color: textSecondary,
      marginTop: 2,
    },
    followSmallBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: isDark ? '#27272a' : '#f3f4f6',
      borderRadius: 20,
    },
    followSmallBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: textPrimary,
    },
    // Utilities
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: bg,
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      color: textSecondary,
      fontSize: 16,
    },
    galleryScroll: {
      marginBottom: 16,
    },
    galleryImage: {
      width: 100,
      height: 80,
      borderRadius: 8,
      marginRight: 8,
    },
    // Lightbox (Minimal updates)
    lightboxContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
      justifyContent: 'center',
      zIndex: 1000,
    },
    lightboxControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 20,
      position: 'absolute',
      bottom: 40,
      width: '100%',
    },
    lightboxCloseButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 1001,
      padding: 10,
    },
  });

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={accent} /></View>;
  if (!profile) return <View style={[styles.container, styles.emptyState]}><Text style={styles.emptyText}>Profile not found</Text></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Modern Parallax-style Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          {profile.background_image_url ? (
            <Image source={{ uri: profile.background_image_url }} style={styles.backgroundImage} />
          ) : (
            <View style={[styles.backgroundImage, { backgroundColor: isDark ? '#27272a' : '#d1d5db' }]} />
          )}
          <View style={styles.backgroundOverlay} />
        </View>

        {/* Profile Content */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeaderTop}>
            <View style={styles.profileImageWrapper}>
              {profile.profile_image_url ? (
                <Image source={{ uri: profile.profile_image_url }} style={styles.profileImage} />
              ) : (
                <DefaultAvatar size={100} />
              )}
            </View>

            {user && user.id !== authorId && (
              <TouchableOpacity
                style={styles.followButton}
                onPress={handleFollow}
                disabled={followButtonLoading}
                activeOpacity={0.8}
              >
                {followButtonLoading ? (
                  <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} />
                ) : (
                  <Text style={styles.followButtonText}>{isFollowing ? 'Following' : 'Follow'}</Text>
                )}
              </TouchableOpacity>
            )}
            {/* Share Button (moved to social row for cleaner look or top right if preferred) */}
            {user?.id === authorId && (
              <TouchableOpacity style={[styles.followButton, { backgroundColor: isDark ? '#27272a' : '#f3f4f6' }]} onPress={() => navigation.navigate('Settings', { screen: 'SettingsMain' })}>
                <Text style={[styles.followButtonText, { color: textPrimary }]}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.profileName}>{profile.full_name}</Text>
            {profile.verified && <Ionicons name="checkmark-circle" size={20} color={accent} style={styles.verifiedBadge} />}
          </View>

          {profile.bio ? <Text style={styles.profileBio}>{profile.bio}</Text> : null}

          {/* Additional Profile Information */}
          <View style={styles.profileDetails}>
            {profile.created_at && (
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={18} color={textSecondary} />
                <Text style={styles.detailText}>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</Text>
              </View>
            )}

            {profile.gender && (
              <View style={styles.detailItem}>
                <Ionicons name="people-outline" size={18} color={textSecondary} />
                <Text style={styles.detailText}>{profile.gender}</Text>
              </View>
            )}

            {profile.age && (
              <View style={styles.detailItem}>
                <Ionicons name="person-outline" size={18} color={textSecondary} />
                <Text style={styles.detailText}>{profile.age} years old</Text>
              </View>
            )}

            {profile.phone && profile.show_phone && (
              <View style={styles.detailItem}>
                <Ionicons name="call-outline" size={18} color={textSecondary} />
                <Text style={styles.detailText}>{profile.phone}</Text>
              </View>
            )}
          </View>

          {profile.badges.length > 0 && (
            <View style={styles.badgesContainer}>
              {profile.badges.map((badge, idx) => (
                <View key={idx} style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
              ))}
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.posts_count}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveTab('followers')} style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.followers_count}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('following')} style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.following_count}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Minimal Social Links */}
          <View style={styles.socialLinks}>
            <TouchableOpacity style={styles.socialLink} onPress={handleShareProfile}>
              <Ionicons name="share-outline" size={18} color={textSecondary} />
            </TouchableOpacity>
            {profile.website && (
              <TouchableOpacity style={styles.socialLink} onPress={() => openUrl(profile.website)}>
                <Ionicons name="globe-outline" size={18} color={textSecondary} />
              </TouchableOpacity>
            )}
            {profile.twitter && (
              <TouchableOpacity style={styles.socialLink} onPress={() => openUrl(`https://twitter.com/${profile.twitter}`)}>
                <Ionicons name="logo-twitter" size={18} color="#1DA1F2" />
              </TouchableOpacity>
            )}
            {profile.facebook && (
              <TouchableOpacity style={styles.socialLink} onPress={() => openUrl(`https://facebook.com/${profile.facebook}`)}>
                <Ionicons name="logo-facebook" size={18} color="#4267B2" />
              </TouchableOpacity>
            )}
            {profile.instagram && (
              <TouchableOpacity style={styles.socialLink} onPress={() => openUrl(`https://instagram.com/${profile.instagram}`)}>
                <Ionicons name="logo-instagram" size={18} color="#E4405F" />
              </TouchableOpacity>
            )}
            {profile.linkedin && (
              <TouchableOpacity style={styles.socialLink} onPress={() => openUrl(`https://linkedin.com/in/${profile.linkedin}`)}>
                <Ionicons name="logo-linkedin" size={18} color="#0077B5" />
              </TouchableOpacity>
            )}
            {profile.github && (
              <TouchableOpacity style={styles.socialLink} onPress={() => openUrl(`https://github.com/${profile.github}`)}>
                <Ionicons name="logo-github" size={18} color={isDark ? '#ffffff' : '#000000'} />
              </TouchableOpacity>
            )}
            {profile.youtube && (
              <TouchableOpacity style={styles.socialLink} onPress={() => openUrl(`https://youtube.com/${profile.youtube}`)}>
                <Ionicons name="logo-youtube" size={18} color="#FF0000" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Minimal Tab Bar */}
        <View style={styles.tabsContainer}>
          {['posts', 'followers', 'following'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Area */}
        <View style={styles.contentSection}>
          {activeTab === 'posts' && (
            <>
              {posts.length === 0 ? (
                <View style={styles.emptyState}><Text style={styles.emptyText}>No stories yet.</Text></View>
              ) : (
                posts.map((post) => (
                  <TouchableOpacity
                    key={post.id}
                    style={styles.postCard}
                    onPress={() => handlePostPress(post.id)}
                    activeOpacity={0.7}
                  >
                    {post.featured_image ? (
                      <Image source={{ uri: post.featured_image }} style={styles.postImage} resizeMode="cover" />
                    ) : null}

                    {/* Gallery Preview Horizontal Scroll */}
                    {post.post_images && post.post_images.length > 0 && !post.featured_image && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                        {post.post_images.map((img, i) => (
                          <Image key={img.id} source={{ uri: img.url }} style={styles.galleryImage} />
                        ))}
                      </ScrollView>
                    )}

                    <View style={styles.postMetaTop}>
                      <Text style={styles.postCategory}>{post.categories?.[0]?.name || 'General'}</Text>
                      <Text style={styles.postDate}>• {formatDate(post.created_at)}</Text>
                    </View>

                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postExcerpt} numberOfLines={3}>{post.excerpt}</Text>

                    <View style={styles.postFooter}>
                      <View style={styles.postActions}>
                        {/* Like */}
                        <TouchableOpacity
                          style={styles.iconTextBtn}
                          onPress={() => handleLikePost(post.id)}
                          disabled={likingPosts.has(post.id)}
                        >
                          <Ionicons
                            name={post.is_liked ? "heart" : "heart-outline"}
                            size={20}
                            color={post.is_liked ? "#ef4444" : textSecondary}
                          />
                          <Text style={[styles.iconTextLabel, post.is_liked && { color: '#ef4444' }]}>
                            {post.likes_count}
                          </Text>
                        </TouchableOpacity>

                        {/* Comment */}
                        <TouchableOpacity style={styles.iconTextBtn} onPress={() => handleCommentPress(post.id)}>
                          <Ionicons name="chatbubble-outline" size={19} color={textSecondary} />
                          <Text style={styles.iconTextLabel}>{post.comments_count}</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Read Time */}
                      <Text style={[styles.postDate, { fontSize: 11 }]}>{post.read_time} min read</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {(activeTab === 'followers' || activeTab === 'following') && (
            <View>
              {followersLoading || followingLoading ? (
                <ActivityIndicator color={accent} style={{ marginTop: 20 }} />
              ) : (activeTab === 'followers' ? followers : following).length === 0 ? (
                <View style={styles.emptyState}><Text style={styles.emptyText}>List is empty.</Text></View>
              ) : (
                (activeTab === 'followers' ? followers : following).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.userListItem}
                    onPress={() => navigation.push('AuthorProfile', { authorId: item.id })}
                  >
                    {item.profile_image_url ? (
                      <Image source={{ uri: item.profile_image_url }} style={styles.userAvatar} />
                    ) : <DefaultAvatar size={50} />}
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.full_name}</Text>
                      {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
                    </View>
                    <View style={styles.followSmallBtn}>
                      <Text style={styles.followSmallBtnText}>View</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Lightbox Overlay */}
      {lightboxVisible && (
        <View style={styles.lightboxContainer}>
          <TouchableOpacity style={styles.lightboxCloseButton} onPress={closeLightbox}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: lightboxImages[currentImageIndex] }}
            style={{ width: width, height: height * 0.7 }}
            resizeMode="contain"
          />
          {lightboxImages.length > 1 && (
            <View style={styles.lightboxControls}>
              <TouchableOpacity onPress={prevImage} disabled={currentImageIndex === 0}>
                <Ionicons name="chevron-back" size={32} color={currentImageIndex === 0 ? '#555' : '#fff'} />
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 16 }}>{currentImageIndex + 1} / {lightboxImages.length}</Text>
              <TouchableOpacity onPress={nextImage} disabled={currentImageIndex === lightboxImages.length - 1}>
                <Ionicons name="chevron-forward" size={32} color={currentImageIndex === lightboxImages.length - 1 ? '#555' : '#fff'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default AuthorProfileScreen;