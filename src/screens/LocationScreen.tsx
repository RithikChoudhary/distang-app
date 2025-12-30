import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { locationApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';
import { MapWebView } from '../components/MapWebView';

const { height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.45;

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyA3iVJO8OLXFHf1gS7N8UYUX_z2Xf7asOY';

export const LocationScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { user, partner, consentStatus, refreshConsent } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [myLocationStatus, setMyLocationStatus] = useState<{
    isSharing: boolean;
    latitude?: number;
    longitude?: number;
    sharedAt?: Date;
  } | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    sharedAt: Date;
  } | null>(null);

  const styles = createStyles(colors, isDark);

  useEffect(() => {
    refreshConsent();
    loadLocationStatus();
    
    const interval = setInterval(() => {
      loadLocationStatus();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const canShare = consentStatus?.featureStatus?.locationSharing?.active;

  const loadLocationStatus = async () => {
    try {
      const myStatus = await locationApi.getMyStatus();
      if (myStatus.success && myStatus.data) {
        setMyLocationStatus({
          isSharing: myStatus.data.isSharing,
          latitude: myStatus.data.location?.latitude,
          longitude: myStatus.data.location?.longitude,
          sharedAt: myStatus.data.location?.sharedAt 
            ? new Date(myStatus.data.location.sharedAt) 
            : undefined,
        });
      }
      
      const partnerStatus = await locationApi.getPartnerLocation();
      if (partnerStatus.success && partnerStatus.data) {
        setPartnerLocation({
          ...partnerStatus.data.location,
          sharedAt: new Date(partnerStatus.data.location.sharedAt),
        });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setPartnerLocation(null);
      }
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadLocationStatus();
    setIsRefreshing(false);
  };

  const handleShareLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow location access.');
        return;
      }

      setIsLoading(true);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await locationApi.share({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        timestamp: new Date().toISOString(),
      });

      Alert.alert('✓', 'Location sharing started!');
      loadLocationStatus();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to share location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSharing = async () => {
    Alert.alert('Stop Sharing?', `${partner?.name} won't see your location anymore.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            await locationApi.stopSharing();
            Alert.alert('✓', 'Location sharing stopped');
            setMyLocationStatus({ isSharing: false });
          } catch (error: any) {
            Alert.alert('Error', 'Failed to stop sharing');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const openInMaps = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  // Prepare map markers
  const mapMarkers = [];
  if (myLocationStatus?.isSharing && myLocationStatus.latitude && myLocationStatus.longitude) {
    mapMarkers.push({
      latitude: myLocationStatus.latitude,
      longitude: myLocationStatus.longitude,
      label: 'You',
      isMe: true,
    });
  }
  if (partnerLocation) {
    mapMarkers.push({
      latitude: partnerLocation.latitude,
      longitude: partnerLocation.longitude,
      label: partner?.name || 'Partner',
      isMe: false,
    });
  }

  if (!user?.coupleId || !partner) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>💔</Text>
          <Text style={styles.emptyTitle}>Not Connected</Text>
          <Text style={styles.emptySubtitle}>Connect with your partner first</Text>
        </View>
      </View>
    );
  }

  if (!canShare) {
    return (
      <View style={styles.container}>
        {/* Show map even when disabled */}
        <View style={styles.mapSection}>
          <MapWebView
            markers={[]}
            height={MAP_HEIGHT}
            apiKey={GOOGLE_MAPS_API_KEY}
            zoom={10}
            isDark={isDark}
          />
          <View style={styles.disabledOverlay}>
            <View style={styles.disabledCard}>
              <Ionicons name="lock-closed" size={32} color={colors.textMuted} />
              <Text style={styles.disabledTitle}>Location Sharing Disabled</Text>
              <Text style={styles.disabledText}>Enable in Privacy settings</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map Section */}
      <View style={styles.mapSection}>
        <MapWebView
          markers={mapMarkers}
          height={MAP_HEIGHT}
          apiKey={GOOGLE_MAPS_API_KEY}
          zoom={mapMarkers.length > 0 ? 14 : 10}
          isDark={isDark}
        />

        {/* Privacy Badge */}
        <View style={styles.privacyBadge}>
          <Ionicons name="shield-checkmark" size={14} color={colors.success} />
          <Text style={styles.privacyText}>Private & Secure</Text>
        </View>
      </View>

      {/* Cards Section */}
      <ScrollView
        style={styles.cardsSection}
        contentContainerStyle={styles.cardsContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Your Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Your Location</Text>
            {myLocationStatus?.isSharing && (
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Sharing</Text>
              </View>
            )}
          </View>

          {myLocationStatus?.isSharing ? (
            <>
              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color={colors.textMuted} />
                  <Text style={styles.detailText}>
                    Started {myLocationStatus.sharedAt ? formatTime(myLocationStatus.sharedAt) : ''}
                  </Text>
                </View>
                {myLocationStatus.latitude && (
                  <TouchableOpacity
                    style={styles.detailRow}
                    onPress={() => openInMaps(myLocationStatus.latitude!, myLocationStatus.longitude!)}
                  >
                    <Ionicons name="navigate" size={16} color={colors.location} />
                    <Text style={styles.detailLink}>Open in Google Maps</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.stopBtn}
                onPress={handleStopSharing}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <>
                    <Ionicons name="pause" size={18} color={colors.error} />
                    <Text style={styles.stopBtnText}>Stop Sharing</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareLocation}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color={colors.textInverse} />
                  <Text style={styles.shareBtnText}>Start Sharing Location</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Partner's Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="heart" size={20} color={colors.error} />
            </View>
            <Text style={styles.cardTitle}>{partner.name}'s Location</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadLocationStatus}>
              <Ionicons name="refresh" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {partnerLocation ? (
            <View style={styles.locationAvailable}>
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <Ionicons name="location" size={24} color={colors.location} />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationTitle}>Location Available</Text>
                  <Text style={styles.locationTime}>
                    Updated {formatTime(partnerLocation.sharedAt)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.openMapBtn}
                onPress={() => openInMaps(partnerLocation.latitude, partnerLocation.longitude)}
              >
                <View>
                  <Text style={styles.openMapTitle}>Open in Google Maps</Text>
                  <Text style={styles.openMapCoords}>
                    {partnerLocation.latitude.toFixed(5)}, {partnerLocation.longitude.toFixed(5)}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={colors.location} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noLocation}>
              <Ionicons name="location-outline" size={32} color={colors.textMuted} />
              <Text style={styles.noLocationText}>{partner.name} is not sharing location</Text>
            </View>
          )}
        </View>

        {/* Privacy Info */}
        <View style={styles.privacyInfo}>
          <Text style={styles.privacyInfoTitle}>🔒 Privacy</Text>
          <View style={styles.privacyItem}>
            <Ionicons name="hand-left" size={16} color={colors.info} />
            <Text style={styles.privacyItemText}>Manual sharing only - no background tracking</Text>
          </View>
          <View style={styles.privacyItem}>
            <Ionicons name="close-circle" size={16} color={colors.info} />
            <Text style={styles.privacyItemText}>Stop sharing anytime with one tap</Text>
          </View>
          <View style={styles.privacyItem}>
            <Ionicons name="trash" size={16} color={colors.info} />
            <Text style={styles.privacyItemText}>We don't store your location history</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },

  // Map
  mapSection: {
    height: MAP_HEIGHT,
    position: 'relative',
  },
  privacyBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  privacyText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.success,
  },
  disabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
  },
  disabledCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  disabledTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  disabledText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },

  // Cards
  cardsSection: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    marginTop: -spacing.lg,
  },
  cardsContent: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.success,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  detailLink: {
    fontSize: typography.fontSize.sm,
    color: colors.location,
    fontWeight: typography.fontWeight.medium,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  stopBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.error,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.location,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  shareBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textInverse,
  },

  // Partner Location
  locationAvailable: {},
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.locationLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  locationInfo: {},
  locationTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  locationTime: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  openMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.locationLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  openMapTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.location,
  },
  openMapCoords: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  noLocation: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noLocationText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // Privacy Info
  privacyInfo: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  privacyInfoTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  privacyItemText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
});

export default LocationScreen;
