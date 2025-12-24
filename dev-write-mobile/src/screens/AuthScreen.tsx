import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Try to import picker, fallback to TouchableOpacity if not available
let Picker: any;
try {
  Picker = require('@react-native-picker/picker').default;
} catch (error) {
  console.warn('Picker not available, using fallback');
  Picker = null;
}

type GenderValue = '' | 'Male' | 'Female' | 'Other' | 'Prefer not to say';

const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<GenderValue>('');
  const [phone, setPhone] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGoogleForm, setShowGoogleForm] = useState(false);
  const [googleUserData, setGoogleUserData] = useState<any>(null);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const { signIn, signUp, signInWithGoogle, signUpWithGoogle } = useAuth();
  const { isDark } = useTheme();

  // Modern color palette
  const colors = {
    bg: isDark ? '#000000' : '#F9FAFB',
    cardBg: isDark ? '#1C1C1E' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#8E8E93' : '#6B7280',
    border: isDark ? '#2C2C2E' : '#E5E7EB',
    borderFocused: '#3B82F6',
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    inputBg: isDark ? '#1C1C1E' : '#FFFFFF',
    shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
  };

  const GenderPicker = ({ value, onChange }: { value: GenderValue; onChange: (value: GenderValue) => void }) => {
    if (Picker) {
      return (
        <View style={[styles.genderPicker, {
          backgroundColor: colors.inputBg,
          borderColor: colors.border,
        }]}>
          <Picker
            selectedValue={value || ''}
            onValueChange={(itemValue: GenderValue) => onChange(itemValue)}
            style={{
              color: colors.textPrimary,
              height: 50,
            }}
            dropdownIconColor={colors.textSecondary}
          >
            <Picker.Item label="Select Gender" value="" />
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Other" value="Other" />
            <Picker.Item label="Prefer not to say" value="Prefer not to say" />
          </Picker>
        </View>
      );
    }

    // Fallback to TouchableOpacity buttons
    const options: { label: string; value: GenderValue }[] = [
      { label: 'Male', value: 'Male' },
      { label: 'Female', value: 'Female' },
      { label: 'Other', value: 'Other' },
      { label: 'Prefer not to say', value: 'Prefer not to say' },
    ];

    return (
      <View style={styles.genderOptionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.genderOption,
              {
                backgroundColor: value === option.value ? colors.primary : colors.inputBg,
                borderColor: value === option.value ? colors.primary : colors.border,
              },
              value === option.value && styles.genderOptionSelected
            ]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.genderOptionText,
              {
                color: value === option.value ? '#FFFFFF' : colors.textPrimary,
              },
              value === option.value && styles.genderOptionTextSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getInputStyle = (inputName: string) => [
    styles.input,
    {
      backgroundColor: colors.inputBg,
      borderColor: focusedInput === inputName ? colors.borderFocused : colors.border,
      color: colors.textPrimary,
    },
    focusedInput === inputName && styles.inputFocused,
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: 24,
      padding: 24,
      marginHorizontal: 4,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    header: {
      marginBottom: 32,
      alignItems: 'center',
    },
    title: {
      fontSize: 36,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 16,
      textAlign: 'center',
      color: colors.textSecondary,
      lineHeight: 22,
    },
    inputContainer: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
      color: colors.textPrimary,
    },
    input: {
      borderWidth: 1.5,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
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
    inputFocused: {
      borderWidth: 2,
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
    button: {
      borderRadius: 12,
      padding: 18,
      alignItems: 'center',
      marginBottom: 12,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    buttonGradient: {
      width: '100%',
      padding: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    googleButton: {
      flexDirection: 'row',
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    googleButtonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      marginHorizontal: 16,
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    toggleButton: {
      alignItems: 'center',
      marginTop: 8,
      paddingVertical: 12,
    },
    toggleText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    errorText: {
      color: '#EF4444',
      marginBottom: 16,
      textAlign: 'center',
      fontSize: 14,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    checkboxLabel: {
      color: colors.textPrimary,
      fontSize: 15,
      marginLeft: 12,
      fontWeight: '500',
    },
    genderContainer: {
      marginBottom: 20,
    },
    genderLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 12,
      color: colors.textPrimary,
    },
    genderPicker: {
      borderWidth: 1.5,
      borderRadius: 12,
      marginBottom: 20,
      overflow: 'hidden',
    },
    genderOptionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    genderOption: {
      flex: 1,
      minWidth: '45%',
      padding: 14,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1.5,
    },
    genderOptionSelected: {
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    genderOptionText: {
      fontSize: 14,
      fontWeight: '600',
    },
    genderOptionTextSelected: {
      color: '#FFFFFF',
    },
    additionalFieldsContainer: {
      backgroundColor: colors.cardBg,
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    additionalFieldsTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 16,
      marginTop: 8,
      color: colors.textPrimary,
    },
  });

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !fullName)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp(email, password, fullName, age, gender, phone)
        : await signIn(email, password);

      if (error) {
        Alert.alert('Error', error.message);
      } else if (rememberMe && !isSignUp) {
        // Save credentials for remember me
        await SecureStore.setItemAsync('rememberedEmail', email);
        await SecureStore.setItemAsync('rememberedPassword', password);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert('Error', error.message);
        setLoading(false);
      }
      // Note: The OAuth flow will redirect and the auth state change listener will handle the rest
      // For new users, we'll need to detect if they have a profile and show the additional fields form
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!fullName || !age || !gender || !phone) {
      Alert.alert('Error', 'Please fill in all additional fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUpWithGoogle(googleUserData, fullName, age, gender, phone);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setShowGoogleForm(false);
        setGoogleUserData(null);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadRememberedCredentials = async () => {
    try {
      const rememberedEmail = await SecureStore.getItemAsync('rememberedEmail');
      const rememberedPassword = await SecureStore.getItemAsync('rememberedPassword');

      if (rememberedEmail && rememberedPassword) {
        setEmail(rememberedEmail);
        setPassword(rememberedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading remembered credentials:', error);
    }
  };

  React.useEffect(() => {
    if (!isSignUp) {
      loadRememberedCredentials();
    }
  }, [isSignUp]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {!showGoogleForm ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </Text>
                <Text style={styles.subtitle}>
                  {isSignUp
                    ? 'Join our community of writers and start your journey'
                    : 'Sign in to continue writing and sharing your stories'}
                </Text>
              </View>

              {isSignUp && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput
                      style={getInputStyle('fullName')}
                      placeholder="Enter your full name"
                      placeholderTextColor={colors.textSecondary}
                      value={fullName}
                      onChangeText={setFullName}
                      onFocus={() => setFocusedInput('fullName')}
                      onBlur={() => setFocusedInput(null)}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.additionalFieldsContainer}>
                    <Text style={styles.additionalFieldsTitle}>Additional Information</Text>
                    <Text style={[styles.subtitle, { marginBottom: 20, fontSize: 14 }]}>
                      Help us personalize your experience
                    </Text>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Age</Text>
                      <TextInput
                        style={getInputStyle('age')}
                        placeholder="Enter your age"
                        placeholderTextColor={colors.textSecondary}
                        value={age}
                        onChangeText={setAge}
                        onFocus={() => setFocusedInput('age')}
                        onBlur={() => setFocusedInput(null)}
                        keyboardType="numeric"
                        maxLength={3}
                      />
                    </View>

                    <View style={styles.genderContainer}>
                      <Text style={styles.genderLabel}>Gender</Text>
                      <GenderPicker value={gender} onChange={setGender} />
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Phone Number</Text>
                      <TextInput
                        style={getInputStyle('phone')}
                        placeholder="Enter your phone number"
                        placeholderTextColor={colors.textSecondary}
                        value={phone}
                        onChangeText={setPhone}
                        onFocus={() => setFocusedInput('phone')}
                        onBlur={() => setFocusedInput(null)}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={getInputStyle('email')}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={getInputStyle('password')}
                      placeholder="Create a password"
                      placeholderTextColor={colors.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <TextInput
                      style={getInputStyle('confirmPassword')}
                      placeholder="Confirm your password"
                      placeholderTextColor={colors.textSecondary}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocusedInput('confirmPassword')}
                      onBlur={() => setFocusedInput(null)}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>
                </>
              )}

              {!isSignUp && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={getInputStyle('email')}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textSecondary}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={getInputStyle('password')}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textSecondary}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.checkboxContainer}>
                    <Switch
                      value={rememberMe}
                      onValueChange={setRememberMe}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor={colors.border}
                    />
                    <Text style={styles.checkboxLabel}>Remember me</Text>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={styles.button}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setIsSignUp(!isSignUp)}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleText}>
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.additionalFieldsTitle}>Complete Your Profile</Text>
                <Text style={[styles.subtitle, { marginTop: 8 }]}>
                  Please provide additional information to complete your registration
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={getInputStyle('fullName')}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedInput('fullName')}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Age</Text>
                <TextInput
                  style={getInputStyle('age')}
                  placeholder="Enter your age"
                  placeholderTextColor={colors.textSecondary}
                  value={age}
                  onChangeText={setAge}
                  onFocus={() => setFocusedInput('age')}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>

              <View style={styles.genderContainer}>
                <Text style={styles.genderLabel}>Gender</Text>
                <GenderPicker value={gender} onChange={setGender} />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={getInputStyle('phone')}
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleGoogleSignUp}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Complete Registration</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => {
                  setShowGoogleForm(false);
                  setGoogleUserData(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.toggleText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;
