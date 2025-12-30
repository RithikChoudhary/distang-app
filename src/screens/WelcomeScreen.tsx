import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Welcome: undefined;
  Signup: undefined;
  Login: undefined;
};

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#FF6B8A', '#FF8E9E', '#FFB4C0']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo / Brand */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>Codex</Text>
          <Text style={styles.tagline}>Your love, your privacy</Text>
        </View>

        {/* Hero Image */}
        <View style={styles.heroSection}>
          <View style={styles.heartContainer}>
            <Text style={styles.heartEmoji}>💕</Text>
          </View>
          <View style={styles.floatingHeart1}>
            <Text style={styles.floatingEmoji}>❤️</Text>
          </View>
          <View style={styles.floatingHeart2}>
            <Text style={styles.floatingEmoji}>💜</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📍</Text>
            <Text style={styles.featureText}>Live Location</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔥</Text>
            <Text style={styles.featureText}>Daily Streaks</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💬</Text>
            <Text style={styles.featureText}>Private Chat</Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.secondaryBtnText}>I have an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B8A',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: height * 0.1,
    paddingBottom: spacing.xl,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '900',
    color: 'white',
    fontFamily: 'System',
    letterSpacing: -2,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: typography.fontSize.lg,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.xs,
    fontWeight: '500',
  },

  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heartContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartEmoji: {
    fontSize: 80,
  },
  floatingHeart1: {
    position: 'absolute',
    top: 40,
    right: 60,
  },
  floatingHeart2: {
    position: 'absolute',
    bottom: 60,
    left: 50,
  },
  floatingEmoji: {
    fontSize: 40,
    opacity: 0.8,
  },

  featuresSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing['2xl'],
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  featureText: {
    color: 'white',
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },

  ctaSection: {
    gap: spacing.md,
  },
  primaryBtn: {
    backgroundColor: 'white',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: '#FF6B8A',
  },
  secondaryBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: 'white',
  },
});

export default WelcomeScreen;

