import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  TextInput,
  Animated,
  Vibration,
  Platform,
  PanResponder,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { memoryApi, API_BASE_URL } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Memory } from '../types';
import { Button } from '../components';
import { typography, spacing, borderRadius, shadows } from '../utils/theme';
import { useTheme } from '../hooks/useTheme';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const CARD_WIDTH = (width - spacing.md * 3) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

type ViewMode = 'grid' | 'timeline';
type SortOrder = 'newest' | 'oldest';

interface GroupedMemories {
  [key: string]: Memory[];
}

export const MemoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { consentStatus, refreshConsent, user, partner } = useAuthStore();
  const { colors, isDark } = useTheme();
  
  // Slide animation (from left)
  const slideAnim = useRef(new Animated.Value(-width)).current;
  
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 15,
    }).start();
  }, []);
  
  const handleBack = () => {
    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      navigation.goBack();
    });
  };
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dx < -15 && 
               Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          Vibration.vibrate(30);
          handleBack();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [uploadImage, setUploadImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'mine' | 'partner'>('all');

  useEffect(() => {
    refreshConsent();
    loadMemories();
  }, [sortOrder, filterBy]);

  const canAccess = consentStatus?.featureStatus?.memoryAccess?.active;
  const canUpload = consentStatus?.featureStatus?.photoSharing?.active;

  const loadMemories = async (pageNum = 1) => {
    if (!canAccess) {
      setIsLoading(false);
      return;
    }

    try {
      if (pageNum === 1) setIsLoading(true);
      
      const response = await memoryApi.list(pageNum);
      
      if (response.success && response.data) {
        let newMemories = response.data.memories;
        
        // Apply filters
        if (filterBy === 'mine' && user) {
          newMemories = newMemories.filter(m => m.uploadedBy.uniqueId === user.uniqueId);
        } else if (filterBy === 'partner' && partner) {
          newMemories = newMemories.filter(m => m.uploadedBy.uniqueId === partner.uniqueId);
        }
        
        // Apply sort
        newMemories = newMemories.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
        
        if (pageNum === 1) {
          setMemories(newMemories);
        } else {
          setMemories((prev) => [...prev, ...newMemories]);
        }
        
        setHasMore(pageNum < response.data.pagination.pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadMemories(page + 1);
    }
  };

  // Group memories by month/year
  const groupedMemories = useCallback((): GroupedMemories => {
    const groups: GroupedMemories = {};
    memories.forEach(memory => {
      const date = new Date(memory.createdAt);
      const key = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(memory);
    });
    return groups;
  }, [memories]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadImage(result.assets[0].uri);
      setShowUploadModal(true);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadImage(result.assets[0].uri);
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (!uploadImage) return;

    try {
      setIsUploading(true);
      
      await memoryApi.upload(uploadImage, caption.trim() || undefined);
      
      setShowUploadModal(false);
      setUploadImage(null);
      setCaption('');
      loadMemories(1);
      Vibration.vibrate(100);
      
      Alert.alert('✨ Memory Saved!', 'Your moment is now preserved forever.');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to upload memory';
      Alert.alert('Error', message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (memory: Memory) => {
    Alert.alert(
      'Delete Memory',
      'This moment will be removed forever. Are you sure?',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await memoryApi.delete(memory.id);
              setMemories((prev) => prev.filter((m) => m.id !== memory.id));
              setSelectedMemory(null);
              Vibration.vibrate(50);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete memory');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const renderMemoryCard = ({ item }: { item: Memory }) => {
    const imageUrl = item.imagePath.startsWith('http')
      ? item.imagePath
      : `${API_BASE_URL}${item.imagePath}`;
    
    const isMyMemory = item.uploadedBy.uniqueId === user?.uniqueId;
    
    return (
      <TouchableOpacity 
        style={[styles.memoryCard, { backgroundColor: colors.background }]}
        onPress={() => setSelectedMemory(item)}
        activeOpacity={0.9}
      >
        <Image source={{ uri: imageUrl }} style={styles.memoryImage} />
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.cardGradient}
        />
        
        {/* Date Badge */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeDay}>
            {new Date(item.createdAt).getDate()}
          </Text>
          <Text style={styles.dateBadgeMonth}>
            {new Date(item.createdAt).toLocaleString('default', { month: 'short' })}
          </Text>
        </View>
        
        {/* Info Overlay */}
        <View style={styles.cardInfo}>
          {item.caption && (
            <Text style={styles.cardCaption} numberOfLines={2}>
              {item.caption}
            </Text>
          )}
          <View style={styles.cardMeta}>
            <View style={[
              styles.uploaderBadge, 
              { backgroundColor: isMyMemory ? colors.primary : colors.secondary }
            ]}>
              <Ionicons 
                name={isMyMemory ? "person" : "heart"} 
                size={10} 
                color="white" 
              />
              <Text style={styles.uploaderText}>
                {isMyMemory ? 'You' : item.uploadedBy.name}
              </Text>
            </View>
            <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTimelineSection = () => {
    const groups = groupedMemories();
    const sections = Object.keys(groups);
    
    return (
      <ScrollView style={styles.timelineContainer} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section} style={styles.timelineSection}>
            <View style={styles.timelineHeader}>
              <View style={styles.timelineDot} />
              <Text style={[styles.timelineTitle, { color: colors.text }]}>{section}</Text>
              <Text style={[styles.timelineCount, { color: colors.textMuted }]}>
                {groups[section].length} memories
              </Text>
            </View>
            <View style={styles.timelineGrid}>
              {groups[section].map((memory) => (
                <TouchableOpacity 
                  key={memory.id}
                  style={styles.timelineCard}
                  onPress={() => setSelectedMemory(memory)}
                >
                  <Image 
                    source={{ 
                      uri: memory.imagePath.startsWith('http')
                        ? memory.imagePath
                        : `${API_BASE_URL}${memory.imagePath}`
                    }} 
                    style={styles.timelineImage} 
                  />
                  <View style={styles.timelineCardOverlay}>
                    <Text style={styles.timelineCardDate}>
                      {new Date(memory.createdAt).getDate()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  const styles = createStyles(colors, isDark);

  // No consent state
  if (!canAccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.noAccessContainer}>
          <View style={[styles.noAccessIcon, { backgroundColor: colors.backgroundAlt }]}>
            <Ionicons name="lock-closed" size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.noAccessTitle, { color: colors.text }]}>
            Memory Vault Locked
          </Text>
          <Text style={[styles.noAccessText, { color: colors.textSecondary }]}>
            Both partners need to enable memory access to unlock your shared moments.
          </Text>
          <TouchableOpacity 
            style={[styles.enableBtn, { backgroundColor: colors.primary }]}
            onPress={() => {}}
          >
            <Ionicons name="key-outline" size={20} color="white" />
            <Text style={styles.enableBtnText}>Enable Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[styles.container, { backgroundColor: colors.backgroundAlt, transform: [{ translateX: slideAnim }] }]}
      {...panResponder.panHandlers}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Memories</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {memories.length} moments together
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.optionsBtn}
          onPress={() => setShowOptionsModal(true)}
        >
          <Ionicons name="options-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.background }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{memories.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#4CAF50' }]}>
            {memories.filter(m => m.uploadedBy.uniqueId === user?.uniqueId).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>By You</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#FF5722' }]}>
            {memories.filter(m => m.uploadedBy.uniqueId !== user?.uniqueId).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>By {partner?.name?.split(' ')[0] || 'Partner'}</Text>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.viewToggleContainer}>
        <View style={[styles.viewToggle, { backgroundColor: colors.background }]}>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons 
              name="grid-outline" 
              size={18} 
              color={viewMode === 'grid' ? 'white' : colors.textMuted} 
            />
            <Text style={[
              styles.toggleText, 
              { color: viewMode === 'grid' ? 'white' : colors.textMuted }
            ]}>Grid</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'timeline' && styles.toggleBtnActive]}
            onPress={() => setViewMode('timeline')}
          >
            <Ionicons 
              name="time-outline" 
              size={18} 
              color={viewMode === 'timeline' ? 'white' : colors.textMuted} 
            />
            <Text style={[
              styles.toggleText, 
              { color: viewMode === 'timeline' ? 'white' : colors.textMuted }
            ]}>Timeline</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading memories...
          </Text>
        </View>
      ) : memories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ fontSize: 48 }}>📷</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Start Your Journey
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Capture your first memory together and begin building your love story
          </Text>
          {canUpload && (
            <TouchableOpacity 
              style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}
              onPress={pickImage}
            >
              <Ionicons name="add-circle-outline" size={22} color="white" />
              <Text style={styles.addFirstBtnText}>Add First Memory</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          data={memories}
          renderItem={renderMemoryCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                ✨ All memories loaded
              </Text>
            )
          }
        />
      ) : (
        renderTimelineSection()
      )}

      {/* FAB - Add Memory */}
      {canUpload && (
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={pickImage}
          onLongPress={takePhoto}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={[styles.optionsModal, { backgroundColor: colors.background }]}>
            <Text style={[styles.optionsTitle, { color: colors.text }]}>Options</Text>
            
            <Text style={[styles.optionLabel, { color: colors.textMuted }]}>SORT BY</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity 
                style={[
                  styles.optionChip, 
                  sortOrder === 'newest' && styles.optionChipActive,
                  { borderColor: colors.border }
                ]}
                onPress={() => setSortOrder('newest')}
              >
                <Text style={[
                  styles.optionChipText,
                  { color: sortOrder === 'newest' ? 'white' : colors.text }
                ]}>Newest First</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.optionChip, 
                  sortOrder === 'oldest' && styles.optionChipActive,
                  { borderColor: colors.border }
                ]}
                onPress={() => setSortOrder('oldest')}
              >
                <Text style={[
                  styles.optionChipText,
                  { color: sortOrder === 'oldest' ? 'white' : colors.text }
                ]}>Oldest First</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.optionLabel, { color: colors.textMuted }]}>FILTER BY</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity 
                style={[
                  styles.optionChip, 
                  filterBy === 'all' && styles.optionChipActive,
                  { borderColor: colors.border }
                ]}
                onPress={() => setFilterBy('all')}
              >
                <Text style={[
                  styles.optionChipText,
                  { color: filterBy === 'all' ? 'white' : colors.text }
                ]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.optionChip, 
                  filterBy === 'mine' && styles.optionChipActive,
                  { borderColor: colors.border }
                ]}
                onPress={() => setFilterBy('mine')}
              >
                <Text style={[
                  styles.optionChipText,
                  { color: filterBy === 'mine' ? 'white' : colors.text }
                ]}>By Me</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.optionChip, 
                  filterBy === 'partner' && styles.optionChipActive,
                  { borderColor: colors.border }
                ]}
                onPress={() => setFilterBy('partner')}
              >
                <Text style={[
                  styles.optionChipText,
                  { color: filterBy === 'partner' ? 'white' : colors.text }
                ]}>By Partner</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.closeOptionsBtn, { backgroundColor: colors.backgroundAlt }]}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={[styles.closeOptionsBtnText, { color: colors.text }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* View Memory Modal */}
      <Modal
        visible={!!selectedMemory}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMemory(null)}
      >
        <View style={styles.viewModalOverlay}>
          <TouchableOpacity
            style={styles.viewModalClose}
            onPress={() => setSelectedMemory(null)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          
          {selectedMemory && (
            <View style={styles.viewModalContent}>
              <Image
                source={{
                  uri: selectedMemory.imagePath.startsWith('http')
                    ? selectedMemory.imagePath
                    : `${API_BASE_URL}${selectedMemory.imagePath}`,
                }}
                style={styles.viewModalImage}
                resizeMode="contain"
              />
              
              <View style={styles.viewModalInfo}>
                <View style={styles.viewModalDateRow}>
                  <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.viewModalDate}>
                    {formatDate(selectedMemory.createdAt)} at {formatTime(selectedMemory.createdAt)}
                  </Text>
                </View>
                <Text style={styles.viewModalTimeAgo}>
                  {getTimeAgo(selectedMemory.createdAt)}
                </Text>
                
                {selectedMemory.caption && (
                  <Text style={styles.viewModalCaption}>"{selectedMemory.caption}"</Text>
                )}
                
                <View style={styles.viewModalUploader}>
                  <Ionicons name="heart" size={14} color={colors.primary} />
                  <Text style={styles.viewModalUploaderText}>
                    Uploaded by {selectedMemory.uploadedBy.name}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.viewModalDeleteBtn}
                onPress={() => handleDelete(selectedMemory)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF5252" />
                <Text style={styles.viewModalDeleteText}>Delete Memory</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={[styles.uploadModal, { backgroundColor: colors.background }]}>
          <View style={[styles.uploadHeader, { backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={() => setShowUploadModal(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.uploadTitle, { color: colors.text }]}>New Memory</Text>
            <TouchableOpacity 
              onPress={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.uploadSaveText, { color: colors.primary }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {uploadImage && (
            <Image source={{ uri: uploadImage }} style={styles.uploadPreview} />
          )}
          
          <View style={styles.uploadForm}>
            <View style={[styles.captionContainer, { backgroundColor: colors.backgroundAlt }]}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.captionInput, { color: colors.text }]}
                placeholder="Add a caption to remember this moment..."
                value={caption}
                onChangeText={setCaption}
                maxLength={500}
                multiline
                placeholderTextColor={colors.textMuted}
              />
            </View>
            
            <View style={styles.uploadTips}>
              <Text style={[styles.uploadTipTitle, { color: colors.text }]}>💡 Tips</Text>
              <Text style={[styles.uploadTipText, { color: colors.textMuted }]}>
                • Add a caption to describe the moment{'\n'}
                • Memories are shared with your partner{'\n'}
                • Both of you can view and delete memories
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 55 : spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  optionsBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },

  // View Toggle
  viewToggleContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 24,
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  addFirstBtnText: {
    color: 'white',
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },

  // Grid
  gridContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  // Memory Card
  memoryCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  memoryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundAlt,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  dateBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: borderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  dateBadgeDay: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateBadgeMonth: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
  },
  cardCaption: {
    color: 'white',
    fontSize: typography.fontSize.sm,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  uploaderText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  cardTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },

  // Timeline
  timelineContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  timelineSection: {
    marginBottom: spacing.lg,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  timelineTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    flex: 1,
  },
  timelineCount: {
    fontSize: typography.fontSize.sm,
  },
  timelineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginLeft: 20,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  timelineCard: {
    width: (width - 80) / 4,
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  timelineImage: {
    width: '100%',
    height: '100%',
  },
  timelineCardOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  timelineCardDate: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },

  // Footer
  footerText: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontSize: typography.fontSize.sm,
  },

  // No Access
  noAccessContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  noAccessIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  noAccessTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
  },
  noAccessText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 24,
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  enableBtnText: {
    color: 'white',
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },

  // Options Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
  },
  optionsTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  optionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  closeOptionsBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  closeOptionsBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },

  // View Modal
  viewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModalContent: {
    width: '100%',
    alignItems: 'center',
  },
  viewModalImage: {
    width: width,
    height: height * 0.55,
  },
  viewModalInfo: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  viewModalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewModalDate: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  viewModalTimeAgo: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  viewModalCaption: {
    fontSize: typography.fontSize.lg,
    color: 'white',
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  viewModalUploader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  viewModalUploaderText: {
    color: 'white',
    fontSize: typography.fontSize.sm,
  },
  viewModalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  viewModalDeleteText: {
    color: '#FF5252',
    fontSize: typography.fontSize.base,
  },

  // Upload Modal
  uploadModal: {
    flex: 1,
  },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
  },
  uploadTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  uploadSaveText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  uploadPreview: {
    width: '100%',
    height: height * 0.45,
    backgroundColor: '#000',
  },
  uploadForm: {
    flex: 1,
    padding: spacing.lg,
  },
  captionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  captionInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  uploadTips: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
  },
  uploadTipTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  uploadTipText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 22,
  },
});

export default MemoryScreen;
