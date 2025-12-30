import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calendarApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { ImportantDate } from '../types';
import { useTheme } from '../hooks/useTheme';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';

const EMOJIS = ['❤️', '🎂', '💍', '🎉', '🌹', '💕', '🎁', '✨', '🏠', '✈️', '💑', '🥂', '🎄', '🎃', '💐', '🍰'];

export const CalendarScreen: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { partner } = useAuthStore();
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDate, setNewDate] = useState({
    title: '',
    description: '',
    day: '',
    month: '',
    year: '',
    emoji: '❤️',
    isRecurring: false,
  });

  const styles = createStyles(colors, isDark);

  useEffect(() => {
    loadDates();
  }, []);

  const loadDates = async () => {
    try {
      setIsLoading(true);
      const response = await calendarApi.getDates();
      if (response.success && response.data) {
        setDates(response.data.dates);
      }
    } catch (error) {
      console.log('Failed to load dates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDate = async () => {
    if (!newDate.title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    
    if (!newDate.day || !newDate.month || !newDate.year) {
      Alert.alert('Error', 'Please enter a complete date');
      return;
    }
    
    const day = parseInt(newDate.day);
    const month = parseInt(newDate.month);
    const year = parseInt(newDate.year);
    
    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
      Alert.alert('Error', 'Please enter a valid date');
      return;
    }

    try {
      const dateStr = new Date(year, month - 1, day).toISOString();
      
      const response = await calendarApi.addDate({
        title: newDate.title.trim(),
        description: newDate.description.trim() || undefined,
        date: dateStr,
        emoji: newDate.emoji,
        isRecurring: newDate.isRecurring,
      });

      if (response.success) {
        Alert.alert('✓', 'Date added!');
        setShowAddModal(false);
        setNewDate({ title: '', description: '', day: '', month: '', year: '', emoji: '❤️', isRecurring: false });
        loadDates();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add date');
    }
  };

  const handleDeleteDate = (dateId: string) => {
    Alert.alert('Delete?', 'Remove this date?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await calendarApi.deleteDate(dateId);
            loadDates();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntil = (dateStr: string, isRecurring: boolean) => {
    const date = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // For recurring events, calculate next occurrence
    if (isRecurring) {
      const thisYear = new Date(now.getFullYear(), date.getMonth(), date.getDate());
      const nextYear = new Date(now.getFullYear() + 1, date.getMonth(), date.getDate());
      const targetDate = thisYear >= now ? thisYear : nextYear;
      const diff = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff === 0) return '🎉 Today!';
      if (diff === 1) return 'Tomorrow';
      return `In ${diff} days`;
    }
    
    date.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return '🎉 Today!';
    if (diff === 1) return 'Tomorrow';
    if (diff < 0) return `${Math.abs(diff)} days ago`;
    return `In ${diff} days`;
  };

  const renderDateCard = ({ item }: { item: ImportantDate }) => (
    <View style={styles.dateCard}>
      <View style={styles.dateLeft}>
        <Text style={styles.dateEmoji}>{item.emoji}</Text>
      </View>
      <View style={styles.dateCenter}>
        <Text style={styles.dateTitle}>{item.title}</Text>
        <Text style={styles.dateSubtitle}>{formatDate(item.date)}</Text>
        {item.description && (
          <Text style={styles.dateDesc} numberOfLines={1}>{item.description}</Text>
        )}
        {item.isRecurring && (
          <View style={styles.recurringTag}>
            <Ionicons name="repeat" size={12} color={colors.info} />
            <Text style={styles.recurringText}>Yearly</Text>
          </View>
        )}
      </View>
      <View style={styles.dateRight}>
        <Text style={[styles.daysUntil, getDaysUntil(item.date, item.isRecurring).includes('Today') && styles.daysUntilToday]}>
          {getDaysUntil(item.date, item.isRecurring)}
        </Text>
        <TouchableOpacity 
          style={styles.deleteBtn}
          onPress={() => handleDeleteDate(item.id)}
        >
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📅 Important Dates</Text>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      {/* Dates List */}
      <FlatList
        data={dates.sort((a, b) => {
          const daysA = getDaysUntil(a.date, a.isRecurring);
          const daysB = getDaysUntil(b.date, b.isRecurring);
          const numA = parseInt(daysA.match(/\d+/)?.[0] || '0');
          const numB = parseInt(daysB.match(/\d+/)?.[0] || '0');
          if (daysA.includes('Today')) return -1;
          if (daysB.includes('Today')) return 1;
          if (daysA.includes('Tomorrow')) return -1;
          if (daysB.includes('Tomorrow')) return 1;
          return numA - numB;
        })}
        keyExtractor={(item) => item.id}
        renderItem={renderDateCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>No Dates Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your anniversaries, birthdays, and special moments with {partner?.name || 'your partner'}
            </Text>
            <TouchableOpacity 
              style={styles.emptyAddBtn}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.emptyAddText}>Add First Date</Text>
            </TouchableOpacity>
          </View>
        }
        refreshing={isLoading}
        onRefresh={loadDates}
      />

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Important Date</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Emoji Picker */}
                <Text style={styles.inputLabel}>Choose an emoji</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
                  {EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiBtn,
                        newDate.emoji === emoji && styles.emojiBtnActive,
                      ]}
                      onPress={() => setNewDate({ ...newDate, emoji })}
                    >
                      <Text style={styles.emojiBtnText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Title */}
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Our Anniversary, Birthday"
                  placeholderTextColor={colors.textMuted}
                  value={newDate.title}
                  onChangeText={(text) => setNewDate({ ...newDate, title: text })}
                  maxLength={50}
                />

                {/* Description */}
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  placeholder="Add some notes..."
                  placeholderTextColor={colors.textMuted}
                  value={newDate.description}
                  onChangeText={(text) => setNewDate({ ...newDate, description: text })}
                  multiline
                  maxLength={200}
                />

                {/* Date - Day/Month/Year inputs */}
                <Text style={styles.inputLabel}>Date *</Text>
                <View style={styles.dateInputRow}>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Day</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="DD"
                      placeholderTextColor={colors.textMuted}
                      value={newDate.day}
                      onChangeText={(text) => setNewDate({ ...newDate, day: text.replace(/[^0-9]/g, '').slice(0, 2) })}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Month</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="MM"
                      placeholderTextColor={colors.textMuted}
                      value={newDate.month}
                      onChangeText={(text) => setNewDate({ ...newDate, month: text.replace(/[^0-9]/g, '').slice(0, 2) })}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.dateInputGroup}>
                    <Text style={styles.dateInputLabel}>Year</Text>
                    <TextInput
                      style={[styles.dateInput, { flex: 1.5 }]}
                      placeholder="YYYY"
                      placeholderTextColor={colors.textMuted}
                      value={newDate.year}
                      onChangeText={(text) => setNewDate({ ...newDate, year: text.replace(/[^0-9]/g, '').slice(0, 4) })}
                      keyboardType="number-pad"
                      maxLength={4}
                    />
                  </View>
                </View>

                {/* Recurring */}
                <TouchableOpacity
                  style={styles.recurringRow}
                  onPress={() => setNewDate({ ...newDate, isRecurring: !newDate.isRecurring })}
                >
                  <View style={[styles.checkbox, newDate.isRecurring && styles.checkboxActive]}>
                    {newDate.isRecurring && (
                      <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.recurringLabel}>Repeat yearly</Text>
                    <Text style={styles.recurringHint}>For birthdays and anniversaries</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleAddDate}
                >
                  <Text style={styles.saveText}>Add Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardBackground,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  dateLeft: {
    marginRight: spacing.md,
  },
  dateEmoji: {
    fontSize: 36,
  },
  dateCenter: {
    flex: 1,
  },
  dateTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  dateSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateDesc: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  recurringTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  recurringText: {
    fontSize: typography.fontSize.xs,
    color: colors.info,
  },
  dateRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  daysUntil: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },
  daysUntilToday: {
    color: colors.success,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 6,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: spacing.lg,
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
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  emptyAddText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: 'white',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },
  modalBody: {
    padding: spacing.lg,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text,
  },
  inputMulti: {
    height: 80,
    textAlignVertical: 'top',
  },
  emojiRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  emojiBtnActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emojiBtnText: {
    fontSize: 24,
  },
  
  // Date inputs
  dateInputRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  dateInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.lg,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  recurringLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text,
    fontWeight: '500',
  },
  recurringHint: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
  modalActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundAlt,
  },
  cancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  saveText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textInverse,
  },
});

export default CalendarScreen;
