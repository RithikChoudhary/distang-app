import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { coupleApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components';
import { colors, typography, spacing, borderRadius } from '../utils/theme';

interface BreakupScreenProps {
  navigation: any;
}

export const BreakupScreen: React.FC<BreakupScreenProps> = ({ navigation }) => {
  const { user, partner, refreshUser } = useAuthStore();
  const [anonymousReview, setAnonymousReview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'warning' | 'review' | 'confirm'>('warning');

  const handleBreakup = async () => {
    try {
      setIsLoading(true);
      
      const response = await coupleApi.breakup(
        anonymousReview.trim() || undefined
      );
      
      if (response.success) {
        await refreshUser();
        Alert.alert(
          'Relationship Ended',
          'Your memories have been archived. Take care of yourself.',
          [
            {
              text: 'OK',
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              }),
            },
          ]
        );
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to end relationship';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user?.coupleId || !partner) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Not Connected</Text>
          <Text style={styles.emptySubtitle}>
            You're not currently in a relationship.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {step === 'warning' && (
        <>
          {/* Warning Card */}
          <View style={styles.warningCard}>
            <View style={styles.warningIcon}>
              <Ionicons name="heart-dislike" size={48} color={colors.error} />
            </View>
            <Text style={styles.warningTitle}>End Relationship</Text>
            <Text style={styles.warningText}>
              This action will end your connection with{' '}
              <Text style={styles.partnerName}>{partner.name}</Text>.
            </Text>
          </View>

          {/* What Happens */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What happens when you end it:</Text>
            
            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="archive-outline" size={20} color={colors.info} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Memories Archived</Text>
                <Text style={styles.infoText}>
                  Your shared memories will be archived, not deleted.
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="unlink-outline" size={20} color={colors.warning} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Connection Removed</Text>
                <Text style={styles.infoText}>
                  You'll no longer be connected as partners.
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, { backgroundColor: colors.successLight }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>All Consent Revoked</Text>
                <Text style={styles.infoText}>
                  All shared permissions will be immediately revoked.
                </Text>
              </View>
            </View>
          </View>

          <Button
            title="I Understand, Continue"
            onPress={() => setStep('review')}
            variant="outline"
            style={styles.button}
          />
          
          <Button
            title="Cancel"
            onPress={() => navigation.goBack()}
            variant="ghost"
            style={styles.cancelButton}
          />
        </>
      )}

      {step === 'review' && (
        <>
          {/* Anonymous Review */}
          <View style={styles.reviewCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.reviewTitle}>Leave Anonymous Feedback</Text>
            <Text style={styles.reviewSubtitle}>
              Optional: Share your thoughts anonymously. Your identity will not be revealed.
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience (optional, max 300 characters)"
              value={anonymousReview}
              onChangeText={(text) => setAnonymousReview(text.slice(0, 300))}
              multiline
              maxLength={300}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.charCount}>{anonymousReview.length}/300</Text>
          </View>

          <View style={styles.privacyNote}>
            <Ionicons name="eye-off" size={16} color={colors.success} />
            <Text style={styles.privacyText}>
              This feedback is completely anonymous. Your partner will never know who wrote it.
            </Text>
          </View>

          <Button
            title="Continue to Confirm"
            onPress={() => setStep('confirm')}
            style={styles.button}
          />
          
          <Button
            title="Back"
            onPress={() => setStep('warning')}
            variant="ghost"
            style={styles.cancelButton}
          />
        </>
      )}

      {step === 'confirm' && (
        <>
          {/* Final Confirmation */}
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="warning" size={48} color={colors.error} />
            </View>
            <Text style={styles.confirmTitle}>Final Confirmation</Text>
            <Text style={styles.confirmText}>
              You are about to end your relationship with{' '}
              <Text style={styles.partnerName}>{partner.name}</Text>.
            </Text>
            <Text style={styles.confirmSubtext}>
              This action cannot be undone.
            </Text>
          </View>

          <Button
            title="End Relationship"
            onPress={handleBreakup}
            loading={isLoading}
            style={styles.dangerButton}
          />
          
          <Button
            title="Cancel - Keep Relationship"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={styles.button}
          />
        </>
      )}
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

  // Warning Card
  warningCard: {
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  warningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  warningTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  warningText: {
    fontSize: typography.fontSize.base,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  partnerName: {
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Info Items
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },

  // Review
  reviewCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  reviewTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  reviewSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  reviewInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  charCount: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  privacyText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.success,
  },

  // Confirm
  confirmCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.error,
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  confirmTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  confirmText: {
    fontSize: typography.fontSize.base,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  confirmSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Buttons
  button: {
    marginBottom: spacing.sm,
  },
  cancelButton: {
    marginBottom: spacing.sm,
  },
  dangerButton: {
    backgroundColor: colors.error,
    marginBottom: spacing.sm,
  },
});

export default BreakupScreen;

