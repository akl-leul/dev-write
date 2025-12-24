import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PostWithProfile } from '../lib/supabase';

const BookmarksScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { isDark } = useTheme();
  const { user } = useAuth();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#111827' : '#ffffff',
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#111827',
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 4,
    },
    postCard: {
      margin: 16,
      padding: 16,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    postTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#111827',
      marginBottom: 8,
    },
    postExcerpt: {
      fontSize: 14,
      color: isDark ? '#d1d5db' : '#4b5563',
      marginBottom: 12,
      lineHeight: 20,
    },
    postMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    authorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    authorAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginRight: 8,
    },
    authorName: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    postDate: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    featuredImage: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      marginBottom: 12,
    },
    categoryBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: '#3b82f6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    categoryText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
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
    removeBookmarkButton: {
      backgroundColor: '#ef4444',
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    removeBookmarkButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  useEffect(() => {
    fetchBookmarkedPosts();
  }, [user]);

  const fetchBookmarkedPosts = async () => {
    if (!user) return;

    try {
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', user.id);

      if (bookmarksError) throw bookmarksError;

      if (!bookmarks || bookmarks.length === 0) {
        setBookmarkedPosts([]);
        return;
      }

      const postIds = bookmarks.map(b => b.post_id);

      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_author_id_fkey (
            id,
            full_name,
            profile_image_url
          )
        `)
        .in('id', postIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setBookmarkedPosts(posts || []);
    } catch (error) {
      console.error('Error fetching bookmarked posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookmarkedPosts();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const removeBookmark = async (postId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      if (error) throw error;

      // Refresh the list
      fetchBookmarkedPosts();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove bookmark');
      console.error('Remove bookmark error:', error);
    }
  };

  const renderPost = ({ item }: { item: PostWithProfile }) => (
    <View style={styles.postCard}>
      <TouchableOpacity onPress={() => navigation.navigate('Settings', { screen: 'PostDetail', params: { postId: item.id } })}>
        {item.featured_image && (
          <View style={{ position: 'relative', marginBottom: 12 }}>
            <Image source={{ uri: item.featured_image }} style={styles.featuredImage} />
            {item.category_id && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>Category</Text>
              </View>
            )}
          </View>
        )}
        
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postExcerpt} numberOfLines={3}>
          {item.excerpt}
        </Text>
        
        <View style={styles.postMeta}>
          <View style={styles.authorInfo}>
            {item.profiles?.profile_image_url && (
              <Image
                source={{ uri: item.profiles.profile_image_url }}
                style={styles.authorAvatar}
              />
            )}
            <Text style={styles.authorName}>
              {item.profiles?.full_name || 'Anonymous'}
            </Text>
          </View>
          <Text style={styles.postDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.removeBookmarkButton}
        onPress={() => removeBookmark(item.id)}
      >
        <Text style={styles.removeBookmarkButtonText}>Remove Bookmark</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.emptyState]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookmarks</Text>
        <Text style={styles.subtitle}>Your saved articles</Text>
      </View>
      
      <FlatList
        data={bookmarkedPosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#9ca3af' : '#6b7280'}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No bookmarked posts yet. Save articles to read later!
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default BookmarksScreen;
