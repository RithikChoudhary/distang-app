import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Switch,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { userApi, consentApi, coupleApi, API_BASE_URL, getMediaUrl } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

type RootStackParamList = {
  Settings: undefined;
  Consent: undefined;
  Breakup: undefined;
  Help: undefined;
  Terms: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  Favorites: undefined;
  PartnerProfile: undefined;
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, partner, logout, refreshUser, consentStatus, refreshConsentStatus } = useAuthStore();
  const { colors, isDark, toggleTheme } = useTheme();
  
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Anniversary date state
  const [showDateModal, setShowDateModal] = useState(false);
  const [anniversaryDay, setAnniversaryDay] = useState('');
  const [anniversaryMonth, setAnniversaryMonth] = useState('');
  const [anniversaryYear, setAnniversaryYear] = useState('');
  const [relationshipDays, setRelationshipDays] = useState(0);
  const [isStartDateSet, setIsStartDateSet] = useState(false);
  const [dateLoading, setDateLoading] = useState(false);

  // Load relationship info on mount
  useEffect(() => {
    loadRelationshipInfo();
  }, []);

  const loadRelationshipInfo = async () => {
    try {
      const response = await coupleApi.getRelationshipInfo();
      if (response.success && response.data) {
        setRelationshipDays(response.data.daysTogether);
        setIsStartDateSet(response.data.isStartDateSet);
        if (response.data.relationshipStartDate) {
          const date = new Date(response.data.relationshipStartDate);
          setAnniversaryDay(date.getDate().toString());
          setAnniversaryMonth((date.getMonth() + 1).toString());
          setAnniversaryYear(date.getFullYear().toString());
        }
      }
    } catch (error) {
      console.log('Load relationship info error:', error);
    }
  };

  const handleSaveAnniversary = async () => {
    const day = parseInt(anniversaryDay);
    const month = parseInt(anniversaryMonth);
    const year = parseInt(anniversaryYear);
    
    if (!day || !month || !year || day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
      Alert.alert('Invalid Date', 'Please enter a valid date.');
      return;
    }
    
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    setDateLoading(true);
    try {
      const response = await coupleApi.setRelationshipStartDate(dateStr);
      if (response.success && response.data) {
        setRelationshipDays(response.data.daysTogether);
        setIsStartDateSet(true);
        setShowDateModal(false);
        Alert.alert('Success', `Your anniversary has been set! You've been together for ${response.data.daysTogether} days 🔥`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save anniversary date');
    } finally {
      setDateLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLoading(true);
      try {
        await userApi.uploadProfilePhoto(result.assets[0].uri);
        await refreshUser();
        Alert.alert('Success', 'Profile photo updated!');
      } catch (error) {
        Alert.alert('Error', 'Failed to update photo');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleLocationToggle = async () => {
    const currentValue = consentStatus?.myConsent.locationSharing || false;
    setLocationLoading(true);
    try {
      await consentApi.updateConsent({ locationSharing: !currentValue });
      await refreshConsentStatus();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update location sharing');
    } finally {
      setLocationLoading(false);
    }
  };

  const styles = createStyles(colors);

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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.profileCard} onPress={handleChangePhoto}>
            {user?.profilePhoto ? (
              <Image
                source={{ uri: getMediaUrl(user.profilePhoto) }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Ionicons name="person" size={32} color={colors.primary} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileUsername}>@{user?.username}</Text>
              <Text style={styles.changePhotoText}>Tap to change photo</Text>
            </View>
            <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? '#3D3D3D' : '#1A1A1A' }]}>
                <Ionicons 
                  name={isDark ? "moon" : "sunny"} 
                  size={18} 
                  color={isDark ? '#FFD700' : '#FF9500'} 
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Dark Mode</Text>
                <Text style={styles.menuSubtext}>
                  {isDark ? 'On - Easier on the eyes' : 'Off - Light and bright'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
              />
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="person-outline" size={18} color={colors.info} />
              </View>
              <Text style={styles.menuText}>Edit Profile</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('Notifications')}
            >
              <View style={[styles.menuIcon, { backgroundColor: isDark ? '#3D3020' : '#FFF3E0' }]}>
                <Ionicons name="notifications-outline" size={18} color="#F57C00" />
              </View>
              <Text style={styles.menuText}>Notifications</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('Favorites')}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="heart-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.menuText}>My Favorites</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('Consent')}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.consentLight }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.consent} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Privacy Controls</Text>
                <Text style={styles.menuSubtext}>Manage sharing permissions</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.locationLight }]}>
                <Ionicons name="location-outline" size={18} color={colors.location} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Location Sharing</Text>
                <Text style={styles.menuSubtext}>
                  {consentStatus?.myConsent.locationSharing ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <Switch
                value={consentStatus?.myConsent.locationSharing || false}
                onValueChange={handleLocationToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="white"
                disabled={locationLoading}
              />
            </View>
          </View>
        </View>

        {/* Relationship Section */}
        {partner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Relationship</Text>
            
            <View style={styles.menuCard}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => navigation.navigate('PartnerProfile')}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuText}>Partner</Text>
                  <Text style={styles.menuSubtext}>View profile, history & hobbies</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => setShowDateModal(true)}
              >
                <View style={[styles.menuIcon, { backgroundColor: isDark ? '#3D2D20' : '#FFF8E1' }]}>
                  <Ionicons name="calendar-outline" size={18} color="#F57C00" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuText}>Anniversary Date</Text>
                  <Text style={styles.menuSubtext}>
                    {isStartDateSet 
                      ? `🔥 ${relationshipDays} days together` 
                      : 'Tap to set your anniversary'
                    }
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => navigation.navigate('Breakup')}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.errorLight }]}>
                  <Ionicons name="heart-dislike-outline" size={18} color={colors.error} />
                </View>
                <Text style={[styles.menuText, { color: colors.error }]}>End Relationship</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <View style={styles.menuCard}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('Help')}
            >
              <View style={[styles.menuIcon, { backgroundColor: isDark ? '#1E2D4A' : '#E3F2FD' }]}>
                <Ionicons name="help-circle-outline" size={18} color="#1976D2" />
              </View>
              <Text style={styles.menuText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('Terms')}
            >
              <View style={[styles.menuIcon, { backgroundColor: isDark ? '#1A3D2A' : '#E8F5E9' }]}>
                <Ionicons name="document-text-outline" size={18} color="#388E3C" />
              </View>
              <Text style={styles.menuText}>Terms & Privacy</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      {/* Anniversary Date Modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Anniversary Date 💕</Text>
                <TouchableOpacity onPress={() => setShowDateModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>
                When did your relationship start?
              </Text>

              <View style={styles.dateInputRow}>
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.dateInputLabel}>Day</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={anniversaryDay}
                    onChangeText={setAnniversaryDay}
                    keyboardType="number-pad"
                    placeholder="DD"
                    placeholderTextColor={colors.textMuted}
                    maxLength={2}
                  />
                </View>
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.dateInputLabel}>Month</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={anniversaryMonth}
                    onChangeText={setAnniversaryMonth}
                    keyboardType="number-pad"
                    placeholder="MM"
                    placeholderTextColor={colors.textMuted}
                    maxLength={2}
                  />
                </View>
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.dateInputLabel}>Year</Text>
                  <TextInput
                    style={[styles.dateInput, { width: 80 }]}
                    value={anniversaryYear}
                    onChangeText={setAnniversaryYear}
                    keyboardType="number-pad"
                    placeholder="YYYY"
                    placeholderTextColor={colors.textMuted}
                    maxLength={4}
                  />
                </View>
              </View>

              {isStartDateSet && (
                <View style={styles.currentStreakBox}>
                  <Text style={styles.currentStreakText}>
                    🔥 Current streak: {relationshipDays} days
                  </Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.saveBtn, dateLoading && styles.saveBtnDisabled]}
                onPress={handleSaveAnniversary}
                disabled={dateLoading}
              >
                <Text style={styles.saveBtnText}>
                  {dateLoading ? 'Saving...' : 'Save Anniversary'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
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

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...shadows.sm,
  },
  profilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  profilePhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  profileUsername: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changePhotoText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary,
    marginTop: 4,
  },

  menuCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundAlt,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text,
    fontWeight: '500',
  },
  menuSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  signOutText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.error,
  },

  version: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing['2xl'],
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalKeyboard: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  dateInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  currentStreakBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  currentStreakText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.primary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: 'white',
  },
});

export default SettingsScreen;
