import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

interface User {
  id: string;
  full_name: string;
  profile_image_url?: string;
  badge?: string;
}

interface MentionOverlayProps {
  visible: boolean;
  searchText: string;
  onSelectUser: (user: User) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const MentionOverlay: React.FC<MentionOverlayProps> = ({
  visible,
  searchText,
  onSelectUser,
  onClose,
  position
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { isDark } = useTheme();

  const fetchUsers = useCallback(async () => {
    // Show users when @ is typed (empty query) or when query is 2+ chars
    if (searchText.length > 0 && searchText.length < 2) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, profile_image_url, badge')
        .or(`full_name.ilike.%${searchText}%,username.ilike.%${searchText}%`)
        .limit(10)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [searchText]);

  useEffect(() => {
    if (visible) {
      fetchUsers();
    }
  }, [visible, fetchUsers]);

  const handleUserSelect = (user: User) => {
    onSelectUser(user);
    onClose();
  };

  const renderUser = ({ item, index }: { item: User; index: number }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        selectedIndex === index && styles.selectedUserItem
      ]}
      onPress={() => handleUserSelect(item)}
    >
      <Image
        source={
          item.profile_image_url
            ? { uri: item.profile_image_url }
            : require('../../assets/adaptive-icon.png')
        }
        style={styles.avatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name}</Text>
        {item.badge && (
          <Text style={styles.userBadge}>{item.badge}</Text>
        )}
      </View>
      {selectedIndex === index && (
        <Ionicons name="checkmark" size={20} color="#3b82f6" />
      )}
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 12,
      width: '90%',
      maxHeight: 300,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#f9fafb' : '#111827',
      marginBottom: 12,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 4,
    },
    selectedUserItem: {
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '500',
      color: isDark ? '#f9fafb' : '#111827',
    },
    userBadge: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 2,
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    emptyContainer: {
      padding: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
  });

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.title}>Mention someone</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          <FlatList
            data={users}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
};

export default MentionOverlay;
