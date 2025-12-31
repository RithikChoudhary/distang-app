import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { authApi, userApi, API_BASE_URL } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';

const { width, height } = Dimensions.get('window');
const PHOTO_SIZE = (width - spacing.xl * 2 - spacing.md * 2) / 3;

type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
};

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { refreshUser } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // Page 1: Profile Photo
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Page 2: 3 Photos
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null]);

  // Page 3: Favorites
  const [favFood, setFavFood] = useState('');
  const [favPlace, setFavPlace] = useState('');
  const [futurPlace, setFuturPlace] = useState('');

  const totalPages = 3;

  const animateProgress = (page: number) => {
    Animated.spring(progressAnim, {
      toValue: page / (totalPages - 1),
      useNativeDriver: false,
    }).start();
  };

  const goToPage = (page: number) => {
    if (page < 0 || page >= totalPages) return;
    setCurrentPage(page);
    animateProgress(page);
    scrollRef.current?.scrollTo({ x: page * width, animated: true });
  };

  const pickImage = async (type: 'profile' | 'photo', index?: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'profile') {
        setProfilePhoto(result.assets[0].uri);
      } else if (index !== undefined) {
        const newPhotos = [...photos];
        newPhotos[index] = result.assets[0].uri;
        setPhotos(newPhotos);
      }
    }
  };

  const takePhoto = async (type: 'profile' | 'photo', index?: number) => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'profile') {
        setProfilePhoto(result.assets[0].uri);
      } else if (index !== undefined) {
        const newPhotos = [...photos];
        newPhotos[index] = result.assets[0].uri;
        setPhotos(newPhotos);
      }
    }
  };

  const showImageOptions = (type: 'profile' | 'photo', index?: number) => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Camera', onPress: () => takePhoto(type, index) },
      { text: 'Gallery', onPress: () => pickImage(type, index) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Upload profile photo if selected (gracefully handle failure)
      let uploadedProfilePhoto = null;
      if (profilePhoto) {
        try {
          const response = await userApi.uploadProfilePhoto(profilePhoto);
          if (response.success) {
            uploadedProfilePhoto = response.data?.profilePhoto;
          }
        } catch (photoError) {
          console.warn('Profile photo upload failed, continuing without photo:', photoError);
          // Continue without photo - user can add it later
        }
      }

      // Complete profile with favorites
      await authApi.completeProfile({
        profilePhoto: uploadedProfilePhoto || undefined,
        photos: photos.filter(Boolean) as string[],
        favorites: {
          food: favFood.trim() || undefined,
          placeVisited: favPlace.trim() || undefined,
          placeToBe: futurPlace.trim() || undefined,
        },
      });

      await refreshUser();
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Complete profile error:', error);
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPage1 = () => (
    <View style={styles.page}>
      <View style={styles.pageContent}>
        <Text style={styles.pageTitle}>Profile Photo</Text>
        <Text style={styles.pageSubtitle}>
          Add a photo so your partner can recognize you 💕
        </Text>

        <TouchableOpacity
          style={styles.profilePhotoContainer}
          onPress={() => showImageOptions('profile')}
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Ionicons name="camera" size={40} color={colors.textMuted} />
              <Text style={styles.addPhotoText}>Tap to add</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={14} color="white" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.pageFooter}>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => goToPage(1)}
        >
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, !profilePhoto && styles.nextBtnDisabled]}
          onPress={() => goToPage(1)}
        >
          <Text style={styles.nextBtnText}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPage2 = () => (
    <View style={styles.page}>
      <View style={styles.pageContent}>
        <Text style={styles.pageTitle}>Your Gallery</Text>
        <Text style={styles.pageSubtitle}>
          Add 3 photos that represent you ✨
        </Text>

        <View style={styles.photosGrid}>
          {photos.map((photo, index) => (
            <TouchableOpacity
              key={index}
              style={styles.photoSlot}
              onPress={() => showImageOptions('photo', index)}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="add" size={32} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.photoNumber}>
                <Text style={styles.photoNumberText}>{index + 1}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.pageFooter}>
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => goToPage(2)}
        >
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => goToPage(2)}
        >
          <Text style={styles.nextBtnText}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPage3 = () => (
    <View style={styles.page}>
      <ScrollView 
        style={styles.pageScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Your Favorites</Text>
        <Text style={styles.pageSubtitle}>
          Let your partner know you better 💫
        </Text>

        <View style={styles.favoritesForm}>
          <View style={styles.favoriteItem}>
            <View style={styles.favoriteIcon}>
              <Text style={styles.favoriteEmoji}>🍕</Text>
            </View>
            <View style={styles.favoriteInput}>
              <Text style={styles.favoriteLabel}>Favorite Food</Text>
              <TextInput
                style={styles.favoriteTextInput}
                value={favFood}
                onChangeText={setFavFood}
                placeholder="Pizza, Sushi, Tacos..."
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.favoriteItem}>
            <View style={styles.favoriteIcon}>
              <Text style={styles.favoriteEmoji}>🌴</Text>
            </View>
            <View style={styles.favoriteInput}>
              <Text style={styles.favoriteLabel}>Best Place Visited</Text>
              <TextInput
                style={styles.favoriteTextInput}
                value={favPlace}
                onChangeText={setFavPlace}
                placeholder="Paris, Bali, Tokyo..."
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.favoriteItem}>
            <View style={styles.favoriteIcon}>
              <Text style={styles.favoriteEmoji}>✈️</Text>
            </View>
            <View style={styles.favoriteInput}>
              <Text style={styles.favoriteLabel}>Dream Destination</Text>
              <TextInput
                style={styles.favoriteTextInput}
                value={futurPlace}
                onChangeText={setFuturPlace}
                placeholder="Maldives, Iceland..."
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.pageFooter}>
        <TouchableOpacity
          style={[styles.completeBtn, loading && styles.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.completeBtnText}>Let's Go!</Text>
              <Ionicons name="heart" size={18} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.progressText}>{currentPage + 1} of {totalPages}</Text>
      </View>

      {/* Pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.pagesContainer}
      >
        {renderPage1()}
        {renderPage2()}
        {renderPage3()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },

  pagesContainer: {
    flex: 1,
  },
  page: {
    width,
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  pageContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageScrollContent: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  pageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },

  profilePhotoContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    position: 'relative',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  profilePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  editBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },

  photosGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoSlot: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.3,
    borderRadius: borderRadius.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.lg,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  photoNumber: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },

  favoritesForm: {
    gap: spacing.lg,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  favoriteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteEmoji: {
    fontSize: 24,
  },
  favoriteInput: {
    flex: 1,
  },
  favoriteLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  favoriteTextInput: {
    fontSize: typography.fontSize.base,
    color: colors.text,
    fontWeight: '500',
  },

  skipBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  skipBtnText: {
    fontSize: typography.fontSize.base,
    color: colors.textMuted,
    fontWeight: '600',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
  },
  nextBtnDisabled: {
    opacity: 0.6,
  },
  nextBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: 'white',
  },
  completeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  completeBtnDisabled: {
    opacity: 0.7,
  },
  completeBtnText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: 'white',
  },
});

export default OnboardingScreen;

