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
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { typography, spacing, borderRadius } from '../utils/theme';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  OTPVerify: {
    email: string;
    name: string;
    username: string;
    phoneNumber?: string;
    type: 'signup' | 'login';
    devOtp?: string;
  };
  Onboarding: undefined;
  Home: undefined;
};

export const OTPVerifyScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'OTPVerify'>>();
  const { email, name, username, phoneNumber, type, devOtp } = route.params;
  const { setUser, setToken } = useAuthStore();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const inputAnimations = useRef(
    Array(6).fill(0).map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Icon bounce
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconBounce, {
          toValue: -8,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(iconBounce, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Staggered input animations
    Animated.stagger(80, 
      inputAnimations.map(anim => 
        Animated.spring(anim, { 
          toValue: 1, 
          tension: 60, 
          friction: 8, 
          useNativeDriver: true 
        })
      )
    ).start();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, '');
      setOtp(newOtp);

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      triggerShake();
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      let response;
      
      if (type === 'signup') {
        response = await authApi.signupVerify({
          name,
          username,
          email,
          phoneNumber,
          otp: otpString,
        });
      } else {
        response = await authApi.loginVerify({
          email,
          otp: otpString,
        });
      }

      console.log('🔐 Login response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('🔑 Token received:', response.data.token ? 'Yes' : 'No');
        setUser(response.data.user);
        await setToken(response.data.token);
        
        if (type === 'signup' || !response.data.user.isProfileComplete) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        }
      } else {
        triggerShake();
        Alert.alert('Error', response.message || 'Verification failed');
      }
    } catch (error: any) {
      triggerShake();
      const message = error.response?.data?.message || 'Verification failed';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      const response = await authApi.resendOTP(email, type);
      if (response.success) {
        setResendTimer(60);
        setCanResend(false);
        Alert.alert('Success', 'New code sent to your email');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to resend code';
      Alert.alert('Error', message);
    }
  };

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
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            { opacity: fadeIn }
          ]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Content */}
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeIn,
              transform: [{ translateY: slideUp }],
            }
          ]}
        >
          {/* Icon */}
          <Animated.View 
            style={[
              styles.iconContainer,
              { transform: [{ translateY: iconBounce }] }
            ]}
          >
            <View style={styles.iconGlow} />
            <LinearGradient
              colors={['#14B8A6', '#0D9488']}
              style={styles.iconGradient}
            >
              <Ionicons name="mail-open" size={40} color="white" />
            </LinearGradient>
          </Animated.View>

          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
          
          {/* Dev mode OTP display */}
          {devOtp && (
            <View style={styles.devOtpContainer}>
              <Ionicons name="construct" size={16} color="#FBBF24" />
              <Text style={styles.devOtpLabel}>DEV MODE</Text>
              <Text style={styles.devOtpCode}>{devOtp}</Text>
            </View>
          )}

          {/* OTP Input */}
          <Animated.View 
            style={[
              styles.otpContainer,
              { transform: [{ translateX: shake }] }
            ]}
          >
            {otp.map((digit, index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: inputAnimations[index],
                  transform: [{
                    scale: inputAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    })
                  }]
                }}
              >
                <TextInput
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[styles.otpInput, digit && styles.otpInputFilled]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              </Animated.View>
            ))}
          </Animated.View>

          {/* Resend */}
          <View style={styles.resendContainer}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <View style={styles.resendBtn}>
                  <Ionicons name="refresh" size={16} color="#14B8A6" />
                  <Text style={styles.resendText}>Resend Code</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.timerContainer}>
                <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.4)" />
                <Text style={styles.timerText}>
                  Resend in {resendTimer}s
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={loading ? ['#6B7280', '#6B7280'] : ['#14B8A6', '#0D9488']}
            style={styles.verifyBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                <Ionicons name="checkmark-circle" size={20} color="white" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
    bottom: 200,
    left: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(236, 72, 153, 0.06)',
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.xl,
    paddingBottom: spacing.xl,
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing['3xl'],
  },
  iconContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  emailHighlight: {
    color: '#14B8A6',
    fontWeight: '600',
  },

  devOtpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  devOtpLabel: {
    fontSize: typography.fontSize.xs,
    color: '#FBBF24',
    fontWeight: '700',
  },
  devOtpCode: {
    fontSize: typography.fontSize.lg,
    fontWeight: '800',
    color: '#FBBF24',
    letterSpacing: 4,
  },

  otpContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  otpInput: {
    width: (width - spacing.xl * 2 - spacing.sm * 5) / 6,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  otpInputFilled: {
    borderColor: '#14B8A6',
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
  },

  resendContainer: {
    alignItems: 'center',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: borderRadius.lg,
  },
  resendText: {
    fontSize: typography.fontSize.base,
    color: '#14B8A6',
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timerText: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.4)',
  },

  verifyBtn: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  verifyBtnDisabled: {
    shadowOpacity: 0,
  },
  verifyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  verifyBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: 'white',
  },
});

export default OTPVerifyScreen;
