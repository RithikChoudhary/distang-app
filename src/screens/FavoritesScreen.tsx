import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { userApi } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store/authStore';
import { UserFavorites } from '../types';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

export const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { user, partner, refreshUser } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [favorites, setFavorites] = useState<UserFavorites>({
    food: '',
    placeVisited: '',
    placeToBe: '',
  });

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const response = await userApi.getFavorites();
      if (response.success && response.data) {
        setFavorites(response.data.favorites);
      }
    } catch (error) {
      // Use user's favorites if API fails
      if (user?.favorites) {
        setFavorites(user.favorites);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await userApi.updateFavorites(favorites);
      await refreshUser();
      Alert.alert('Success', 'Favorites updated!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save favorites');
    } finally {
      setIsSaving(false);
    }
  };

  const favoriteItems = [
    {
      key: 'food' as const,
      title: 'Favorite Food',
      emoji: '🍕',
      placeholder: 'e.g., Pizza, Sushi, Pasta...',
    },
    {
      key: 'placeVisited' as const,
      title: 'Favorite Place Visited',
      emoji: '✈️',
      placeholder: 'e.g., Paris, Tokyo, Bali...',
    },
    {
      key: 'placeToBe' as const,
      title: 'Dream Destination',
      emoji: '🌟',
      placeholder: 'e.g., Maldives, Switzerland...',
    },
  ];

  const styles = createStyles(colors, isDark);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <TouchableOpacity 
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>💕</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Share what you love!</Text>
              <Text style={styles.infoText}>
                Let your partner know about your favorite things
              </Text>
            </View>
          </View>

          {/* My Favorites */}
          <Text style={styles.sectionTitle}>Your Favorites</Text>
          <View style={styles.favoritesCard}>
            {favoriteItems.map((item, index) => (
              <View 
                key={item.key}
                style={[
                  styles.favoriteItem,
                  index < favoriteItems.length - 1 && styles.favoriteItemBorder,
                ]}
              >
                <View style={styles.favoriteHeader}>
                  <Text style={styles.favoriteEmoji}>{item.emoji}</Text>
                  <Text style={styles.favoriteTitle}>{item.title}</Text>
                </View>
                <TextInput
                  style={styles.favoriteInput}
                  value={favorites[item.key] || ''}
                  onChangeText={(text) => setFavorites({ ...favorites, [item.key]: text })}
                  placeholder={item.placeholder}
                  placeholderTextColor={colors.textMuted}
                  maxLength={100}
                />
              </View>
            ))}
          </View>

          {/* Partner's Favorites */}
          {partner?.favorites && (
            <>
              <Text style={styles.sectionTitle}>{partner.name}'s Favorites</Text>
              <View style={styles.favoritesCard}>
                {favoriteItems.map((item, index) => {
                  const value = partner.favorites?.[item.key];
                  if (!value) return null;
                  
                  return (
                    <View 
                      key={item.key}
                      style={[
                        styles.partnerFavoriteItem,
                        index < favoriteItems.length - 1 && styles.favoriteItemBorder,
                      ]}
                    >
                      <Text style={styles.favoriteEmoji}>{item.emoji}</Text>
                      <View style={styles.partnerFavoriteContent}>
                        <Text style={styles.partnerFavoriteLabel}>{item.title}</Text>
                        <Text style={styles.partnerFavoriteValue}>{value}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: typography.fontSize.sm,
  },

  content: {
    flex: 1,
    padding: spacing.md,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoEmoji: {
    fontSize: 36,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },

  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  favoritesCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  favoriteItem: {
    padding: spacing.md,
  },
  favoriteItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundAlt,
  },
  favoriteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  favoriteEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  favoriteTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  favoriteInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text,
  },

  partnerFavoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  partnerFavoriteContent: {
    flex: 1,
  },
  partnerFavoriteLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  partnerFavoriteValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.text,
  },
});

export default FavoritesScreen;

