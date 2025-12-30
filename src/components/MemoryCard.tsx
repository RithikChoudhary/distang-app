import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Memory } from '../types';
import { typography, borderRadius, spacing, shadows } from '../utils/theme';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.md * 3) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

interface MemoryCardProps {
  memory: Memory;
  onPress: () => void;
  onDelete?: () => void;
  baseUrl: string;
  currentUserId?: string;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  onPress,
  onDelete,
  baseUrl,
  currentUserId,
}) => {
  const { colors, isDark } = useTheme();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const imageUrl = memory.imagePath.startsWith('http')
    ? memory.imagePath
    : `${baseUrl}${memory.imagePath}`;

  const isMyMemory = currentUserId === memory.uploadedBy.uniqueId;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleString('default', { month: 'short' }),
      year: date.getFullYear(),
    };
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const dateInfo = formatDate(memory.createdAt);

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.background }]} 
      onPress={onPress} 
      activeOpacity={0.9}
    >
      {/* Image */}
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        onLoadStart={() => setImageLoading(true)}
        onLoadEnd={() => setImageLoading(false)}
        onError={(e) => {
          console.error('Image load error:', e.nativeEvent.error);
          setImageError(true);
          setImageLoading(false);
        }}
      />

      {/* Loading Indicator */}
      {imageLoading && (
        <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundAlt }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Error State */}
      {imageError && !imageLoading && (
        <View style={[styles.errorContainer, { backgroundColor: colors.backgroundAlt }]}>
          <Ionicons name="image-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textMuted }]}>Failed to load</Text>
        </View>
      )}

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.gradient}
      />

      {/* Date Badge - Top Right */}
      <View style={styles.dateBadge}>
        <Text style={styles.dateBadgeDay}>{dateInfo.day}</Text>
        <Text style={styles.dateBadgeMonth}>{dateInfo.month}</Text>
      </View>
      
      {/* Uploader Badge - Top Left */}
      <View style={[
        styles.uploaderBadge,
        { backgroundColor: isMyMemory ? '#4CAF50' : '#FF5722' }
      ]}>
        <Ionicons 
          name={isMyMemory ? "person" : "heart"} 
          size={10} 
          color="white" 
        />
        <Text style={styles.uploaderText}>
          {isMyMemory ? 'You' : memory.uploadedBy.name.split(' ')[0]}
        </Text>
      </View>
      
      {/* Info Overlay - Bottom */}
      <View style={styles.overlay}>
        <View style={styles.info}>
          {memory.caption && (
            <Text style={styles.caption} numberOfLines={2}>
              {memory.caption}
            </Text>
          )}
          <Text style={styles.time}>{formatTime(memory.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  dateBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: borderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 36,
  },
  dateBadgeDay: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  dateBadgeMonth: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uploaderBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  uploaderText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
  },
  info: {
    flex: 1,
  },
  caption: {
    fontSize: typography.fontSize.sm,
    color: 'white',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  time: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
});

export default MemoryCard;
