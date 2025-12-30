import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConsentToggle } from '../components';
import { consentApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

export const ConsentScreen: React.FC = () => {
  const { user, consentStatus, refreshConsent } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadConsentStatus();
  }, []);

  const loadConsentStatus = async () => {
    try {
      setIsLoading(true);
      await refreshConsent();
    } catch (error) {
      console.error('Failed to load consent status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (
    feature: 'photoSharing' | 'memoryAccess' | 'locationSharing',
    value: boolean
  ) => {
    try {
      setIsUpdating(true);
      
      await consentApi.update({ [feature]: value });
      await refreshConsent();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update consent';
      Alert.alert('Error', message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user?.coupleId) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Not Connected</Text>
          <Text style={styles.emptySubtitle}>
            You need to be in a relationship to manage consent settings.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color={colors.info} />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Mutual Consent Required</Text>
          <Text style={styles.infoText}>
            Features only activate when <Text style={styles.infoBold}>both partners</Text>{' '}
            enable them. Either partner can revoke consent at any time.
          </Text>
        </View>
      </View>

      {/* Consent Toggles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Settings</Text>

        <ConsentToggle
          title="Photo Sharing"
          description="Allow uploading and sharing photos together"
          icon="camera-outline"
          myConsent={consentStatus?.featureStatus?.photoSharing?.myConsent || false}
          partnerConsent={consentStatus?.featureStatus?.photoSharing?.partnerConsent || false}
          onToggle={(value) => handleToggle('photoSharing', value)}
          disabled={isUpdating}
        />

        <ConsentToggle
          title="Memory Access"
          description="Allow viewing shared memories and photos"
          icon="images-outline"
          myConsent={consentStatus?.featureStatus?.memoryAccess?.myConsent || false}
          partnerConsent={consentStatus?.featureStatus?.memoryAccess?.partnerConsent || false}
          onToggle={(value) => handleToggle('memoryAccess', value)}
          disabled={isUpdating}
        />

        <ConsentToggle
          title="Location Sharing"
          description="Allow sharing your current location"
          icon="location-outline"
          myConsent={consentStatus?.featureStatus?.locationSharing?.myConsent || false}
          partnerConsent={consentStatus?.featureStatus?.locationSharing?.partnerConsent || false}
          onToggle={(value) => handleToggle('locationSharing', value)}
          disabled={isUpdating}
        />
      </View>

      {/* Privacy Principles */}
      <View style={styles.principlesSection}>
        <Text style={styles.sectionTitle}>Our Privacy Principles</Text>
        
        <View style={styles.principleItem}>
          <View style={styles.principleIcon}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          </View>
          <View style={styles.principleContent}>
            <Text style={styles.principleTitle}>No Background Tracking</Text>
            <Text style={styles.principleText}>
              We never track your location in the background. Location sharing is always manual.
            </Text>
          </View>
        </View>

        <View style={styles.principleItem}>
          <View style={styles.principleIcon}>
            <Ionicons name="eye-off" size={20} color={colors.success} />
          </View>
          <View style={styles.principleContent}>
            <Text style={styles.principleTitle}>No Spying</Text>
            <Text style={styles.principleText}>
              We don't monitor app usage, messages, or any other activity outside this app.
            </Text>
          </View>
        </View>

        <View style={styles.principleItem}>
          <View style={styles.principleIcon}>
            <Ionicons name="hand-left" size={20} color={colors.success} />
          </View>
          <View style={styles.principleContent}>
            <Text style={styles.principleTitle}>Instant Revocation</Text>
            <Text style={styles.principleText}>
              Turning off any consent immediately stops that feature. No delays, no questions.
            </Text>
          </View>
        </View>

        <View style={styles.principleItem}>
          <View style={styles.principleIcon}>
            <Ionicons name="people" size={20} color={colors.success} />
          </View>
          <View style={styles.principleContent}>
            <Text style={styles.principleTitle}>Equal Control</Text>
            <Text style={styles.principleText}>
              Both partners have equal control. One person cannot override another's choices.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.info,
    marginBottom: 4,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: typography.fontWeight.bold,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Principles
  principlesSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  principleItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  principleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  principleContent: {
    flex: 1,
  },
  principleTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  principleText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default ConsentScreen;

