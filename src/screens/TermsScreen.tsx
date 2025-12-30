import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

const TERMS_SECTIONS = [
  {
    title: 'Terms of Service',
    icon: 'document-text-outline',
    content: `Welcome to Codex, the couples app designed to help you stay connected with your partner.

By using Codex, you agree to these terms:

1. **Eligibility**: You must be at least 18 years old to use this app.

2. **Account**: You're responsible for maintaining the security of your account. Keep your login credentials safe and don't share them.

3. **Acceptable Use**: Use Codex respectfully. Don't harass, abuse, or share inappropriate content. Both partners must consent to all shared features.

4. **Content**: You retain ownership of content you share (photos, messages). By uploading, you grant us permission to store and display it to your connected partner.

5. **Relationship Ending**: Either partner can end the connection at any time. This permanently deletes all shared data between you.

6. **Modifications**: We may update these terms. Continued use after changes means you accept the new terms.

7. **Termination**: We reserve the right to terminate accounts that violate these terms.`,
  },
  {
    title: 'Privacy Policy',
    icon: 'shield-checkmark-outline',
    content: `Your privacy is important to us. Here's how we handle your data:

**Data We Collect**:
• Account information (name, email, phone number)
• Profile photos and gallery images
• Messages and shared memories
• Location data (only when you enable location sharing)
• Device status (battery, mute status) when enabled

**How We Use Your Data**:
• To provide app functionality
• To connect you with your partner
• To display shared content between partners
• To send notifications about messages and activities

**Data Sharing**:
• We only share your data with your connected partner
• We do not sell your data to third parties
• We do not use your data for advertising

**Data Security**:
• All data is encrypted in transit
• Photos and messages are stored securely
• Only you and your partner can access shared content

**Data Deletion**:
• You can delete your account at any time
• Ending a relationship deletes all shared data
• We comply with GDPR and CCPA deletion requests`,
  },
  {
    title: 'Consent & Permissions',
    icon: 'hand-left-outline',
    content: `Codex is built on mutual consent. Both partners must agree to features before they work.

**Location Sharing**:
• Both partners must enable location sharing to see each other
• You can disable it anytime from Privacy Controls
• Location is only shared when the app is active

**Battery & Status Sharing**:
• Shows your partner your device status
• Completely optional and can be disabled

**Photo & Memory Sharing**:
• All photos are shared only with your connected partner
• You control what you share
• Memories can be deleted by the person who added them

**Notifications**:
• You can customize which notifications you receive
• We never send promotional or spam notifications

Your consent matters. Features won't work unless both partners agree.`,
  },
  {
    title: 'Data Retention',
    icon: 'time-outline',
    content: `We only keep your data as long as necessary:

**Active Account**:
• Profile data is kept while your account is active
• Messages and memories are stored until deleted
• Location data is not permanently stored

**Deleted Content**:
• Deleted messages are removed within 24 hours
• Deleted memories are removed immediately
• Streak photos expire after 24 hours automatically

**Account Deletion**:
• Deleting your account removes all your data
• Partner's connection is automatically severed
• Shared content is permanently deleted

**Backups**:
• We maintain encrypted backups for disaster recovery
• Backups are purged after 30 days`,
  },
  {
    title: 'Your Rights',
    icon: 'person-outline',
    content: `You have control over your data:

**Access**: You can view all data we have about you through the app.

**Correction**: You can update your profile information anytime.

**Deletion**: You can delete your account and all associated data.

**Portability**: You can request an export of your data.

**Consent Withdrawal**: You can disable any feature that requires consent.

**Complaints**: If you have concerns, contact us at privacy@codexapp.com.

We respond to all privacy requests within 30 days.`,
  },
];

export const TermsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  
  const [expandedSection, setExpandedSection] = React.useState<number | null>(0);

  const styles = createStyles(colors, isDark);

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
        <Text style={styles.headerTitle}>Terms & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <Text style={styles.introTitle}>Your Privacy Matters</Text>
          <Text style={styles.introText}>
            We're committed to protecting your data and being transparent about how we use it.
          </Text>
        </View>

        {/* Sections */}
        <View style={styles.sectionsContainer}>
          {TERMS_SECTIONS.map((section, index) => (
            <TouchableOpacity
              key={index}
              style={styles.sectionCard}
              onPress={() => setExpandedSection(expandedSection === index ? null : index)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name={section.icon as any} size={20} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Ionicons 
                  name={expandedSection === index ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={colors.textMuted} 
                />
              </View>
              {expandedSection === index && (
                <View style={styles.sectionContent}>
                  <Text style={styles.sectionText}>{section.content}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Questions?</Text>
          <Text style={styles.contactText}>
            If you have any questions about our terms or privacy practices, please contact us:
          </Text>
          <View style={styles.contactLinks}>
            <Text style={styles.contactEmail}>📧 privacy@codexapp.com</Text>
            <Text style={styles.contactEmail}>📧 legal@codexapp.com</Text>
          </View>
        </View>

        {/* Last Updated */}
        <Text style={styles.lastUpdated}>Last updated: December 2024</Text>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
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

  content: {
    flex: 1,
    padding: spacing.md,
  },

  // Intro
  introCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  introIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  introTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  introText: {
    fontSize: typography.fontSize.sm,
    color: isDark ? colors.text : colors.primary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Sections
  sectionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sectionTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  sectionContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: 56 + spacing.md,
  },
  sectionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  // Contact
  contactCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  contactTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  contactText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  contactLinks: {
    gap: spacing.xs,
  },
  contactEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
  },

  // Footer
  lastUpdated: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing['3xl'],
  },
});

export default TermsScreen;

