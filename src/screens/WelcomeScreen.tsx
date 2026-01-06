import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing, borderRadius } from '../utils/theme';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Welcome: undefined;
  Signup: undefined;
  Login: undefined;
};

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const featuresY = useRef(new Animated.Value(40)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(50)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance animations
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Title
      Animated.parallel([
        Animated.spring(titleY, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Features
      Animated.parallel([
        Animated.spring(featuresY, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Buttons
      Animated.parallel([
        Animated.spring(buttonsY, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous pulse animation for logo glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animations for decorative elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(float1, {
          toValue: -15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float1, {
          toValue: 15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(float2, {
          toValue: 20,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float2, {
          toValue: -20,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slow rotation for background element
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Elegant Gradient Background - Deep teal to midnight */}
      <LinearGradient
        colors={['#0D1B2A', '#1B3A4B', '#065A60']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Animated Background Elements */}
      <Animated.View 
        style={[
          styles.bgCircle1, 
          { transform: [{ rotate: rotateInterpolate }] }
        ]} 
      />
      <Animated.View 
        style={[
          styles.bgCircle2, 
          { transform: [{ translateY: float1 }] }
        ]} 
      />
      <Animated.View 
        style={[
          styles.bgCircle3, 
          { transform: [{ translateY: float2 }] }
        ]} 
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View 
          style={[
            styles.logoSection,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.logoGlow,
              { transform: [{ scale: pulse }] }
            ]}
          />
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Brand Name & Tagline */}
        <Animated.View 
          style={[
            styles.brandSection,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleY }],
            }
          ]}
        >
          <Text style={styles.brandName}>Distang</Text>
          <Text style={styles.tagline}>Stay connected, stay close</Text>
        </Animated.View>

        {/* Features */}
        <Animated.View 
          style={[
            styles.featuresSection,
            {
              opacity: featuresOpacity,
              transform: [{ translateY: featuresY }],
            }
          ]}
        >
          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <Ionicons name="location" size={22} color="#60A5FA" />
              </View>
              <Text style={styles.featureLabel}>Live Location</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
                <Ionicons name="flame" size={22} color="#FB923C" />
              </View>
              <Text style={styles.featureLabel}>Daily Streaks</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                <Ionicons name="chatbubbles" size={22} color="#A78BFA" />
              </View>
              <Text style={styles.featureLabel}>Private Chat</Text>
            </View>
          </View>
          
          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
                <Ionicons name="heart" size={22} color="#F472B6" />
              </View>
              <Text style={styles.featureLabel}>Memories</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <Ionicons name="game-controller" size={22} color="#4ADE80" />
              </View>
              <Text style={styles.featureLabel}>Mini Games</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconWrap, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                <Ionicons name="mic" size={22} color="#FBBF24" />
              </View>
              <Text style={styles.featureLabel}>Walkie Talkie</Text>
            </View>
          </View>
        </Animated.View>

        {/* CTA Buttons */}
        <Animated.View 
          style={[
            styles.ctaSection,
            {
              opacity: buttonsOpacity,
              transform: [{ translateY: buttonsY }],
            }
          ]}
        >
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#14B8A6', '#0D9488']}
              style={styles.primaryBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.footerText}>End-to-end encrypted</Text>
        </View>
      </View>
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

  // Background decorations
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: 200,
    left: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  bgCircle3: {
    position: 'absolute',
    top: height * 0.4,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: height * 0.08,
    paddingBottom: spacing.lg,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  logoImage: {
    width: 80,
    height: 80,
  },

  // Brand
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  brandName: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: typography.fontSize.lg,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: spacing.xs,
    fontWeight: '500',
  },

  // Features
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureLabel: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textAlign: 'center',
  },

  // CTA
  ctaSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  primaryBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: 'white',
  },
  secondaryBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

export default WelcomeScreen;
