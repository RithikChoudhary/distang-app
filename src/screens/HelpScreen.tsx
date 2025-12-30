import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

const FAQ_ITEMS = [
  {
    question: 'How do I connect with my partner?',
    answer: 'Go to the Connect screen and enter your partner\'s unique code, or share your code with them. Once both of you enter each other\'s codes, you\'ll be connected!',
    icon: 'people-outline',
  },
  {
    question: 'How does location sharing work?',
    answer: 'Both partners need to enable location sharing in Privacy Controls. When enabled, you can see each other\'s location on the map in real-time. You can disable it anytime.',
    icon: 'location-outline',
  },
  {
    question: 'What are Streaks?',
    answer: 'Streaks are daily photo shares! Send a photo to your partner each day to maintain your streak. Photos are visible for 40 seconds or until seen, and expire after 24 hours.',
    icon: 'flame-outline',
  },
  {
    question: 'How do I use the Walkie Talkie feature?',
    answer: 'Tap the walkie button to send a buzz/vibration. Hold the button to record a voice message. Your partner will receive it instantly!',
    icon: 'radio-outline',
  },
  {
    question: 'How do Important Dates work?',
    answer: 'Add birthdays, anniversaries, and special occasions to the Calendar. Enable "Repeat yearly" for recurring events. You\'ll see a countdown to each date!',
    icon: 'calendar-outline',
  },
  {
    question: 'What happens to my data if we disconnect?',
    answer: 'If either partner ends the relationship, shared data like memories, messages, and location history are permanently deleted to protect both parties\' privacy.',
    icon: 'shield-outline',
  },
  {
    question: 'How do Questions work?',
    answer: 'Use the question feature in chat to ask fun questions to your partner. Both of you can answer in your own column, making it a fun way to learn more about each other!',
    icon: 'help-circle-outline',
  },
  {
    question: 'Why isn\'t my partner\'s location showing?',
    answer: 'Make sure both of you have: 1) Enabled location sharing in Privacy Controls, 2) Given the app location permissions, 3) An active internet connection.',
    icon: 'map-outline',
  },
];

const CONTACT_OPTIONS = [
  {
    title: 'Email Support',
    subtitle: 'support@codexapp.com',
    icon: 'mail-outline',
    color: '#1976D2',
    bgColor: '#E3F2FD',
    action: () => Linking.openURL('mailto:support@codexapp.com?subject=Codex App Support'),
  },
  {
    title: 'Report a Bug',
    subtitle: 'Help us improve',
    icon: 'bug-outline',
    color: '#E53935',
    bgColor: '#FFEBEE',
    action: () => Linking.openURL('mailto:bugs@codexapp.com?subject=Bug Report'),
  },
  {
    title: 'Feature Request',
    subtitle: 'Share your ideas',
    icon: 'bulb-outline',
    color: '#FF9800',
    bgColor: '#FFF3E0',
    action: () => Linking.openURL('mailto:feedback@codexapp.com?subject=Feature Request'),
  },
];

export const HelpScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactGrid}>
            {CONTACT_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.contactCard, isDark && { backgroundColor: colors.card }]}
                onPress={option.action}
              >
                <View style={[styles.contactIcon, { backgroundColor: isDark ? option.color + '20' : option.bgColor }]}>
                  <Ionicons name={option.icon as any} size={24} color={option.color} />
                </View>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <View style={styles.faqContainer}>
            {FAQ_ITEMS.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.faqItem}
                onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <View style={styles.faqHeader}>
                  <View style={[styles.faqIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons 
                    name={expandedFaq === index ? 'chevron-up' : 'chevron-down'} 
                    size={18} 
                    color={colors.textMuted} 
                  />
                </View>
                {expandedFaq === index && (
                  <View style={styles.faqAnswerWrap}>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>December 2024</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerEmoji}>💕</Text>
          <Text style={styles.footerText}>Made with love for couples</Text>
          <Text style={styles.footerSubtext}>We're here to help you stay connected</Text>
        </View>
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

  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Contact cards
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contactCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  contactTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // FAQ
  faqContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundAlt,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  faqIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.text,
  },
  faqAnswerWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: 48 + spacing.md,
  },
  faqAnswer: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundAlt,
  },
  infoLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.text,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingBottom: spacing['3xl'],
  },
  footerEmoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  footerText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text,
  },
  footerSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
});

export default HelpScreen;

