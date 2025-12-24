import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  Dimensions,
  Appearance,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

type ThemeMode = 'system' | 'light' | 'dark';
type FontSizeOption = 'small' | 'medium' | 'large';

// Fallback storage if AsyncStorage is not installed
let asyncStore: any = null;
const inMemoryStore = new Map<string, string>();
const getStorage = () => {
  if (asyncStore) return asyncStore;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage');
    asyncStore = mod.default ?? mod;
  } catch {
    asyncStore = {
      getItem: (key: string) => Promise.resolve(inMemoryStore.has(key) ? (inMemoryStore.get(key) as string) : null),
      setItem: (key: string, value: string) => {
        inMemoryStore.set(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        inMemoryStore.delete(key);
        return Promise.resolve();
      },
    };
  }
  return asyncStore;
};

const storageGet = (key: string) => {
  const store = getStorage();
  return store.getItem(key);
};

const storageSet = (key: string, value: string) => {
  const store = getStorage();
  return store.setItem(key, value);
};

const STORAGE_KEYS = {
  themeMode: 'settings.themeMode',
  fontSize: 'settings.fontSize',
  notifications: 'settings.notifications',
};

const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [fontSize, setFontSize] = useState<FontSizeOption>('medium');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const [deviceColorScheme, setDeviceColorScheme] = useState<'light' | 'dark'>('light');
  const [storageInfo, setStorageInfo] = useState<{ cache: number; documents: number }>({ cache: 0, documents: 0 });
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Palette
  const palette = useMemo(
    () => ({
      // Pulled from FeedScreen for consistency
      bg: isDark ? '#111827' : '#FFFFFF',
      card: isDark ? '#1F2937' : '#FFFFFF',
      border: isDark ? '#374151' : '#F3F4F6',
      text: isDark ? '#F9FAFB' : '#111827',
      textMuted: isDark ? '#9CA3AF' : '#6B7280',
      primary: '#3B82F6',
      accent: '#F59E0B',
      success: '#10B981',
      danger: '#EF4444',
      overlay: 'rgba(0,0,0,0.35)',
      pastel: isDark ? '#1C1F26' : '#F9FAFB',
    }),
    [isDark]
  );

  // Derived font size
  const fontSizes = useMemo(
    () => ({
      small: 14,
      medium: 16,
      large: 18,
    }),
    []
  );

  const applyFontSizeGlobal = (size: FontSizeOption) => {
    const base = fontSizes[size];
    // Apply global default text size (best-effort immediate effect)
    const TextAny = Text as any;
    if (TextAny.defaultProps == null) TextAny.defaultProps = {};
    TextAny.defaultProps.allowFontScaling = false;
    TextAny.defaultProps.style = [{ fontSize: base }];
  };

  // Load persisted settings
  useEffect(() => {
    const load = async () => {
      try {
        const [storedTheme, storedFont, storedNotif] = await Promise.all([
          storageGet(STORAGE_KEYS.themeMode),
          storageGet(STORAGE_KEYS.fontSize),
          storageGet(STORAGE_KEYS.notifications),
        ]);
        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
          setThemeMode(storedTheme);
        }
        if (storedFont === 'small' || storedFont === 'medium' || storedFont === 'large') {
          setFontSize(storedFont);
          applyFontSizeGlobal(storedFont);
        }
        if (storedNotif === 'true' || storedNotif === 'false') {
          setNotificationsEnabled(storedNotif === 'true');
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    };
    load();
  }, []);

  // Apply theme from system changes
  useEffect(() => {
    const initialScheme = Appearance.getColorScheme() || 'light';
    setDeviceColorScheme(initialScheme);
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const scheme = colorScheme || 'light';
      setDeviceColorScheme(scheme);
      if (themeMode === 'system') {
        const shouldBeDark = scheme === 'dark';
        if (shouldBeDark !== isDark) {
          toggleTheme();
        }
      }
    });
    return () => subscription.remove();
  }, [themeMode, isDark, toggleTheme]);

  // Apply theme when mode changes
  useEffect(() => {
    const persist = async () => {
      await storageSet(STORAGE_KEYS.themeMode, themeMode);
    };
    persist();

    if (themeMode === 'system') {
      const shouldBeDark = deviceColorScheme === 'dark';
      if (shouldBeDark !== isDark) toggleTheme();
    } else if (themeMode === 'light' && isDark) {
      toggleTheme();
    } else if (themeMode === 'dark' && !isDark) {
      toggleTheme();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeMode]);

  // Apply font size globally when changed
  useEffect(() => {
    applyFontSizeGlobal(fontSize);
    storageSet(STORAGE_KEYS.fontSize, fontSize).catch(() => { });
  }, [fontSize]);

  // Notifications persistence (permission request can be added if expo-notifications is installed)
  useEffect(() => {
    const syncNotif = async () => {
      await storageSet(STORAGE_KEYS.notifications, String(notificationsEnabled));
      // If you add expo-notifications, request permissions here.
    };
    syncNotif();
  }, [notificationsEnabled]);

  const measureStorage = async () => {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory || '');
      const docInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory || '');
      const cacheSize = cacheInfo.exists ? cacheInfo.size || 0 : 0;
      const docSize = docInfo.exists ? docInfo.size || 0 : 0;
      setStorageInfo({ cache: cacheSize, documents: docSize });
    } catch (err) {
      console.error('Storage measure failed', err);
    }
  };

  useEffect(() => {
    measureStorage();
  }, []);

  const clearCache = async () => {
    try {
      console.log('Clearing cache, directory:', FileSystem.cacheDirectory);
      if (FileSystem.cacheDirectory) {
        const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
        await Promise.all(
          files.map((file) =>
            FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true })
          )
        );
      }
      await measureStorage();
      Alert.alert('Success', 'Cache cleared.');
    } catch (err: any) {
      console.error('Clear cache error:', err);
      Alert.alert('Error', `Failed to clear cache: ${err?.message || 'Unknown error'}`);
    } finally {
      setBusyAction(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleManageStorage = async () => {
    await measureStorage();
    Alert.alert(
      'Storage Usage',
      `Documents: ${formatBytes(storageInfo.documents)}\nCache: ${formatBytes(storageInfo.cache)}`
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const card = (children: React.ReactNode) => (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>{children}</View>
  );

  const settingRow = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    desc?: string,
    right?: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.settingRow, { borderColor: palette.border }]}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={20} color={palette.textMuted} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingTitle, { color: palette.text }]}>{title}</Text>
          {desc ? <Text style={[styles.settingDesc, { color: palette.textMuted }]}>{desc}</Text> : null}
        </View>
      </View>
      {right}
    </TouchableOpacity>
  );

  const selectorPill = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? palette.accent : palette.pastel,
          borderColor: active ? palette.accent : 'transparent',
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : palette.text, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.bg }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: palette.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>Tune your experience</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: palette.pastel, borderColor: palette.border }]}>
          <Text style={{ color: palette.text, fontWeight: '700' }}>Chronicle</Text>
        </View>
      </View>

      {/* Appearance */}
      {card(
        <>
          <Text style={[styles.sectionHeader, { color: palette.text }]}>Appearance</Text>
          {settingRow(
            'moon-outline',
            'Theme',
            `Current: ${themeMode === 'system' ? `System (${deviceColorScheme})` : themeMode}`,
            <View style={styles.inlineRow}>
              {selectorPill('System', themeMode === 'system', () => setThemeMode('system'))}
              {selectorPill('Light', themeMode === 'light', () => setThemeMode('light'))}
              {selectorPill('Dark', themeMode === 'dark', () => setThemeMode('dark'))}
            </View>
          )}

          {settingRow(
            'text-outline',
            'Font size',
            `Current: ${fontSize}`,
            <View style={styles.inlineRow}>
              {selectorPill('S', fontSize === 'small', () => setFontSize('small'))}
              {selectorPill('M', fontSize === 'medium', () => setFontSize('medium'))}
              {selectorPill('L', fontSize === 'large', () => setFontSize('large'))}
            </View>
          )}
        </>
      )}

      {/* Notifications */}
      {card(
        <>
          <Text style={[styles.sectionHeader, { color: palette.text }]}>Notifications</Text>
          {settingRow(
            'notifications-outline',
            'Push notifications',
            'Show alerts in status bar and device tray',
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={notificationsEnabled ? '#fff' : '#f8fafc'}
            />
          )}
        </>
      )}

      {/* Storage */}
      {card(
        <>
          <Text style={[styles.sectionHeader, { color: palette.text }]}>Storage</Text>
          {settingRow(
            'trash-outline',
            'Clear cache',
            'Remove temporary files',
            busyAction === 'cache' ? (
              <ActivityIndicator color={palette.primary} />
            ) : (
              <Ionicons name="chevron-forward-outline" size={18} color={palette.textMuted} />
            ),
            clearCache
          )}
          {settingRow(
            'folder-outline',
            'Manage storage',
            `Docs: ${formatBytes(storageInfo.documents)} • Cache: ${formatBytes(storageInfo.cache)}`,
            <Ionicons name="chevron-forward-outline" size={18} color={palette.textMuted} />,
            handleManageStorage
          )}
        </>
      )}

      {/* Account */}
      {card(
        <>
          <Text style={[styles.sectionHeader, { color: palette.text }]}>Account</Text>
          {settingRow(
            'person-outline',
            'Profile',
            'Edit your profile',
            <Ionicons name="chevron-forward-outline" size={18} color={palette.textMuted} />,
            () => navigation.navigate('Profile')
          )}
          {settingRow(
            'log-out-outline',
            'Sign out',
            undefined,
            <Ionicons name="chevron-forward-outline" size={18} color={palette.textMuted} />,
            handleSignOut
          )}
        </>
      )}

      {/* Support */}
      {card(
        <>
          <Text style={[styles.sectionHeader, { color: palette.text }]}>Support & About</Text>
          {settingRow(
            'mail-outline',
            'Contact support',
            'chronicle.ethiopia@gmail.com',
            <Ionicons name="open-outline" size={18} color={palette.textMuted} />,
            () => Linking.openURL('mailto:chronicle.ethiopia@gmail.com')
          )}
          {settingRow(
            'shield-outline',
            'Privacy Policy',
            undefined,
            <Ionicons name="open-outline" size={18} color={palette.textMuted} />,
            () => Linking.openURL('https://dev-write.netlify.app/privacy')
          )}
          {settingRow(
            'document-outline',
            'Terms of Service',
            undefined,
            <Ionicons name="open-outline" size={18} color={palette.textMuted} />,
            () => Linking.openURL('https://dev-write.netlify.app/terms')
          )}
          {settingRow(
            'information-circle-outline',
            'About',
            'Chronicle Mobile v1.0.0',
            <Ionicons name="open-outline" size={18} color={palette.textMuted} />,
            () =>
              Alert.alert(
                'About',
                'Chronicle Mobile App\nVersion 1.0.0\n\nThe ultimate blogging platform for developers.\n\nShare knowledge, connect with peers, and stay updated with the latest tech trends.\n\nFeatures:\n• Read & write technical articles\n• Markdown support\n• Community engagement\n\nDeveloped by Leul Ayfokru'
              )
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 70,
    paddingTop: 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
});

export default SettingsScreen;
