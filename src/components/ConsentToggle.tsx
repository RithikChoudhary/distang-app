import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, borderRadius, spacing, shadows } from '../utils/theme';

interface ConsentToggleProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  myConsent: boolean;
  partnerConsent: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

export const ConsentToggle: React.FC<ConsentToggleProps> = ({
  title,
  description,
  icon,
  myConsent,
  partnerConsent,
  onToggle,
  disabled = false,
}) => {
  const isActive = myConsent && partnerConsent;

  return (
    <View style={[styles.container, isActive && styles.containerActive]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, isActive && styles.iconActive]}>
          <Ionicons
            name={icon}
            size={24}
            color={isActive ? colors.textInverse : colors.primary}
          />
        </View>
        
        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        
        <Switch
          value={myConsent}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primaryLight }}
          thumbColor={myConsent ? colors.primary : colors.textMuted}
          disabled={disabled}
        />
      </View>
      
      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: myConsent ? colors.success : colors.textMuted },
            ]}
          />
          <Text style={styles.statusText}>
            You: {myConsent ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: partnerConsent ? colors.success : colors.textMuted },
            ]}
          />
          <Text style={styles.statusText}>
            Partner: {partnerConsent ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>
      
      {!isActive && (myConsent || partnerConsent) && (
        <View style={styles.pendingBanner}>
          <Ionicons name="time-outline" size={16} color={colors.warning} />
          <Text style={styles.pendingText}>
            Waiting for {myConsent ? 'partner' : 'you'} to enable
          </Text>
        </View>
      )}
      
      {isActive && (
        <View style={styles.activeBanner}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.activeText}>
            Feature active - both partners consented
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  containerActive: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconActive: {
    backgroundColor: colors.primary,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
  },
  pendingText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
  },
  activeText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
  },
});

export default ConsentToggle;

