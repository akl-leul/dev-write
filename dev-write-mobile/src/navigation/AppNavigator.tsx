import React from 'react';
import { RootStackParamList, AuthorProfileRouteProp, AuthorProfileNavigationProp } from '../types/navigation';
import { useNavigation, useRoute } from '@react-navigation/native';

import { View, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import FeedScreen from '../screens/FeedScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthorProfileScreen from '../screens/AuthorProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

import AuthScreen from '../screens/AuthScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import WriterDashboard from '../screens/WriterDashboard';
import SettingsScreen from '../screens/SettingsScreen';

// Wrapper component for AuthorProfileScreen to handle navigation props
const AuthorProfileScreenWrapper = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  return <AuthorProfileScreen route={route} navigation={navigation} />;
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const SettingsStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right', // Smoother transition
      }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen 
        name="AuthorProfile" 
        component={AuthorProfileScreenWrapper}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  const { isDark } = useTheme();

  // Modern Color Palette
  const activeColor = isDark ? '#FFFFFF' : '#1A1A1A';
  const inactiveColor = isDark ? '#666666' : '#A1A1AA';
  const tabBarBg = isDark ? '#1C1C1E' : '#FFFFFF';

  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }) => ({
        headerShown: false,
        tabBarShowLabel: false, // Minimalist: Hide text labels
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 20,
          right: 20,
          backgroundColor: tabBarBg,
          borderRadius: 25, 
          height: 70,
          borderTopWidth: 0,
          ...styles.shadow, // Apply smooth shadow (includes elevation)
        },
        tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Feed':
              iconName = focused ? 'layers' : 'layers-outline';
              break;
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Create':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Writer Dashboard':
              iconName = focused ? 'folder-open' : 'folder-open-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          // Special styling for the 'Create' button to make it pop slightly
          const isCreate = route.name === 'Create';
          
          return (
            <View style={{ 
              alignItems: 'center', 
              justifyContent: 'center',
              top: Platform.OS === 'ios' ? 10 : 0 
            }}>
              <Ionicons 
                name={iconName} 
                size={isCreate ? 32 : 24} 
                color={color} 
              />
              {focused && !isCreate && (
                <View style={{
                  marginTop: 4,
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: color
                }} />
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Create" component={CreatePostScreen} />
      <Tab.Screen name="Writer Dashboard" component={WriterDashboard} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade', // Modern fade for auth
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    // Return a clean loading view (functionality unchanged)
    return <View style={styles.loadingContainer} />;
  }

  return user ? <MainTabs /> : <AuthStack />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
});

export default AppNavigator;