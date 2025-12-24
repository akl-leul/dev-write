import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons'; // Using Expo icons for better UI
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase, Profile } from '../lib/supabase';
import { SettingsStackParamList } from '../types/navigation';

// --- Types ---
type RootStackParamList = {
  Profile: undefined;
  Followers: undefined;
  Following: undefined;
  MyPosts: undefined;
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'Profile'>;

type UserListItem = {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
};

type FormData = {
  full_name: string;
  age: string;
  gender: string;
  phone: string;
  bio: string;
  website: string;
  twitter: string;
  facebook: string;
  linkedin: string;
  instagram: string;
  github: string;
  youtube: string;
  show_phone: boolean;
  badge: string;
  background_image_url: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  newEmail: string;
};

// --- Component ---
const ProfileScreen: React.FC<{ navigation: ProfileScreenNavigationProp }> = ({ navigation }) => {
  // Original State
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  
  // New State for Bottom Slider
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'Followers' | 'Following' | null>(null);
  const [modalListLoading, setModalListLoading] = useState(false);
  const [usersList, setUsersList] = useState<UserListItem[]>([]);

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    age: '',
    gender: '',
    phone: '',
    bio: '',
    website: '',
    twitter: '',
    facebook: '',
    linkedin: '',
    instagram: '',
    github: '',
    youtube: '',
    show_phone: false,
    badge: '',
    background_image_url: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    newEmail: '',
  });

  const { isDark } = useTheme();
  const { user, profile, updateProfile } = useAuth();

  // --- Styles ---
  const colors = {
    bg: isDark ? '#111827' : '#F9FAFB',
    cardBg: isDark ? '#1F2937' : '#FFFFFF',
    text: isDark ? '#F9FAFB' : '#111827',
    textSec: isDark ? '#9CA3AF' : '#6B7280',
    primary: '#3B82F6',
    border: isDark ? '#374151' : '#E5E7EB',
    inputBg: isDark ? '#374151' : '#F3F4F6',
    danger: '#EF4444',
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingBottom: 50,
      backgroundColor: colors.bg,
    },
    scrollView: {
      flex: 1,
    },
    // Header & Cover
    coverContainer: {
      height: 200,
      width: '100%',
      position: 'relative',
    },
    coverImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    coverPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: isDark ? '#374151' : '#CBD5E1',
      justifyContent: 'center',
      alignItems: 'center',
    },
    editCoverBtn: {
      position: 'absolute',
      bottom: 16,
      right: 16,
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 8,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    
    // Profile Info Section
    profileHeader: {
      alignItems: 'center',
      marginTop: -60,
      paddingHorizontal: 20,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 8,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 4,
      borderColor: colors.cardBg,
      backgroundColor: colors.border,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: isDark ? '#4B5563' : '#9CA3AF',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: colors.cardBg,
    },
    editAvatarBtn: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.cardBg,
    },
    nameText: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
    },
    badgeContainer: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#DBEAFE',
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: 12,
      marginTop: 4,
    },
    badgeText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    emailText: {
      fontSize: 14,
      color: colors.textSec,
      marginTop: 4,
    },

    // Stats Bar
    statsCard: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      marginHorizontal: 20,
      marginTop: 24,
      marginBottom: 20,
      borderRadius: 16,
      padding: 16, 
      justifyContent: 'space-around',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSec,
      marginTop: 4,
    },
    divider: {
      width: 1,
      height: '80%',
      backgroundColor: colors.border,
    },

    // Content Sections
    sectionContainer: {
      backgroundColor: colors.cardBg,
      marginHorizontal: 20,
      marginBottom: 20,
      borderRadius: 16,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
      elevation: 2,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginLeft: 8,
    },
    
    // Inputs & Read-only rows
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSec,
      marginBottom: 6,
      marginLeft: 4,
    },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: 10,
      padding: 12,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoIconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: 15,
      color: colors.textSec,
      marginLeft: 10,
    },
    infoValue: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
      flex: 1,
      textAlign: 'right',
      marginLeft: 16,
    },
    
    // Buttons
    buttonContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryBtnText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryBtn: {
      backgroundColor: 'transparent',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    secondaryBtnText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      padding: 12,
      borderRadius: 10,
    },

    // --- Modal Styles ---
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '70%',
      paddingTop: 20,
      paddingBottom: 50,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 10,
    },
    userListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    userListAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.border,
    },
    userListInfo: {
      marginLeft: 12,
      flex: 1,
    },
    userListName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    userListHandle: {
      fontSize: 14,
      color: colors.textSec,
    },
    userListBtn: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: isDark ? '#374151' : '#E5E7EB',
      borderRadius: 20,
    },
    userListBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyStateText: {
      color: colors.textSec,
      marginTop: 10,
    },
  });

  // --- Effects ---
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        age: profile.age?.toString() || '',
        gender: profile.gender || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        website: profile.website || '',
        twitter: profile.twitter || '',
        facebook: profile.facebook || '',
        linkedin: profile.linkedin || '',
        instagram: profile.instagram || '',
        github: profile.github || '',
        youtube: profile.youtube || '',
        show_phone: profile.show_phone || false,
        badge: profile.badge || '',
        background_image_url: profile.background_image_url || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        newEmail: '',
      });
      fetchFollowStats();
    }
  }, [profile]);

  // --- Functions ---
  const fetchFollowStats = async () => {
    if (!profile?.id) return;
    
    try {
      // Fetch followers count
      const { count: followersCount, error: followersError } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id);
      
      if (followersError) throw followersError;
      
      // Fetch following count
      const { count: followingCountData, error: followingError } = await supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile.id);
      
      if (followingError) throw followingError;
      
      // Fetch posts count
      const { count: postsCount, error: postsError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', profile.id)
        .eq('status', 'published');
      
      if (postsError) throw postsError;
      
      // Update state with real counts
      setFollowersCount(followersCount || 0);
      setFollowingCount(followingCountData || 0);
      setPostsCount(postsCount || 0);
      
    } catch (error) {
      console.error('Error fetching follow stats:', error);
      // Set default values on error
      setFollowersCount(0);
      setFollowingCount(0);
      setPostsCount(0);
    }
  };

  const fetchUsersList = async (type: 'Followers' | 'Following') => {
    setModalListLoading(true);
    setUsersList([]);
    
    try {
      let query;
      
      if (type === 'Followers') {
        // Get users who follow the current user
        query = supabase
          .from('followers')
          .select(`
            profiles!followers_follower_id_fkey (
              id,
              full_name,
              profile_image_url
            )
          `)
          .eq('following_id', profile?.id);
      } else {
        // Get users that the current user follows
        query = supabase
          .from('followers')
          .select(`
            profiles!followers_following_id_fkey (
              id,
              full_name,
              profile_image_url
            )
          `)
          .eq('follower_id', profile?.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform data to match UserListItem format
      const transformedData = data?.map((item: any) => ({
        id: item.profiles.id,
        name: item.profiles.full_name || 'Unknown User',
        username: `@${item.profiles.id.slice(0, 8)}`, // Generate username from ID
        avatar_url: item.profiles.profile_image_url,
      })) || [];
      
      setUsersList(transformedData);
      
    } catch (error) {
      console.error('Error fetching user list:', error);
      // Set empty list on error
      setUsersList([]);
    } finally {
      setModalListLoading(false);
    }
  };

  const handleOpenStats = (type: 'Followers' | 'Following') => {
    setModalType(type);
    setModalVisible(true);
    fetchUsersList(type);
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
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!pickerResult.canceled && pickerResult.assets[0]) {
      Alert.alert('Success', 'Avatar updated (placeholder)');
    }
  };

  const pickCoverImage = async () => {
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
      Alert.alert('Success', 'Cover image updated (placeholder)');
    }
  };

  const passwordMeetsPolicy = (password: string) => {
    const hasLength = password.length >= 8;
    const hasLetters = /[A-Za-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    return hasLength && hasLetters && hasNumbers;
  };

  const handlePasswordUpdate = async () => {
    if (!formData.newPassword) return;

    if (!formData.currentPassword) {
      throw new Error('Current password is required to change password.');
    }

    if (formData.newPassword !== formData.confirmPassword) {
      throw new Error('New password and confirmation do not match.');
    }

    if (!passwordMeetsPolicy(formData.newPassword)) {
      throw new Error('Password must be at least 8 characters and include letters and numbers.');
    }

    const email = (user as any)?.email;
    if (!email) {
      throw new Error('Unable to update password: missing user email.');
    }

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: formData.currentPassword,
    });
    if (signInError) {
      throw new Error('Current password is incorrect.');
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: formData.newPassword,
    });
    if (updateError) {
      throw new Error('Failed to update password. Please try again.');
    }

    // Clear sensitive fields after success
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update password if requested
      await handlePasswordUpdate();

      // Update profile data
      const {
        currentPassword,
        newPassword,
        confirmPassword,
        newEmail,
        ...profileData
      } = formData;

      const updatedData = {
        ...profileData,
        age: formData.age ? parseInt(formData.age, 10) : null,
      };
      
      const { error } = await updateProfile(updatedData);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Profile updated successfully');
        setEditing(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const { signOut } = useAuth();
          await signOut();
        },
      },
    ]);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getBadgeIcon = (badgeType: string) => {
    const badge = badgeType.toLowerCase();
    switch (badge) {
      case 'gem':
      case 'diamond':
      case 'ruby':
      case 'emerald':
        return 'diamond';
      case 'star':
      case 'starred':
      case 'featured':
        return 'star';
      case 'crown':
      case 'king':
      case 'queen':
        return 'medal';
      case 'verified':
      case 'check':
      case 'tick':
        return 'checkmark-circle';
      case 'fire':
      case 'hot':
      case 'trending':
        return 'flame';
      case 'heart':
      case 'love':
      case 'favorite':
        return 'heart';
      case 'lightning':
      case 'bolt':
      case 'fast':
        return 'flash';
      case 'trophy':
      case 'winner':
      case 'champion':
        return 'trophy';
      case 'rocket':
      case 'launch':
      case 'boost':
        return 'rocket';
      case 'shield':
      case 'protected':
      case 'secure':
        return 'shield';
      default:
        return 'ribbon';
    }
  };

  // --- Render Functions ---

  const renderModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setModalVisible(false)}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalType}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close-circle" size={28} color={colors.textSec} />
            </TouchableOpacity>
          </View>

          {modalListLoading ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={usersList}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={colors.textSec} />
                  <Text style={styles.emptyStateText}>No users found</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.userListItem}>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.userListAvatar} />
                  ) : (
                    <View style={[styles.userListAvatar, { justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{color: colors.textSec, fontWeight: 'bold'}}>{getInitials(item.name)}</Text>
                    </View>
                  )}
                  <View style={styles.userListInfo}>
                    <Text style={styles.userListName}>{item.name}</Text>
                    <Text style={styles.userListHandle}>{item.username}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.userListBtn}
                    onPress={() => navigation.navigate('AuthorProfile', { authorId: item.id })}
                  >
                    <Text style={styles.userListBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
        {/* Cover Image Area */}
        <View style={styles.coverContainer}>
          {profile?.background_image_url ? (
            <Image source={{ uri: profile.background_image_url }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="image-outline" size={40} color={isDark ? '#9CA3AF' : '#64748B'} />
            </View>
          )}
          {editing && (
            <TouchableOpacity style={styles.editCoverBtn} onPress={pickCoverImage}>
              <Ionicons name="camera" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', marginLeft: 6, fontWeight: '600' }}>Edit Cover</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Header Profile Info */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile.profile_image_url ? (
              <Image source={{ uri: profile.profile_image_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={{ fontSize: 40, fontWeight: 'bold', color: '#FFF' }}>
                  {getInitials(profile.full_name || user?.email || 'U')}
                </Text>
              </View>
            )}
            {editing && (
              <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage}>
                <Ionicons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.nameText}>
            {profile.full_name || 'Anonymous User'}
          </Text>
          
          {profile.badge ? (
             <View style={styles.badgeContainer}>
               <Ionicons 
                 name={getBadgeIcon(profile.badge)} 
                 size={14} 
                 color={colors.primary} 
                 style={{ marginRight: 4 }}
               /> 
             </View>
          ) : null}

          <Text style={styles.emailText}>{user?.email}</Text>
        </View>

        {/* Stats Row - Clickable to open Modal */}
        <View style={styles.statsCard}>
          <TouchableOpacity style={styles.statItem} onPress={() => handleOpenStats('Followers')}>
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.statItem} onPress={() => handleOpenStats('Following')}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.statItem} >
            <Text style={styles.statNumber}>{postsCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        {editing ? (
          <View style={{ paddingHorizontal: 20 }}>
            {/* Edit Mode: Basic Info */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="person" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Basic Info</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.full_name}
                  onChangeText={(t) => setFormData({ ...formData, full_name: t })}
                  placeholderTextColor={colors.textSec}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.age}
                    onChangeText={(t) => setFormData({ ...formData, age: t })}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.gender}
                    onChangeText={(t) => setFormData({ ...formData, gender: t })}
                  />
                </View>
              </View>

            </View>

            {/* Edit Mode: Contact & Bio */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>About & Contact</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.bio}
                  onChangeText={(t) => setFormData({ ...formData, bio: t })}
                  multiline
                  placeholder="Tell us about yourself..."
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(t) => setFormData({ ...formData, phone: t })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Show Phone publicly</Text>
                <Switch
                  value={formData.show_phone}
                  onValueChange={(v) => setFormData({ ...formData, show_phone: v })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>
            </View>

            {/* Edit Mode: Socials */}
            <View style={styles.sectionContainer}>
               <View style={styles.sectionHeaderRow}>
                <Ionicons name="share-social" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Social Links</Text>
              </View>
              {['website', 'twitter', 'facebook', 'linkedin', 'instagram', 'github', 'youtube'].map((social) => (
                <View key={`edit-${social}`} style={styles.inputGroup}>
                   <Text style={[styles.inputLabel, { textTransform: 'capitalize' }]}>{social}</Text>
                   <TextInput
                    style={styles.input}
                    value={(formData as any)[social]}
                    onChangeText={(t) => setFormData({ ...formData, [social]: t })}
                    autoCapitalize="none"
                   />
                </View>
              ))}
            </View>

            {/* Edit Mode: Account Credentials */}
            <View style={styles.sectionContainer}>
               <View style={styles.sectionHeaderRow}>
                <Ionicons name="lock-closed" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Account Credentials</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.input}
                  value={formData.currentPassword || ''}
                  onChangeText={(t) => setFormData({ ...formData, currentPassword: t })}
                  secureTextEntry
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textSec}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={formData.newPassword || ''}
                  onChangeText={(t) => setFormData({ ...formData, newPassword: t })}
                  secureTextEntry
                  placeholder="Enter new password (optional)"
                  placeholderTextColor={colors.textSec}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  value={formData.confirmPassword || ''}
                  onChangeText={(t) => setFormData({ ...formData, confirmPassword: t })}
                  secureTextEntry
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSec}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.newEmail || ''}
                  onChangeText={(t) => setFormData({ ...formData, newEmail: t })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Enter new email (optional)"
                  placeholderTextColor={colors.textSec}
                />
              </View>
            </View>
          </View>
        ) : (
          <View>
            {/* View Mode: About */}
            {profile.bio ? (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
                  <Text style={styles.sectionTitle}>About</Text>
                </View>
                <Text style={{ fontSize: 15, lineHeight: 22, color: colors.text }}>
                  {profile.bio}
                </Text>
              </View>
            ) : null}

            {/* View Mode: Details */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                <Text style={styles.sectionTitle}>Details</Text>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSec} />
                  <Text style={styles.infoLabel}>Age</Text>
                </View>
                <Text style={styles.infoValue}>{profile.age || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                   <Ionicons name="male-female-outline" size={18} color={colors.textSec} />
                   <Text style={styles.infoLabel}>Gender</Text>
                </View>
                <Text style={styles.infoValue}>{profile.gender || 'N/A'}</Text>
              </View>
              
              {profile.show_phone && profile.phone ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="call-outline" size={18} color={colors.textSec} />
                    <Text style={styles.infoLabel}>Phone</Text>
                  </View>
                  <Text style={styles.infoValue}>{profile.phone}</Text>
                </View>
              ) : null}
            </View>

            {/* View Mode: Socials */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="globe-outline" size={22} color={colors.primary} />
                <Text style={styles.sectionTitle}>Connect</Text>
              </View>
              
              {[{ key: 'website', icon: 'link' },
                { key: 'github', icon: 'logo-github' },
                { key: 'twitter', icon: 'logo-twitter' },
                { key: 'linkedin', icon: 'logo-linkedin' },
                { key: 'instagram', icon: 'logo-instagram' },
                { key: 'facebook', icon: 'logo-facebook' },
                { key: 'youtube', icon: 'logo-youtube' },
                { key: 'tiktok', icon: 'logo-tiktok' },
              ].map((item) => {
                const val = (profile as any)[item.key];
                if (!val) return null;
                return (
                  <View key={`view-${item.key}`} style={styles.infoRow}>
                     <View style={styles.infoIconContainer}>
                       <Ionicons name={item.icon as any} size={18} color={colors.textSec} />
                       <Text style={[styles.infoLabel, { textTransform: 'capitalize' }]}>{item.key}</Text>
                     </View>
                     <Text style={[styles.infoValue, { color: colors.primary }]}>{val}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {editing ? (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEditing(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setEditing(true)}>
                 <Text style={styles.primaryBtnText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.danger, marginTop: 8 }]} onPress={handleSignOut}>
                <Text style={[styles.secondaryBtnText, { color: colors.danger }]}>Sign Out</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Renders the Bottom Sheet Slider */}
      {renderModal()}
    </SafeAreaView>
  );
};

export default ProfileScreen;