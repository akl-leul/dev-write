import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  FlatList,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FileText, Image as ImageIcon, Eye, Save, Send, Trash2, Edit3, Search, Filter, Calendar } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import RichTextEditor from '../components/RichTextEditor';
import RenderHtml from 'react-native-render-html';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PostImage {
  id: string;
  post_id: string;
  url: string;
  alt_text: string | null;
  order_index: number;
  created_at: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content_markdown: string;
  excerpt: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  featured_image: string | null;
  category_id: string | null;
  categories?: { name: string; slug: string } | null;
  views_count?: number;
  post_images?: PostImage[];
  post_tags?: { tags: Tag }[];
}

const DRAFT_CACHE_KEY = 'draft_post_cache';
const AUTO_SAVE_INTERVAL = 10000; // 10 seconds

const CreatePostScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'drafts' | 'create'>('create');
  const tabAnimation = useRef(new Animated.Value(0)).current;

  // Create Post state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  
  // Drafts/Posted state
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [posted, setPosted] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [showViewer, setShowViewer] = useState(false);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  
  // Category selection states
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Gallery images state
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  
  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const postsPerPage = 20;
  
  // Auto-save state
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  const { isDark } = useTheme();
  const { user } = useAuth();

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

  // Tab animation
  useEffect(() => {
    Animated.spring(tabAnimation, {
      toValue: activeTab === 'create' ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [activeTab]);

  // Load cached draft on mount
  useEffect(() => {
    loadCachedDraft();
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (activeTab === 'create' && (title || content)) {
      const currentDraft = JSON.stringify({ 
        title, 
        content, 
        excerpt, 
        categoryId, 
        featuredImage, 
        galleryImages, 
        selectedTags 
      });
      if (currentDraft !== lastSavedRef.current) {
        // Clear existing timer
        if (autoSaveTimer.current) {
          clearTimeout(autoSaveTimer.current);
        }
        
        // Set new timer
        autoSaveTimer.current = setTimeout(() => {
          saveDraftToCache();
        }, AUTO_SAVE_INTERVAL);
      }
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [title, content, excerpt, categoryId, featuredImage, galleryImages, selectedTags, activeTab]);

  // Fetch posts when tab changes
  useEffect(() => {
    if (activeTab === 'drafts' && allPosts.length === 0) {
      fetchPosts();
    }
  }, [activeTab]);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, []);

  const loadCachedDraft = async () => {
    try {
      const cached = await SecureStore.getItemAsync(DRAFT_CACHE_KEY);
      if (cached) {
        const draft = JSON.parse(cached);
        setTitle(draft.title || '');
        setContent(draft.content || '');
        setExcerpt(draft.excerpt || '');
        setCategoryId(draft.categoryId || null);
        setFeaturedImage(draft.featuredImage || null);
        setGalleryImages(draft.galleryImages || []);
        setSelectedTags(draft.selectedTags || []);
        
        // Set category name if categoryId exists
        if (draft.categoryId) {
          const cat = categories.find(c => c.id === draft.categoryId);
          if (cat) setCategory(cat.name);
        }
        
        // Set last saved time
        if (draft.timestamp) {
          setLastSavedTime(new Date(draft.timestamp));
        }
        
        Alert.alert(
          'Draft Restored',
          'Your previous draft has been restored. You can continue editing.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error loading cached draft:', error);
    }
  };

  const saveDraftToCache = async () => {
    try {
      const draft = {
        title,
        content,
        excerpt,
        categoryId,
        featuredImage,
        galleryImages,
        selectedTags,
        timestamp: Date.now(),
      };
      await SecureStore.setItemAsync(DRAFT_CACHE_KEY, JSON.stringify(draft));
      lastSavedRef.current = JSON.stringify(draft);
      setLastSavedTime(new Date());
    } catch (error) {
      console.error('Error saving draft to cache:', error);
    }
  };

  const clearDraftCache = async () => {
    try {
      await SecureStore.deleteItemAsync(DRAFT_CACHE_KEY);
      lastSavedRef.current = '';
    } catch (error) {
      console.error('Error clearing draft cache:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name, slug, color, created_at')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchPosts = async (loadMore = false) => {
    if (!user) return;
    
    if (!loadMore) {
      setLoadingPosts(true);
      setPage(1);
    }
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          categories:category_id (name, slug),
          post_images (id, url, alt_text, order_index),
          post_tags (tags:tags (id, name, slug, color))
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * postsPerPage, page * postsPerPage - 1);

      if (error) throw error;
      
      const posts = (data || []) as Post[];
      
      if (loadMore) {
        setAllPosts(prev => [...prev, ...posts]);
      } else {
        setAllPosts(posts);
      }
      
      setDrafts(posts.filter(p => p.status === 'draft'));
      setPosted(posts.filter(p => p.status === 'published'));
      
      // Check if there are more posts to load
      setHasMore(posts.length === postsPerPage);
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoadingPosts(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // Word count and reading time
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getReadingTime = (text: string) => {
    const words = getWordCount(text);
    const minutes = Math.ceil(words / 200); // Average reading speed: 200 words/min
    return minutes;
  };

  const wordCount = getWordCount(content);
  const readingTime = getReadingTime(content);

  // Generate thumbnail
  const generateThumbnail = (): string | null => {
    if (featuredImage) return featuredImage;
    
    // Generate text-based thumbnail
    if (title) {
      // In a real app, you'd generate an image with the title text
      // For now, return null and use a placeholder
      return null;
    }
    
    return null;
  };

  // Convert markdown to HTML
  const markdownToHtml = (markdown: string): string => {
    // Basic markdown to HTML conversion
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
    
    // Wrap lists
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    
    return html;
  };

  // Filter and sort posts
  const getFilteredPosts = () => {
    let filtered = [...allPosts];

    // Status filter
    if (statusFilter === 'draft') {
      filtered = filtered.filter(p => p.status === 'draft');
    } else if (statusFilter === 'published') {
      filtered = filtered.filter(p => p.status === 'published');
    }

    // Search filter (title, excerpt, content, tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const matchesText = 
          p.title.toLowerCase().includes(query) ||
          p.content_markdown.toLowerCase().includes(query) ||
          (p.excerpt && p.excerpt.toLowerCase().includes(query));
        
        const matchesTags = p.post_tags?.some(pt => 
          pt.tags.name.toLowerCase().includes(query)
        );
        
        return matchesText || matchesTags;
      });
    }

    // Date sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateSort === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const pickImage = async () => {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      setFeaturedImage(pickerResult.assets[0].uri);
    }
  };

  const pickGalleryImages = async () => {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!pickerResult.canceled && pickerResult.assets) {
      const newImages = pickerResult.assets.map(asset => asset.uri);
      setGalleryImages(prev => [...prev, ...newImages]);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveGalleryImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...galleryImages];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setGalleryImages(newImages);
  };

  const handleSave = async (isPublished: boolean) => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title is required for publishing');
      return;
    }
    
    if (!content.trim()) {
      Alert.alert('Validation Error', 'Content cannot be empty');
      return;
    }
    
    if (isPublished && !title.trim()) {
      Alert.alert('Validation Error', 'Title is required to publish a post');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setSaving(true);

    try {
      const slug = editingPostId ? undefined : generateSlug(title);
      const finalExcerpt = excerpt || content.substring(0, 150).replace(/\n/g, ' ') + '...';
      const readTime = getReadingTime(content);
      const thumbnail = generateThumbnail();

      const postData: any = {
        author_id: user.id,
        title: title.trim(),
        content_markdown: content.trim(),
        excerpt: finalExcerpt,
        status: isPublished ? 'published' : 'draft',
        category_id: categoryId,
        read_time: readTime,
        featured_image: featuredImage || thumbnail,
        is_published: isPublished,
        comments_enabled: true,
      };

      if (slug) postData.slug = slug;

      let postId = editingPostId;

      if (editingPostId) {
        // Update existing post
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', editingPostId);

        if (error) throw error;
      } else {
        // Create new post
        const { data, error } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();

        if (error) throw error;
        postId = data.id;
      }

      // Save gallery images
      if (postId && galleryImages.length > 0) {
        // First delete existing images if editing
        if (editingPostId) {
          await supabase
            .from('post_images')
            .delete()
            .eq('post_id', postId);
        }
        
        // Insert new gallery images
        const imageData = galleryImages.map((url, index) => ({
          post_id: postId,
          url,
          order_index: index,
          alt_text: '',
        }));
        
        await supabase
          .from('post_images')
          .insert(imageData);
      }

      // Save tags
      if (postId && selectedTags.length > 0) {
        // Delete existing tags if editing
        if (editingPostId) {
          await supabase
            .from('post_tags')
            .delete()
            .eq('post_id', postId);
        }
        
        // Insert new tags
        const tagData = selectedTags.map(tagId => ({
          post_id: postId,
          tag_id: tagId,
        }));
        
        await supabase
          .from('post_tags')
          .insert(tagData);
      }

      // Clear cache and form
      await clearDraftCache();
      resetForm();
      
      Alert.alert(
        'Success',
        `Post ${isPublished ? 'published' : 'saved as draft'} successfully!`
      );

      // Refresh posts list
      if (activeTab === 'drafts') {
        fetchPosts();
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setExcerpt('');
    setCategory('');
    setCategoryId(null);
    setFeaturedImage(null);
    setGalleryImages([]);
    setSelectedTags([]);
    setEditingPostId(null);
    setLastSavedTime(null);
  };

  const handleEdit = (post: Post) => {
    setTitle(post.title);
    setContent(post.content_markdown);
    setExcerpt(post.excerpt || '');
    setCategoryId(post.category_id);
    setFeaturedImage(post.featured_image);
    setEditingPostId(post.id);
    
    // Load gallery images
    if (post.post_images) {
      setGalleryImages(post.post_images.map(img => img.url).sort((a, b) => 
        (post.post_images?.find(img => img.url === a)?.order_index || 0) - 
        (post.post_images?.find(img => img.url === b)?.order_index || 0)
      ));
    } else {
      setGalleryImages([]);
    }
    
    // Load tags
    if (post.post_tags) {
      setSelectedTags(post.post_tags.map(pt => pt.tags.id));
    } else {
      setSelectedTags([]);
    }
    
    if (post.categories) {
      setCategory(post.categories.name);
    }
    
    setActiveTab('create');
  };

  const handleDelete = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;

              Alert.alert('Success', 'Post deleted successfully');
              fetchPosts();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const handleMoveToPublished = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'published', is_published: true })
        .eq('id', postId);

      if (error) throw error;

      Alert.alert('Success', 'Post moved to published');
      fetchPosts();
    } catch (error) {
      console.error('Move error:', error);
      Alert.alert('Error', 'Failed to move post');
    }
  };

  const handleMoveToDraft = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'draft', is_published: false })
        .eq('id', postId);

      if (error) throw error;

      Alert.alert('Success', 'Post moved to draft');
      fetchPosts();
    } catch (error) {
      console.error('Move error:', error);
      Alert.alert('Error', 'Failed to move post');
    }
  };

  const loadMorePosts = () => {
    if (hasMore && !loadingPosts) {
      setPage(prev => prev + 1);
      fetchPosts(true);
    }
  };

  const handleView = (post: Post) => {
    setViewingPost(post);
    setShowViewer(true);
  };

  const handleCategorySelect = (cat: Category) => {
    setCategory(cat.name);
    setCategoryId(cat.id);
    setShowCategoryModal(false);
  };

  const handleTagSelect = (tag: Tag) => {
    if (selectedTags.includes(tag.id)) {
      setSelectedTags(prev => prev.filter(id => id !== tag.id));
    } else {
      setSelectedTags(prev => [...prev, tag.id]);
    }
  };

  const addCustomTag = async () => {
    if (!tagInput.trim()) return;
    
    const slug = tagInput.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({ name: tagInput.trim(), slug, color: '#3B82F6' })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add created_at to match Tag interface
      const newTag = {
        ...data,
        created_at: new Date().toISOString()
      };
      
      setTags(prev => [...prev, newTag]);
      setSelectedTags(prev => [...prev, data.id]);
      setTagInput('');
    } catch (error) {
      console.error('Error creating tag:', error);
      Alert.alert('Error', 'Failed to create tag');
    }
  };

  // Styles
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingBottom: 70,
      paddingTop: 50,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    activeTabText: {
      color: colors.primary,
    },
    tabContent: {
      flex: 1,
    },
    
    // Create Post Styles
    createContainer: {
      flex: 1,
    },
    createScroll: {
      flex: 1,
    },
    createContent: {
      padding: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      backgroundColor: colors.inputBg,
      color: colors.textPrimary,
      marginBottom: 20,
    },
    textArea: {
      minHeight: 300,
      textAlignVertical: 'top',
    },
    statsBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.cardBg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statsText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
    },
    button: {
      flex: 1,
      borderRadius: 12,
      padding: 18,
      alignItems: 'center',
      overflow: 'hidden',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryButton: {
      backgroundColor: colors.cardBg,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.textPrimary,
    },
    
    // Drafts/Posted Styles
    draftsContainer: {
      flex: 1,
    },
    searchContainer: {
      padding: 16,
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      paddingHorizontal: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    searchInputText: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.textPrimary,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    activeFilter: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    activeFilterText: {
      color: '#FFFFFF',
    },
    postCard: {
      backgroundColor: colors.cardBg,
      marginHorizontal: 16,
      marginVertical: 8,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    postTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginRight: 12,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    draftBadge: {
      backgroundColor: colors.warning,
    },
    publishedBadge: {
      backgroundColor: colors.success,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    postPreview: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    postMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    postDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    postActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.inputBg,
    },
    
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.cardBg,
      borderRadius: 20,
      padding: 24,
      width: screenWidth * 0.9,
      maxHeight: screenHeight * 0.8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 20,
    },
    categoryItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryName: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    
    // Viewer Styles
    viewerContainer: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    viewerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    viewerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    viewerContent: {
      padding: 20,
    },
    // Enhanced Post Card Styles
    featuredImage: {
      width: '100%',
      height: 200,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      backgroundColor: colors.inputBg,
    },
    galleryScroll: {
      marginTop: 8,
    },
    galleryContainer: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    galleryImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      marginRight: 8,
      backgroundColor: colors.inputBg,
    },
    postContent: {
      padding: 16,
    },
    tagsScroll: {
      marginVertical: 8,
    },
    tagsContainer: {
      paddingRight: 16,
    },
    tag: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '600',
    },
    metaLeft: {
      flex: 1,
    },
    viewsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    viewsText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    // Enhanced Create Post Styles
    imagePreviewContainer: {
      position: 'relative',
      marginBottom: 20,
    },
    featuredImagePreview: {
      width: '100%',
      height: 200,
      borderRadius: 12,
    },
    removeImageButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(239, 68, 68, 0.9)',
      borderRadius: 12,
      padding: 4,
    },
    galleryPreviewContainer: {
      marginBottom: 20,
    },
    galleryItemContainer: {
      position: 'relative',
      marginRight: 8,
    },
    galleryItemPreview: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: colors.inputBg,
    },
    removeGalleryButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(239, 68, 68, 0.9)',
      borderRadius: 10,
      padding: 2,
    },
    selectedTagsContainer: {
      marginBottom: 20,
    },
    selectedTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
    },
    selectedTagText: {
      fontSize: 14,
      fontWeight: '600',
      marginRight: 6,
    },
    removeTagButton: {
      padding: 2,
    },
    statsLeft: {
      flex: 1,
    },
    lastSavedText: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
    },
    editingText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
    },
    // Tags Modal Styles
    addTagContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 8,
    },
    tagInput: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      backgroundColor: colors.inputBg,
      color: colors.textPrimary,
    },
    addTagButton: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.inputBg,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    tagItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    tagColorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 12,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    loadingMore: {
      padding: 20,
      alignItems: 'center',
    },
  });

  const renderDraftsTab = () => {
    const filteredPosts = getFilteredPosts();

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' • ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };

    const renderPostCard = ({ item }: { item: Post }) => {
      const sortedImages = item.post_images?.sort((a, b) => a.order_index - b.order_index) || [];
      
      return (
        <View style={styles.postCard}>
          {/* Featured Image */}
          {item.featured_image && (
            <Image
              source={{ uri: item.featured_image }}
              style={styles.featuredImage}
            />
          )}
          
          {/* Gallery Images Horizontal Scroll */}
          {sortedImages.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.galleryScroll}
              contentContainerStyle={styles.galleryContainer}
            >
              {sortedImages.map((image, index) => (
                <Image
                  key={image.id}
                  source={{ uri: image.url }}
                  style={styles.galleryImage}
                />
              ))}
            </ScrollView>
          )}
          
          <View style={styles.postContent}>
            <View style={styles.postHeader}>
              <Text style={styles.postTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  item.status === 'draft' ? styles.draftBadge : styles.publishedBadge,
                ]}
              >
                <Text style={styles.badgeText}>
                  {item.status === 'draft' ? 'Draft' : 'Published'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.postPreview} numberOfLines={3}>
              {item.excerpt || item.content_markdown.substring(0, 120).replace(/\n/g, ' ') + '...'}
            </Text>
            
            {/* Tags */}
            {item.post_tags && item.post_tags.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tagsScroll}
                contentContainerStyle={styles.tagsContainer}
              >
                {item.post_tags.map(({ tags }) => (
                  <View key={tags.id} style={[styles.tag, { backgroundColor: tags.color + '20' }]}>
                    <Text style={[styles.tagText, { color: tags.color }]}>
                      {tags.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
            
            <View style={styles.postMeta}>
              <View style={styles.metaLeft}>
                <Text style={styles.postDate}>
                  {formatDate(item.created_at)}
                </Text>
                <View style={styles.viewsContainer}>
                  <Eye size={14} color={colors.textSecondary} />
                  <Text style={styles.viewsText}>
                    {item.views_count || 0} views
                  </Text>
                </View>
              </View>
              
              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(item)}
                >
                  <Edit3 size={18} color={colors.primary} />
                </TouchableOpacity>
                
                {item.status === 'published' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleView(item)}
                  >
                    <Eye size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
                
                {item.status === 'draft' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleMoveToPublished(item.id)}
                  >
                    <Send size={18} color={colors.success} />
                  </TouchableOpacity>
                )}
                
                {item.status === 'published' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleMoveToDraft(item.id)}
                  >
                    <Save size={18} color={colors.warning} />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Trash2 size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      );
    };

    return (
      <View style={styles.draftsContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInput}>
            <Search size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInputText}
              placeholder="Search posts..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === 'all' && styles.activeFilter]}
              onPress={() => setStatusFilter('all')}
            >
              <Text style={[styles.filterText, statusFilter === 'all' && styles.activeFilterText]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === 'draft' && styles.activeFilter]}
              onPress={() => setStatusFilter('draft')}
            >
              <Text style={[styles.filterText, statusFilter === 'draft' && styles.activeFilterText]}>
                Drafts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, statusFilter === 'published' && styles.activeFilter]}
              onPress={() => setStatusFilter('published')}
            >
              <Text style={[styles.filterText, statusFilter === 'published' && styles.activeFilterText]}>
                Posted
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton]}
              onPress={() => setDateSort(dateSort === 'newest' ? 'oldest' : 'newest')}
            >
              <Calendar size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.filterText}>
                {dateSort === 'newest' ? 'Newest' : 'Oldest'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Posts List */}
        {loadingPosts && filteredPosts.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredPosts}
            keyExtractor={(item) => item.id}
            renderItem={renderPostCard}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.textSecondary}
              />
            }
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              loadingPosts && filteredPosts.length > 0 ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No posts found matching your search.' : 'No posts yet.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    );
  };

  const renderCreateTab = () => {
    return (
      <KeyboardAvoidingView
        style={styles.createContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          style={styles.createScroll}
          contentContainerStyle={styles.createContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.inputLabel}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter post title"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.inputLabel}>Content *</Text>
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Write your post content..."
          />

          <Text style={styles.inputLabel}>Excerpt (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief description of your post"
            placeholderTextColor={colors.textSecondary}
            value={excerpt}
            onChangeText={setExcerpt}
            multiline
            numberOfLines={4}
          />

          {/* Category Selector */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={{ color: category ? colors.textPrimary : colors.textSecondary }}>
              {category || 'Select Category (optional)'}
            </Text>
          </TouchableOpacity>

          {/* Featured Image */}
          <TouchableOpacity style={styles.input} onPress={pickImage}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ImageIcon size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={{ color: featuredImage ? colors.textPrimary : colors.textSecondary }}>
                {featuredImage ? 'Change Featured Image' : 'Add Featured Image (optional)'}
              </Text>
            </View>
          </TouchableOpacity>

          {featuredImage && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: featuredImage }}
                style={styles.featuredImagePreview}
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setFeaturedImage(null)}
              >
                <Trash2 size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Gallery Images */}
          <TouchableOpacity style={styles.input} onPress={pickGalleryImages}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ImageIcon size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.textSecondary }}>
                  Gallery Images ({galleryImages.length})
                </Text>
              </View>
              <Ionicons name="add-circle" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {galleryImages.length > 0 && (
            <View style={styles.galleryPreviewContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {galleryImages.map((uri, index) => (
                  <View key={index} style={styles.galleryItemContainer}>
                    <Image source={{ uri }} style={styles.galleryItemPreview} />
                    <TouchableOpacity
                      style={styles.removeGalleryButton}
                      onPress={() => removeGalleryImage(index)}
                    >
                      <Trash2 size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Tags Selector */}
          <TouchableOpacity style={styles.input} onPress={() => setShowTagsModal(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="pricetag" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.textSecondary }}>
                  Tags ({selectedTags.length})
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {selectedTags.length > 0 && (
            <View style={styles.selectedTagsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedTags.map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <View key={tag.id} style={[styles.selectedTag, { backgroundColor: tag.color + '20' }]}>
                      <Text style={[styles.selectedTagText, { color: tag.color }]}>
                        {tag.name}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeTagButton}
                        onPress={() => handleTagSelect(tag)}
                      >
                        <Ionicons name="close" size={12} color={tag.color} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Preview Button */}
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowPreview(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Eye size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.textSecondary }}>Preview Post</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statsLeft}>
            <Text style={styles.statsText}>
              {wordCount} words • {readingTime} min read
            </Text>
            {lastSavedTime && (
              <Text style={styles.lastSavedText}>
                Auto-saved {lastSavedTime.toLocaleTimeString()}
              </Text>
            )}
          </View>
          {editingPostId && (
            <Text style={styles.editingText}>Editing post</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => handleSave(false)}
            disabled={saving}
          >
            <Text style={styles.secondaryButtonText}>Save as Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleSave(true)}
            disabled={saving}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'drafts' && styles.activeTab]}
          onPress={() => setActiveTab('drafts')}
        >
          <Text style={[styles.tabText, activeTab === 'drafts' && styles.activeTabText]}>
            Drafts / Posted
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.activeTab]}
          onPress={() => setActiveTab('create')}
        >
          <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
            Create Post
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'drafts' ? renderDraftsTab() : renderCreateTab()}
      </View>

      {/* Tags Modal */}
      <Modal
        visible={showTagsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTagsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Tags</Text>
            
            {/* Add Custom Tag */}
            <View style={styles.addTagContainer}>
              <TextInput
                style={styles.tagInput}
                placeholder="Add new tag..."
                placeholderTextColor={colors.textSecondary}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addCustomTag}
              />
              <TouchableOpacity
                style={styles.addTagButton}
                onPress={addCustomTag}
                disabled={!tagInput.trim()}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.categoryItem,
                      isSelected && { backgroundColor: tag.color + '20' }
                    ]}
                    onPress={() => handleTagSelect(tag)}
                  >
                    <View style={styles.tagItemContent}>
                      <View style={[styles.tagColorDot, { backgroundColor: tag.color }]} />
                      <Text style={styles.categoryName}>{tag.name}</Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color={tag.color} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  setSelectedTags([]);
                  setShowTagsModal(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={() => setShowTagsModal(false)}
              >
                <Text style={styles.buttonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryItem}
                  onPress={() => handleCategorySelect(cat)}
                >
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.button, { marginTop: 20 }]}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerTitle}>Preview</Text>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.viewerContent}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 }}>
              {title || 'Untitled'}
            </Text>
            {featuredImage && (
              <Image
                source={{ uri: featuredImage }}
                style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 20 }}
              />
            )}
            <RenderHtml
              contentWidth={screenWidth - 40}
              source={{ html: markdownToHtml(content) }}
              baseStyle={{ color: colors.textPrimary, fontSize: 16, lineHeight: 24 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Post Viewer Modal */}
      <Modal
        visible={showViewer}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewer(false)}
      >
        {viewingPost && (
          <View style={styles.viewerContainer}>
            <View style={styles.viewerHeader}>
              <Text style={styles.viewerTitle}>{viewingPost.title}</Text>
              <TouchableOpacity onPress={() => setShowViewer(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.viewerContent}>
              {viewingPost.featured_image && (
                <Image
                  source={{ uri: viewingPost.featured_image }}
                  style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 20 }}
                />
              )}
              <RenderHtml
                contentWidth={screenWidth - 40}
                source={{ html: markdownToHtml(viewingPost.content_markdown) }}
                baseStyle={{ color: colors.textPrimary, fontSize: 16, lineHeight: 24 }}
              />
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
};

export default CreatePostScreen;
