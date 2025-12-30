import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { userApi } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { NotificationPreferences } from '../types';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    messages: true,
    locationUpdates: true,
    streaks: true,
    calendar: true,
    walkieTalkie: true,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await userApi.getNotifications();
      if (response.success && response.data) {
        setPreferences(response.data.notifications);
      }
    } catch (error) {
      console.log('Failed to load notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    const newPrefs = { ...preferences, [key]: newValue };
    setPreferences(newPrefs);
    
    setIsSaving(true);
    try {
      await userApi.updateNotifications({ [key]: newValue });
    } catch (error) {
      // Revert on error
      setPreferences(preferences);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  const notificationItems = [
    {
      key: 'messages' as const,
      title: 'Messages',
      subtitle: 'Get notified when your partner sends a message',
      icon: 'chatbubble-outline',
      color: '#4CAF50',
    },
    {
      key: 'locationUpdates' as const,
      title: 'Location Updates',
      subtitle: 'Get notified when your partner shares location',
      icon: 'location-outline',
      color: '#2196F3',
    },
    {
      key: 'streaks' as const,
      title: 'Streak Reminders',
      subtitle: 'Daily reminders to keep your streak alive',
      icon: 'flame-outline',
      color: '#FF5722',
    },
    {
      key: 'calendar' as const,
      title: 'Calendar Events',
      subtitle: 'Reminders for important dates',
      icon: 'calendar-outline',
      color: '#9C27B0',
    },
    {
      key: 'walkieTalkie' as const,
      title: 'Walkie-Talkie',
      subtitle: 'Get notified when your partner sends a buzz',
      icon: 'radio-outline',
      color: '#FF9800',
    },
  ];

  const styles = createStyles(colors, isDark);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.info} />
          <Text style={styles.infoText}>
            Manage which notifications you want to receive from your partner
          </Text>
        </View>

        {/* Notification Settings */}
        <View style={styles.settingsCard}>
          {notificationItems.map((item, index) => (
            <View 
              key={item.key}
              style={[
                styles.settingItem,
                index < notificationItems.length - 1 && styles.settingItemBorder,
              ]}
            >
              <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              </View>
              <Switch
                value={preferences[item.key]}
                onValueChange={() => handleToggle(item.key)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
                disabled={isSaving}
              />
            </View>
          ))}
        </View>

        {/* Note */}
        <Text style={styles.note}>
          Note: These settings control in-app notifications. To manage system 
          notifications, go to your device settings.
        </Text>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },

  settingsCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundAlt,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },

  note: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    lineHeight: 18,
  },
});

export default NotificationsScreen;

