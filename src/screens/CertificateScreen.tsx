import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { coupleApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Certificate } from '../types';
import { Button } from '../components';
import { colors, typography, spacing, borderRadius, shadows } from '../utils/theme';

export const CertificateScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadCertificate();
  }, []);

  const loadCertificate = async () => {
    try {
      setIsLoading(true);
      const response = await coupleApi.getCertificate();
      
      if (response.success && response.data) {
        setCertificate(response.data.certificate);
      }
    } catch (error) {
      console.error('Failed to load certificate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      
      const arrayBuffer = await coupleApi.downloadCertificatePdf();
      
      // Convert to base64
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      // Save to file system
      const fileUri = `${FileSystem.documentDirectory}certificate-${certificate?.coupleId}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', 'Certificate saved!');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download certificate');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!certificate) return;

    try {
      await Share.share({
        message: `💕 ${certificate.partner1.name} & ${certificate.partner2.name}\nConnected since ${formatDate(certificate.pairingDate)}\nCouple ID: ${certificate.coupleId}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user?.coupleId) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="ribbon-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Certificate</Text>
          <Text style={styles.emptySubtitle}>
            Connect with your partner to get your relationship certificate.
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

  if (!certificate) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Certificate Not Found</Text>
          <Text style={styles.emptySubtitle}>
            There was an error loading your certificate.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Certificate Card */}
      <View style={styles.certificateCard}>
        {/* Header Decoration */}
        <View style={styles.decoration}>
          <View style={styles.heartContainer}>
            <Ionicons name="heart" size={32} color={colors.primary} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Digital Relationship Certificate</Text>
        
        <View style={styles.divider} />

        {/* This is to certify */}
        <Text style={styles.subtitle}>This is to certify that</Text>

        {/* Names */}
        <Text style={styles.partnerName}>{certificate.partner1.name}</Text>
        <Text style={styles.ampersand}>&</Text>
        <Text style={styles.partnerName}>{certificate.partner2.name}</Text>

        {/* Connection Text */}
        <Text style={styles.connectionText}>
          have officially connected their hearts in this app
        </Text>

        {/* Details Box */}
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Couple ID</Text>
            <Text style={styles.detailValue}>{certificate.coupleId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date of Pairing</Text>
            <Text style={styles.detailValue}>{formatDate(certificate.pairingDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Partner IDs</Text>
            <Text style={styles.detailValue}>
              {certificate.partner1.uniqueId} & {certificate.partner2.uniqueId}
            </Text>
          </View>
        </View>

        {/* Hearts */}
        <View style={styles.heartsRow}>
          <Ionicons name="heart" size={20} color={colors.primaryLight} />
          <Ionicons name="heart" size={24} color={colors.primary} />
          <Ionicons name="heart" size={20} color={colors.primaryLight} />
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimerCard}>
        <Ionicons name="alert-circle" size={20} color={colors.warning} />
        <Text style={styles.disclaimerText}>{certificate.disclaimer}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Download PDF"
          onPress={handleDownloadPdf}
          loading={isDownloading}
          icon={<Ionicons name="download-outline" size={18} color={colors.textInverse} />}
          style={styles.actionButton}
        />
        <Button
          title="Share"
          onPress={handleShare}
          variant="outline"
          icon={<Ionicons name="share-outline" size={18} color={colors.primary} />}
          style={styles.actionButton}
        />
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

  // Certificate Card
  certificateCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    ...shadows.lg,
  },
  decoration: {
    marginBottom: spacing.md,
  },
  heartContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
  },
  divider: {
    width: 100,
    height: 2,
    backgroundColor: colors.primaryLight,
    marginVertical: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  partnerName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
  },
  ampersand: {
    fontSize: typography.fontSize.xl,
    color: colors.textMuted,
    marginVertical: spacing.xs,
  },
  connectionText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.sm,
  },
  heartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  disclaimerText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
});

export default CertificateScreen;

