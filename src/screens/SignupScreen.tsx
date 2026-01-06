import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '../services/api';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Welcome: undefined;
  Signup: undefined;
  OTPVerify: { 
    email: string; 
    name: string; 
    username: string; 
    phoneNumber?: string;
    type: 'signup' | 'login';
    devOtp?: string;
  };
};

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const inputAnim1 = useRef(new Animated.Value(0)).current;
  const inputAnim2 = useRef(new Animated.Value(0)).current;
  const inputAnim3 = useRef(new Animated.Value(0)).current;
  const inputAnim4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered input animations
    const delay = 150;
    Animated.stagger(delay, [
      Animated.spring(inputAnim1, { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
      Animated.spring(inputAnim2, { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
      Animated.spring(inputAnim3, { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
      Animated.spring(inputAnim4, { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!/^[a-z0-9_]{3,30}$/.test(username.toLowerCase())) {
      newErrors.username = '3-30 chars, letters, numbers, underscores only';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await authApi.signupInit({
        name: name.trim(),
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });

      if (response.success) {
        navigation.navigate('OTPVerify', {
          email: email.toLowerCase().trim(),
          name: name.trim(),
          username: username.toLowerCase().trim(),
          phoneNumber: phoneNumber.trim() || undefined,
          type: 'signup',
          devOtp: response.data?.devOtp,
        });
      } else {
        Alert.alert('Error', response.message || 'Something went wrong');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (field: string, hasError: boolean) => [
    styles.inputWrapper,
    focusedField === field && styles.inputFocused,
    hasError && styles.inputError,
  ];

  const inputAnimations = [inputAnim1, inputAnim2, inputAnim3, inputAnim4];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background */}
      <LinearGradient
        colors={['#0D1B2A', '#1B3A4B', '#065A60']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Elements */}
      <View style={styles.bgDecor1} />
      <View style={styles.bgDecor2} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeIn,
                transform: [{ translateY: slideUp }],
              }
            ]}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join Distang and connect with your partner</Text>
            </View>
          </Animated.View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <Animated.View 
              style={[
                styles.inputGroup,
                {
                  opacity: inputAnim1,
                  transform: [{ 
                    translateX: inputAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    })
                  }],
                }
              ]}
            >
              <Text style={styles.label}>Full Name</Text>
              <View style={getInputStyle('name', !!errors.name)}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="person" size={18} color="#60A5FA" />
                </View>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => usernameRef.current?.focus()}
                />
              </View>
              {errors.name && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#F87171" />
                  <Text style={styles.errorText}>{errors.name}</Text>
                </View>
              )}
            </Animated.View>

            {/* Username */}
            <Animated.View 
              style={[
                styles.inputGroup,
                {
                  opacity: inputAnim2,
                  transform: [{ 
                    translateX: inputAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    })
                  }],
                }
              ]}
            >
              <Text style={styles.label}>Username</Text>
              <View style={getInputStyle('username', !!errors.username)}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                  <Text style={styles.atSymbol}>@</Text>
                </View>
                <TextInput
                  ref={usernameRef}
                  style={styles.input}
                  value={username}
                  onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="choose_username"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
              {errors.username && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#F87171" />
                  <Text style={styles.errorText}>{errors.username}</Text>
                </View>
              )}
            </Animated.View>

            {/* Email */}
            <Animated.View 
              style={[
                styles.inputGroup,
                {
                  opacity: inputAnim3,
                  transform: [{ 
                    translateX: inputAnim3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    })
                  }],
                }
              ]}
            >
              <Text style={styles.label}>Email</Text>
              <View style={getInputStyle('email', !!errors.email)}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(20, 184, 166, 0.15)' }]}>
                  <Ionicons name="mail" size={18} color="#2DD4BF" />
                </View>
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
              </View>
              {errors.email && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#F87171" />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </Animated.View>

            {/* Phone (Optional) */}
            <Animated.View 
              style={[
                styles.inputGroup,
                {
                  opacity: inputAnim4,
                  transform: [{ 
                    translateX: inputAnim4.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    })
                  }],
                }
              ]}
            >
              <Text style={styles.label}>
                Phone Number <Text style={styles.optional}>(optional)</Text>
              </Text>
              <View style={getInputStyle('phone', false)}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Ionicons name="call" size={18} color="#FBBF24" />
                </View>
                <TextInput
                  ref={phoneRef}
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </Animated.View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={loading ? ['#6B7280', '#6B7280'] : ['#14B8A6', '#0D9488']}
              style={styles.submitBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          {/* Login Link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login' as any)}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bgDecor1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
  },
  bgDecor2: {
    position: 'absolute',
    bottom: 100,
    left: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.xl,
    paddingBottom: spacing['2xl'],
  },

  header: {
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  form: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  optional: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '400',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.lg,
    paddingRight: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputFocused: {
    borderColor: '#14B8A6',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
  },
  inputError: {
    borderColor: '#F87171',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  iconWrap: {
    width: 44,
    height: 52,
    borderTopLeftRadius: borderRadius.lg - 2,
    borderBottomLeftRadius: borderRadius.lg - 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  atSymbol: {
    fontSize: 18,
    color: '#A78BFA',
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: '#FFFFFF',
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    color: '#F87171',
  },

  submitBtn: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  submitBtnDisabled: {
    shadowOpacity: 0,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  submitBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: 'white',
  },

  terms: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  termsLink: {
    color: '#14B8A6',
  },

  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  loginLink: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: '#14B8A6',
  },
});

export default SignupScreen;
