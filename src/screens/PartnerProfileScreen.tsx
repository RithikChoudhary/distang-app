import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { userApi, API_BASE_URL, getMediaUrl } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

interface RelationshipHistoryEntry {
  partnerName: string;
  partnerUniqueId: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  initiatedBreakup: boolean;
}

interface PartnerData {
  uniqueId: string;
  name: string;
  profilePhoto?: string;
  photos: string[];
  about: {
    bio?: string;
    hobbies: string[];
    occupation?: string;
    education?: string;
    location?: string;
    birthday?: string;
  };
  favorites: {
    food?: string;
    placeVisited?: string;
    placeToBe?: string;
  };
  gender?: string;
  memberSince: string;
}

export const PartnerProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerData | null>(null);
  const [relationshipHistory, setRelationshipHistory] = useState<RelationshipHistoryEntry[]>([]);
  const [currentRelationship, setCurrentRelationship] = useState<{
    startDate: string;
    daysTogether: number;
  } | null>(null);
  const [stats, setStats] = useState<{
    totalPastRelationships: number;
    totalDaysInRelationships: number;
  } | null>(null);

  useEffect(() => {
    loadPartnerProfile();
  }, []);

  const loadPartnerProfile = async () => {
    try {
      setLoading(true);
      const response = await userApi.getPartnerProfile();
      if (response.success && response.data) {
        setPartner(response.data.partner);
        setRelationshipHistory(response.data.relationshipHistory);
        setCurrentRelationship(response.data.currentRelationship);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Load partner profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatDuration = (days: number) => {
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return months > 0 ? `${years}y ${months}m` : `${years} year${years > 1 ? 's' : ''}`;
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Could not load partner profile</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadPartnerProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {partner.profilePhoto ? (
            <Image
              source={{ uri: getMediaUrl(partner.profilePhoto) }}
              style={styles.profilePhoto}
            />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Text style={styles.profileInitial}>{partner.name?.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{partner.name}</Text>
          <Text style={styles.profileId}>@{partner.uniqueId}</Text>
          
          {currentRelationship && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>
                🔥 {currentRelationship.daysTogether} days together
              </Text>
            </View>
          )}
        </View>

        {/* Stats Summary */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalPastRelationships}</Text>
              <Text style={styles.statLabel}>Past Relationships</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatDuration(stats.totalDaysInRelationships)}</Text>
              <Text style={styles.statLabel}>Total Time in Love</Text>
            </View>
          </View>
        )}

        {/* About Section */}
        {partner.about && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.card}>
              {partner.about.bio && (
                <View style={styles.aboutItem}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                  <Text style={styles.aboutText}>{partner.about.bio}</Text>
                </View>
              )}
              
              {partner.about.hobbies && partner.about.hobbies.length > 0 && (
                <View style={styles.aboutItem}>
                  <Ionicons name="heart-outline" size={18} color={colors.primary} />
                  <View style={styles.hobbiesContainer}>
                    {partner.about.hobbies.map((hobby, index) => (
                      <View key={index} style={styles.hobbyTag}>
                        <Text style={styles.hobbyText}>{hobby}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {partner.about.occupation && (
                <View style={styles.aboutItem}>
                  <Ionicons name="briefcase-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.aboutLabel}>{partner.about.occupation}</Text>
                </View>
              )}
              
              {partner.about.education && (
                <View style={styles.aboutItem}>
                  <Ionicons name="school-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.aboutLabel}>{partner.about.education}</Text>
                </View>
              )}
              
              {partner.about.location && (
                <View style={styles.aboutItem}>
                  <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.aboutLabel}>{partner.about.location}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Favorites Section */}
        {partner.favorites && (partner.favorites.food || partner.favorites.placeVisited || partner.favorites.placeToBe) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorites</Text>
            <View style={styles.card}>
              {partner.favorites.food && (
                <View style={styles.favoriteItem}>
                  <Text style={styles.favoriteEmoji}>🍕</Text>
                  <View>
                    <Text style={styles.favoriteLabel}>Favorite Food</Text>
                    <Text style={styles.favoriteValue}>{partner.favorites.food}</Text>
                  </View>
                </View>
              )}
              {partner.favorites.placeVisited && (
                <View style={styles.favoriteItem}>
                  <Text style={styles.favoriteEmoji}>✈️</Text>
                  <View>
                    <Text style={styles.favoriteLabel}>Favorite Place Visited</Text>
                    <Text style={styles.favoriteValue}>{partner.favorites.placeVisited}</Text>
                  </View>
                </View>
              )}
              {partner.favorites.placeToBe && (
                <View style={styles.favoriteItem}>
                  <Text style={styles.favoriteEmoji}>🌍</Text>
                  <View>
                    <Text style={styles.favoriteLabel}>Dream Destination</Text>
                    <Text style={styles.favoriteValue}>{partner.favorites.placeToBe}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Relationship History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relationship History</Text>
          
          {relationshipHistory.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.emptyHistory}>
                <Ionicons name="heart" size={32} color={colors.primary} />
                <Text style={styles.emptyHistoryText}>
                  No past relationships
                </Text>
                <Text style={styles.emptyHistorySubtext}>
                  You're their first! 💕
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.historyList}>
              {relationshipHistory.map((entry, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyAvatar}>
                      <Text style={styles.historyInitial}>
                        {entry.partnerName.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyName}>{entry.partnerName}</Text>
                      <Text style={styles.historyDates}>
                        {formatDate(entry.startDate)} - {formatDate(entry.endDate)}
                      </Text>
                    </View>
                    <View style={styles.historyDuration}>
                      <Text style={styles.historyDays}>{formatDuration(entry.durationDays)}</Text>
                    </View>
                  </View>
                  <View style={styles.historyFooter}>
                    <Text style={styles.historyNote}>
                      {entry.initiatedBreakup 
                        ? '💔 Ended the relationship' 
                        : '💔 Was ended by partner'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Member Since */}
        <View style={styles.memberSince}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.memberSinceText}>
            Member since {formatDate(partner.memberSince)}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    padding: spacing.lg,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
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
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },

  content: {
    flex: 1,
    padding: spacing.md,
  },

  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: colors.primary,
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.primary,
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.primary,
  },
  profileName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
  },
  profileId: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  currentBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  currentBadgeText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: colors.primary,
  },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },

  section: {
    marginBottom: spacing.lg,
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

  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },

  aboutItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  aboutText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text,
    lineHeight: 22,
  },
  aboutLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text,
  },
  hobbiesContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hobbyTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  hobbyText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },

  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  favoriteEmoji: {
    fontSize: 24,
  },
  favoriteLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  favoriteValue: {
    fontSize: typography.fontSize.base,
    color: colors.text,
    fontWeight: '500',
  },

  emptyHistory: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyHistoryText: {
    fontSize: typography.fontSize.base,
    color: colors.text,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  emptyHistorySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },

  historyList: {
    gap: spacing.sm,
  },
  historyCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInitial: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.textMuted,
  },
  historyInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  historyName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  historyDates: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyDuration: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  historyDays: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  historyFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyNote: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },

  memberSince: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  memberSinceText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
});

export default PartnerProfileScreen;

