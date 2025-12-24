import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

interface User {
  id: string;
  full_name: string;
  profile_image_url?: string;
  badge?: string;
  username?: string;
}

interface MentionAutocompleteProps {
  query: string;
  onSelect: (user: User) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

const { width: screenWidth } = Dimensions.get('window');

const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  query,
  onSelect,
  onClose,
  position
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const { isDark } = useTheme();

  const fetchUsers = useCallback(async () => {
    if (query.length < 2 && query.length > 0) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, profile_image_url, badge, username')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(8)
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
  }, [query]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserSelect = (user: User) => {
    onSelect(user);
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
      <View style={styles.avatar}>
        {item.profile_image_url ? (
          <Image
            source={{ uri: item.profile_image_url }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {(item.full_name || item.username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.full_name || item.username || 'Unknown'}
        </Text>
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
    container: {
      position: 'absolute',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
      maxHeight: 200,
      width: Math.min(screenWidth * 0.8, 300),
      zIndex: 1000,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
    },
    selectedUserItem: {
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 12,
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: isDark ? '#4b5563' : '#d1d5db',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#f9fafb' : '#111827',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#f9fafb' : '#111827',
    },
    userBadge: {
      fontSize: 12,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginTop: 2,
    },
    loadingContainer: {
      padding: 16,
      alignItems: 'center',
    },
    emptyContainer: {
      padding: 16,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
  });

  if (users.length === 0 && !loading) return null;

  return (
    <View
      style={[
        styles.container,
        {
          top: position.top,
          left: position.left,
        },
      ]}
    >
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
  );
};

export default MentionAutocomplete;
