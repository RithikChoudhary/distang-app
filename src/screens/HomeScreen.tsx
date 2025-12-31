import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  StatusBar,
  Platform,
  Image,
  Vibration,
  Animated,
  Modal,
  AppState,
  PanResponder,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Battery from 'expo-battery';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { useAuthStore } from '../store/authStore';
import { chatApi, locationApi, streakApi, callStatusApi, walkieApi, coupleApi, moodApi, MoodType, MoodData, API_BASE_URL, getMediaUrl } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors as staticColors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { useTheme } from '../hooks/useTheme';
import { StreakPhoto } from '../types';
import { MapWebView } from '../components/MapWebView';

type CallState = 'idle' | 'incoming' | 'dialing' | 'connected' | 'disconnected' | 'unknown';

const { width } = Dimensions.get('window');

const GOOGLE_MAPS_API_KEY = 'AIzaSyA3iVJO8OLXFHf1gS7N8UYUX_z2Xf7asOY';

// Album size for the main photo/map area
const ALBUM_SIZE = width - 64;

// Calculate distance between two coordinates in meters (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Format distance for display
const formatDistance = (meters: number): string => {
  if (meters < 30) return 'Together! 💕';
  if (meters < 100) return `${Math.round(meters)}m`;
  if (meters < 1000) return `${Math.round(meters)}m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters / 1000)}km`;
};

type RootStackParamList = {
  Home: undefined;
  Pair: undefined;
  Consent: undefined;
  Memory: undefined;
  Location: undefined;
  Breakup: undefined;
  Chat: undefined;
  Calendar: undefined;
  Settings: undefined;
  Games: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, partner, consentStatus, refreshUser, refreshConsent } = useAuthStore();
  const { colors, isDark } = useTheme();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState(false);
  const [partnerLocation, setPartnerLocation] = useState<{
    latitude: number;
    longitude: number;
    sharedAt: Date;
  } | null>(null);
  const [myLocation, setMyLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [partnerPhotos, setPartnerPhotos] = useState<StreakPhoto[]>([]);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [currentStreakIndex, setCurrentStreakIndex] = useState(0);
  const [streakTimer, setStreakTimer] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [partnerCallState, setPartnerCallState] = useState<CallState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [relationshipDays, setRelationshipDays] = useState(0);
  const [isStartDateSet, setIsStartDateSet] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const [mapKey, setMapKey] = useState(0); // Force map refresh
  
  // Mood states
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [partnerMood, setPartnerMood] = useState<MoodData | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [moodMessage, setMoodMessage] = useState('');
  const [isSavingMood, setIsSavingMood] = useState(false);
  
  const MOOD_OPTIONS: { value: MoodType; emoji: string; label: string }[] = [
    { value: 'happy', emoji: '😊', label: 'Happy' },
    { value: 'excited', emoji: '🤩', label: 'Excited' },
    { value: 'calm', emoji: '😌', label: 'Calm' },
    { value: 'tired', emoji: '😴', label: 'Tired' },
    { value: 'sad', emoji: '😢', label: 'Sad' },
    { value: 'stressed', emoji: '😫', label: 'Stressed' },
    { value: 'loving', emoji: '🥰', label: 'Loving' },
    { value: 'angry', emoji: '😤', label: 'Angry' },
    { value: 'anxious', emoji: '😰', label: 'Anxious' },
    { value: 'neutral', emoji: '😐', label: 'Neutral' },
  ];
  
  // Animation for album/map flip
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Handle recenter to my location
  const handleRecenterLocation = async () => {
    if (isLocating) return;
    
    setIsLocating(true);
    Vibration.vibrate(30);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Vibration.vibrate(100);
        setIsLocating(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setMyLocation(newLocation);
      setMapCenter(newLocation); // Center map on my location
      setMapKey(prev => prev + 1); // Force map refresh
      
      // Share to backend
      try {
        await locationApi.share({
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          accuracy: location.coords.accuracy || undefined,
        });
        setIsLocationSharing(true);
      } catch (apiError) {
        console.log('API share error:', apiError);
      }
      
      Vibration.vibrate([30, 50, 30]);
    } catch (e) {
      console.log('Location error:', e);
      Vibration.vibrate([100, 50, 100]);
    } finally {
      setIsLocating(false);
    }
  };
  
  // Battery subscriptions
  const batteryLevelSub = useRef<Battery.Subscription | null>(null);
  const batteryStateSub = useRef<Battery.Subscription | null>(null);
  
  // Streak timer ref
  const streakTimerRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
    loadData();
    
    // Battery monitoring
    const setupBattery = async () => {
      await loadBattery();
      batteryLevelSub.current = Battery.addBatteryLevelListener(({ batteryLevel: level }) => {
        setBatteryLevel(Math.round(level * 100));
      });
      batteryStateSub.current = Battery.addBatteryStateListener(({ batteryState }) => {
        setIsCharging(batteryState === Battery.BatteryState.CHARGING);
      });
    };
    setupBattery();
    
    const batteryInterval = setInterval(loadBattery, 2000);
    const dataInterval = setInterval(() => {
      loadUnreadCount();
      loadLocationStatus();
      loadStreakStatus();
      loadPartnerCallStatus();
    }, 5000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        loadBattery();
        loadLocationStatus();
        loadRelationshipInfo(); // Refresh when coming back from Settings
      }
    });
    
    return () => {
      clearInterval(batteryInterval);
      clearInterval(dataInterval);
      clearInterval(timeInterval);
      appStateSubscription.remove();
      if (batteryLevelSub.current) batteryLevelSub.current.remove();
      if (batteryStateSub.current) batteryStateSub.current.remove();
      if (streakTimerRef.current) clearInterval(streakTimerRef.current);
    };
  }, []);

  // Auto-start location sharing when consent is given
  useEffect(() => {
    const autoStartLocation = async () => {
      if (consentStatus?.featureStatus?.locationSharing?.active && !isLocationSharing && user?.coupleId) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
            await locationApi.share({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy || undefined,
            });
            setIsLocationSharing(true);
            setMyLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        } catch (error) {
          console.log('Auto location start error:', error);
        }
      }
    };
    autoStartLocation();
  }, [consentStatus?.featureStatus?.locationSharing?.active, user?.coupleId]);

  // Streak modal timer - auto close after 40s or move to next
  useEffect(() => {
    if (showStreakModal) {
      setStreakTimer(0);
      streakTimerRef.current = setInterval(() => {
        setStreakTimer(prev => {
          if (prev >= 39) {
            // Mark as viewed and move to next or close
            handleStreakViewed();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (streakTimerRef.current) {
        clearInterval(streakTimerRef.current);
        streakTimerRef.current = null;
      }
      setStreakTimer(0);
    }
    return () => {
      if (streakTimerRef.current) clearInterval(streakTimerRef.current);
    };
  }, [showStreakModal, currentStreakIndex]);

  const handleStreakViewed = async () => {
    const photo = partnerPhotos[currentStreakIndex];
    if (photo) {
      try {
        await streakApi.markViewed(photo.id);
      } catch (e) {}
    }
    
    if (currentStreakIndex < partnerPhotos.length - 1) {
      setCurrentStreakIndex(prev => prev + 1);
      setStreakTimer(0);
    } else {
      setShowStreakModal(false);
      setCurrentStreakIndex(0);
      loadStreakStatus();
    }
  };

  const handleStreakTap = () => {
    // Tap to go to next photo or close
    handleStreakViewed();
  };

  const loadData = async () => {
    await refreshUser();
    await refreshConsent();
    await loadUnreadCount();
    await loadBattery();
    await loadLocationStatus();
    await loadStreakStatus();
    await loadPartnerCallStatus();
    await loadRelationshipInfo();
    await loadPartnerMood();
    await checkMoodPrompt();
  };

  const loadBattery = async () => {
    try {
      const level = await Battery.getBatteryLevelAsync();
      const state = await Battery.getBatteryStateAsync();
      setBatteryLevel(Math.round(level * 100));
      setIsCharging(state === Battery.BatteryState.CHARGING);
    } catch (error) {}
  };

  const loadUnreadCount = async () => {
    try {
      if (user?.coupleId) {
        const response = await chatApi.getUnreadCount();
        if (response.success && response.data) {
          setUnreadCount(response.data.unreadCount);
        }
      }
    } catch (error) {}
  };

  const loadLocationStatus = async () => {
    try {
      const myStatus = await locationApi.getMyStatus();
      if (myStatus.success && myStatus.data) {
        setIsLocationSharing(myStatus.data.isSharing);
        if (myStatus.data.location) {
          setMyLocation({
            latitude: myStatus.data.location.latitude,
            longitude: myStatus.data.location.longitude,
          });
        }
      }
      
      const partnerStatus = await locationApi.getPartnerLocation();
      if (partnerStatus.success && partnerStatus.data) {
        setPartnerLocation({
          ...partnerStatus.data.location,
          sharedAt: new Date(partnerStatus.data.location.sharedAt),
        });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setPartnerLocation(null);
      }
    }
  };

  const loadStreakStatus = async () => {
    try {
      const response = await streakApi.getStatus();
      if (response.success && response.data) {
        setStreak(response.data.streak || { currentStreak: 0, longestStreak: 0 });
        const photos = response.data.allPhotos?.filter(
          (p: StreakPhoto) => p.uploadedBy?.uniqueId !== user?.uniqueId && !p.isExpired && !p.viewedAt
        ).slice(0, 3) || [];
        setPartnerPhotos(photos);
      }
    } catch (error) {
      setStreak({ currentStreak: 0, longestStreak: 0 });
    }
  };

  const loadPartnerCallStatus = async () => {
    try {
      if (user?.coupleId) {
        const response = await callStatusApi.getPartner();
        if (response.success && response.data) {
          setPartnerCallState(response.data.state as CallState);
        }
      }
    } catch (error) {}
  };

  const loadRelationshipInfo = async () => {
    try {
      if (user?.coupleId) {
        const response = await coupleApi.getRelationshipInfo();
        if (response.success && response.data) {
          setRelationshipDays(response.data.daysTogether);
          setIsStartDateSet(response.data.isStartDateSet);
        }
      }
    } catch (error) {
      console.log('Load relationship info error:', error);
    }
  };

  // Mood functions
  const MOOD_STORAGE_KEY = 'last_activity_time';
  const MOOD_PROMPT_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  
  const checkMoodPrompt = async () => {
    try {
      const lastActivity = await AsyncStorage.getItem(MOOD_STORAGE_KEY);
      const now = Date.now();
      
      if (!lastActivity) {
        // First time opening - save current time and prompt for mood
        await AsyncStorage.setItem(MOOD_STORAGE_KEY, now.toString());
        if (user?.coupleId) {
          setShowMoodModal(true);
        }
        return;
      }
      
      const timeSinceLastActivity = now - parseInt(lastActivity);
      
      if (timeSinceLastActivity >= MOOD_PROMPT_INTERVAL) {
        // 6+ hours inactive - prompt for mood update
        if (user?.coupleId) {
          setShowMoodModal(true);
        }
      }
      
      // Update last activity time
      await AsyncStorage.setItem(MOOD_STORAGE_KEY, now.toString());
    } catch (error) {
      console.log('Mood prompt check error:', error);
    }
  };
  
  const loadPartnerMood = async () => {
    try {
      if (user?.coupleId) {
        const response = await moodApi.getPartnerMood();
        if (response.success && response.data?.mood) {
          setPartnerMood(response.data.mood);
        }
      }
    } catch (error) {
      console.log('Load partner mood error:', error);
    }
  };
  
  const handleSaveMood = async () => {
    if (!selectedMood) return;
    
    try {
      setIsSavingMood(true);
      await moodApi.setMood(selectedMood, moodMessage);
      setShowMoodModal(false);
      setSelectedMood(null);
      setMoodMessage('');
      Vibration.vibrate([50, 50, 50]);
    } catch (error) {
      console.log('Save mood error:', error);
    } finally {
      setIsSavingMood(false);
    }
  };
  
  const formatMoodTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Calculate distance when both locations are available
  useEffect(() => {
    if (myLocation && partnerLocation) {
      const dist = calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        partnerLocation.latitude,
        partnerLocation.longitude
      );
      setDistanceMeters(dist);
    } else {
      setDistanceMeters(null);
    }
  }, [myLocation, partnerLocation]);

  // Reload relationship info when screen gains focus (e.g., coming back from Settings)
  useFocusEffect(
    React.useCallback(() => {
      loadRelationshipInfo();
      loadLocationStatus();
    }, [])
  );

  const handleStreakPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      aspect: [1, 1],
    });
    
    if (!result.canceled && result.assets[0]) {
      try {
        await streakApi.uploadPhoto(result.assets[0].uri);
        Vibration.vibrate(100);
        loadStreakStatus();
      } catch (error) {}
    }
  };

  const openStreakPhoto = () => {
    if (partnerPhotos.length > 0) {
      setCurrentStreakIndex(0);
      setShowStreakModal(true);
    }
  };

  // Walkie-talkie: Tap to buzz
  const handleBuzz = async () => {
    Vibration.vibrate(50);
    try {
      await walkieApi.sendBuzz();
    } catch (error) {}
  };

  // Walkie-talkie: Hold to record voice
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      Vibration.vibrate(50);
    } catch (error) {
      console.log('Recording error:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        await walkieApi.sendVoiceMessage(uri, 0);
        Vibration.vibrate([50, 50, 50]);
      }
    } catch (error) {
      console.log('Stop recording error:', error);
    }
  };

  const formatLocationTime = (date: Date) => {
    const diffSeconds = Math.floor((currentTime.getTime() - date.getTime()) / 1000);
    if (diffSeconds < 60) return 'Live 🟢';
    if (diffSeconds < 300) return `${Math.floor(diffSeconds / 60)}m 🟢`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  };

  const getBatteryIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isCharging) return 'battery-charging';
    if (!batteryLevel) return 'battery-half';
    if (batteryLevel > 80) return 'battery-full';
    if (batteryLevel > 20) return 'battery-half';
    return 'battery-dead';
  };

  const getBatteryColor = () => {
    if (isCharging) return colors.success;
    if (!batteryLevel) return colors.textMuted;
    if (batteryLevel > 50) return colors.success;
    if (batteryLevel > 20) return '#FFA500';
    return colors.error;
  };

  const mapMarkers: Array<{ latitude: number; longitude: number; label: string; isMe: boolean; photoUrl?: string }> = [];
  if (myLocation && isLocationSharing) {
    mapMarkers.push({
      latitude: myLocation.latitude,
      longitude: myLocation.longitude,
      label: user?.name || 'You',
      isMe: true,
      photoUrl: getMediaUrl(user?.profilePhoto),
    });
  }
  if (partnerLocation) {
    mapMarkers.push({
      latitude: partnerLocation.latitude,
      longitude: partnerLocation.longitude,
      label: partner?.name || 'Partner',
      isMe: false,
      photoUrl: getMediaUrl(partner?.profilePhoto),
    });
  }

  // Album/Map toggle animation
  const ALBUM_SIZE = width - 80;

  const toggleToMap = () => {
    Vibration.vibrate(30);
    setShowMap(true);
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const toggleToPhoto = () => {
    Vibration.vibrate(30);
    setShowMap(false);
    Animated.timing(flipAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Animation interpolations - smoother
  const photoOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });
  
  const mapOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const photoTranslateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  const mapTranslateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  // Theme-specific colors for icons
  const iconColors = {
    calendar: isDark ? 'rgba(255,255,255,0.7)' : '#10B981',
    camera: isDark ? 'rgba(255,255,255,0.9)' : '#F59E0B',
    walkie: isDark ? 'rgba(255,255,255,0.9)' : '#8B5CF6',
    location: isDark ? 'rgba(255,255,255,0.7)' : '#3B82F6',
    games: isDark ? 'rgba(255,255,255,0.6)' : '#EC4899',
    memories: isDark ? 'rgba(255,255,255,0.6)' : '#EF4444',
    settings: isDark ? 'rgba(255,255,255,0.8)' : '#6B7280',
    header: isDark ? 'rgba(255,255,255,0.8)' : '#1F2937',
  };

  const textColors = {
    primary: isDark ? '#FFFFFF' : '#1F2937',
    secondary: isDark ? 'rgba(255,255,255,0.6)' : '#6B7280',
    muted: isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF',
  };

  const renderContent = () => (
    <View style={styles.nowPlaying}>
      {partner ? (
        <>
          {/* Top controls */}
          <View style={styles.topControls}>
            <TouchableOpacity 
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications' as never)}
            >
              <Ionicons name="notifications-outline" size={24} color={iconColors.settings} />
              {/* Notification badge - can add count here */}
            </TouchableOpacity>
            <View style={styles.nowPlayingLabel}>
              <Text style={[styles.nowPlayingFrom, { color: textColors.muted }]}>NOW PLAYING FROM</Text>
              <Text style={[styles.nowPlayingSource, { color: textColors.primary }]}>Your Heart 💕</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={24} color={iconColors.settings} />
            </TouchableOpacity>
          </View>

          {/* Album Art / Map - Toggle with iPhone-style pill */}
          <View style={styles.albumArt}>
            {/* Content Area */}
            <View style={styles.albumContent}>
              {/* Partner Photo Layer */}
              <Animated.View 
                style={[
                  styles.albumLayer,
                  { 
                    opacity: photoOpacity,
                    transform: [{ translateY: photoTranslateY }],
                    zIndex: showMap ? 1 : 2,
                    pointerEvents: showMap ? 'none' : 'auto',
                  }
                ]}
              >
                <TouchableOpacity 
                  onPress={openStreakPhoto}
                  disabled={partnerPhotos.length === 0}
                  activeOpacity={0.95}
                  style={styles.albumTouchable}
                >
                  <View style={[styles.albumFrame, partnerPhotos.length > 0 && styles.albumGlow]}>
                    {(partnerPhotos.length > 0 ? partnerPhotos[0].imagePath : partner.profilePhoto) ? (
                      <Image
                        source={{ uri: getMediaUrl(partnerPhotos.length > 0 ? partnerPhotos[0].imagePath : partner.profilePhoto) }}
                        style={styles.albumImage}
                      />
                    ) : (
                      <View style={[styles.albumPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                        <Text style={[styles.albumInitial, { color: isDark ? 'rgba(255,255,255,0.3)' : '#D1D5DB' }]}>{partner.name?.charAt(0)}</Text>
                      </View>
                    )}
                  </View>
                  {partnerPhotos.length > 0 && (
                    <View style={styles.newMoment}>
                      <Ionicons name="flame" size={14} color="#FFF" />
                      <Text style={styles.newMomentText}>New Moment</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Map Layer */}
              <Animated.View 
                style={[
                  styles.albumLayer,
                  { 
                    opacity: mapOpacity,
                    transform: [{ translateY: mapTranslateY }],
                    zIndex: showMap ? 2 : 1,
                    pointerEvents: showMap ? 'auto' : 'none',
                  }
                ]}
              >
                <View style={styles.mapContainer} pointerEvents="box-none">
                  <View style={styles.mapWebViewWrapper}>
                    <MapWebView
                      key={mapKey}
                      markers={mapMarkers}
                      center={mapCenter}
                      height={ALBUM_SIZE}
                      apiKey={GOOGLE_MAPS_API_KEY}
                      zoom={mapCenter ? 15 : (mapMarkers.length > 0 ? 13 : 4)}
                      isDark={isDark}
                    />
                  </View>
                  
                  {/* Map status label */}
                  <View style={styles.mapStatusLabel}>
                    <View style={[styles.mapStatusDot, { backgroundColor: partnerLocation ? '#22C55E' : '#9CA3AF' }]} />
                    <Text style={styles.mapStatusText}>
                      {partnerLocation 
                        ? `${partner?.name?.split(' ')[0] || 'Partner'} • ${formatLocationTime(partnerLocation.sharedAt)}` 
                        : 'Location off'}
                    </Text>
                  </View>
                </View>
                
                {/* Map Controls - Outside mapContainer for better touch handling */}
                <View style={styles.mapControlsOverlay}>
                  {/* Recenter to my location */}
                  <TouchableOpacity 
                    style={[
                      styles.mapControlBtn, 
                      { 
                        backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : '#FFFFFF',
                        opacity: isLocating ? 0.7 : 1,
                      }
                    ]}
                    onPress={handleRecenterLocation}
                    activeOpacity={0.6}
                  >
                    <Ionicons 
                      name={isLocating ? "navigate" : "locate"} 
                      size={22} 
                      color={isLocating ? '#22C55E' : (isDark ? '#FFFFFF' : '#3B82F6')} 
                    />
                  </TouchableOpacity>
                  
                  {/* Open full map */}
                  <TouchableOpacity 
                    style={[styles.mapControlBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : '#FFFFFF' }]}
                    onPress={() => navigation.navigate('Location')}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="expand" size={22} color={isDark ? '#FFFFFF' : '#3B82F6'} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
              
              {/* iPhone-style Pill Toggle */}
              <View style={styles.pillToggleContainer}>
                <View style={[styles.pillToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }]}>
                  <TouchableOpacity 
                    style={[
                      styles.pillOption,
                      !showMap && [styles.pillOptionActive, { backgroundColor: isDark ? '#FFFFFF' : '#FF6B8A' }]
                    ]}
                    onPress={toggleToPhoto}
                  >
                    <Ionicons 
                      name="person" 
                      size={16} 
                      color={!showMap ? (isDark ? '#1a1a2e' : '#FFFFFF') : (isDark ? 'rgba(255,255,255,0.5)' : '#6B7280')} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.pillOption,
                      showMap && [styles.pillOptionActive, { backgroundColor: isDark ? '#FFFFFF' : '#3B82F6' }]
                    ]}
                    onPress={toggleToMap}
                  >
                    <Ionicons 
                      name="map" 
                      size={16} 
                      color={showMap ? (isDark ? '#1a1a2e' : '#FFFFFF') : (isDark ? 'rgba(255,255,255,0.5)' : '#6B7280')} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Partner Name with Relationship Streak */}
          <View style={styles.songInfo}>
            <View style={styles.songTitleRow}>
              <Text style={[styles.songTitle, { color: textColors.primary }]}>{partner.name}</Text>
              <View style={[styles.streakFire, { backgroundColor: isDark ? 'rgba(251,191,36,0.2)' : '#FEF3C7' }]}>
                <Text style={styles.streakFireText}>🔥 {relationshipDays}</Text>
              </View>
            </View>
            {/* Partner's Mood */}
            {partnerMood && (
              <TouchableOpacity 
                style={[styles.partnerMoodBadge, { backgroundColor: isDark ? 'rgba(255,107,138,0.15)' : '#FFE4E9' }]}
                onPress={() => setShowMoodModal(true)}
              >
                <Text style={styles.partnerMoodEmoji}>{partnerMood.emoji}</Text>
                <Text style={[styles.partnerMoodText, { color: isDark ? '#FF6B8A' : '#EC4899' }]}>
                  {partnerMood.message || `Feeling ${partnerMood.mood}`}
                </Text>
                <Text style={[styles.partnerMoodTime, { color: colors.textMuted }]}>
                  • {formatMoodTime(partnerMood.createdAt)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Distance Bar - Visual representation of distance */}
          {(() => {
            // Calculate dynamic spacing based on distance
            const isTogether = distanceMeters !== null && distanceMeters < 30;
            const isClose = distanceMeters !== null && distanceMeters < 100;
            const isMedium = distanceMeters !== null && distanceMeters < 1000;
            
            // Gap between photos (smaller = closer together)
            const photoGap = distanceMeters === null ? 100 
              : isTogether ? 8 
              : isClose ? 30 
              : isMedium ? 60 
              : 100;
            
            return (
              <View style={styles.distanceBarArea}>
                {/* Photos Container */}
                <View style={[styles.distancePhotosRow, { gap: photoGap }]}>
                  {/* My Photo */}
                  <View style={styles.distancePhotoWrapper}>
                    <View style={[
                      styles.distancePhoto,
                      { 
                        borderColor: isTogether ? '#22C55E' : (isDark ? '#4ADE80' : '#22C55E'),
                        borderWidth: isTogether ? 4 : 3,
                      }
                    ]}>
                      {user?.profilePhoto ? (
                        <Image 
                          source={{ uri: getMediaUrl(user.profilePhoto) }} 
                          style={styles.distancePhotoImage}
                        />
                      ) : (
                        <View style={[styles.distancePhotoPlaceholder, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                          <Text style={[styles.distancePhotoInitial, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            {user?.name?.charAt(0) || 'M'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Connecting Line (only show when not together) */}
                  {!isTogether && distanceMeters !== null && (
                    <View style={[
                      styles.distanceConnectLine,
                      { 
                        backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : '#D1D5DB',
                        width: photoGap - 16,
                      }
                    ]} />
                  )}

                  {/* Heart when together */}
                  {isTogether && (
                    <View style={styles.togetherHeart}>
                      <Text style={{ fontSize: 20 }}>💕</Text>
                    </View>
                  )}

                  {/* Partner Photo */}
                  <View style={styles.distancePhotoWrapper}>
                    <View style={[
                      styles.distancePhoto,
                      { 
                        borderColor: isTogether ? '#22C55E' : (isDark ? '#FF6B8A' : '#EC4899'),
                        borderWidth: isTogether ? 4 : 3,
                      }
                    ]}>
                      {partner?.profilePhoto ? (
                        <Image 
                          source={{ uri: getMediaUrl(partner.profilePhoto) }} 
                          style={styles.distancePhotoImage}
                        />
                      ) : (
                        <View style={[styles.distancePhotoPlaceholder, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                          <Text style={[styles.distancePhotoInitial, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                            {partner?.name?.charAt(0) || 'P'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Distance Label Below - only show when not together */}
                {distanceMeters !== null && !isTogether && (
                  <View style={styles.distanceLabelRow}>
                    <Text style={[
                      styles.distanceText,
                      { color: isDark ? 'rgba(255,255,255,0.7)' : '#6B7280' }
                    ]}>
                      {formatDistance(distanceMeters)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Playback Controls = Actions */}
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.controlBtn}
              onPress={() => navigation.navigate('Calendar')}
            >
              <Ionicons name="calendar" size={26} color={iconColors.calendar} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlBtn}
              onPress={handleStreakPhoto}
            >
              <Ionicons name="camera" size={28} color={iconColors.camera} />
            </TouchableOpacity>
            
            {/* Main Play = Chat */}
            <TouchableOpacity 
              style={[styles.playButton, { backgroundColor: isDark ? '#FFFFFF' : '#FF6B8A' }]}
              onPress={() => navigation.navigate('Chat')}
            >
              <Ionicons name="chatbubble" size={32} color={isDark ? '#1a1a2e' : '#FFFFFF'} />
              {unreadCount > 0 && (
                <View style={styles.unreadDot}>
                  <Text style={styles.unreadNum}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlBtn, isRecording && styles.controlBtnActive]}
              onPress={handleBuzz}
              onLongPress={startRecording}
              onPressOut={isRecording ? stopRecording : undefined}
              delayLongPress={300}
            >
              <Ionicons name={isRecording ? "mic" : "radio"} size={28} color={isRecording ? "#FF6B6B" : iconColors.walkie} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlBtn}
              onPress={() => navigation.navigate('Location')}
            >
              <Ionicons name="location" size={26} color={iconColors.location} />
            </TouchableOpacity>
          </View>

          {/* Bottom extras */}
          <View style={styles.bottomExtras}>
            <TouchableOpacity 
              style={styles.extraBtn}
              onPress={() => navigation.navigate('Games')}
            >
              <Ionicons name="game-controller" size={22} color={iconColors.games} />
              <Text style={[styles.extraLabel, { color: textColors.muted }]}>Enjoy</Text>
            </TouchableOpacity>
            
            <View style={styles.deviceInfo}>
              <View style={styles.liveDot} />
              <Text style={[styles.deviceText, { color: textColors.muted }]}>
                {batteryLevel}%{isCharging && ' ⚡'} • Active
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.extraBtn}
              onPress={() => navigation.navigate('Memory')}
            >
              <Ionicons name="heart" size={22} color={iconColors.memories} />
              <Text style={[styles.extraLabel, { color: textColors.muted }]}>Memories</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* ===== NOT CONNECTED ===== */
        <>
          <View style={styles.topControls}>
            <View style={{ width: 28 }} />
            <Text style={[styles.appName, { color: textColors.primary }]}>Codex</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={24} color={iconColors.settings} />
            </TouchableOpacity>
          </View>

          <View style={styles.emptyState}>
            <View style={[styles.emptyAlbum, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
              <Text style={styles.emptyEmoji}>💕</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: textColors.primary }]}>No One Playing</Text>
            <Text style={[styles.emptySubtitle, { color: textColors.secondary }]}>Connect with someone special</Text>
            
            <View style={styles.codeDisplay}>
              <Text style={[styles.codeLabel, { color: textColors.muted }]}>YOUR CODE</Text>
              <Text style={[styles.codeText, { color: isDark ? '#FFFFFF' : '#FF6B8A' }]}>{user?.uniqueId}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.connectBtn, { backgroundColor: isDark ? '#FFFFFF' : '#FF6B8A' }]}
              onPress={() => navigation.navigate('Pair')}
            >
              <Text style={[styles.connectBtnText, { color: isDark ? '#1a1a2e' : '#FFFFFF' }]}>Find Your Person</Text>
              <Ionicons name="heart" size={20} color={isDark ? '#1a1a2e' : '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f0f23' : '#FFFFFF' }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      <View style={styles.mainContent}>
        {isDark ? (
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f0f23']}
            style={styles.fullBg}
          >
            {renderContent()}
          </LinearGradient>
        ) : (
          <View style={[styles.fullBg, { backgroundColor: '#FFFFFF' }]}>
            {renderContent()}
          </View>
        )}
      </View>

      {/* Streak Photo Modal - Instagram Story Style */}
      <Modal
        visible={showStreakModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStreakModal(false)}
      >
        <View style={styles.storyModal}>
          {/* Progress bars */}
          <View style={styles.storyProgressContainer}>
            {partnerPhotos.map((_, i) => (
              <View key={i} style={styles.storyProgressTrack}>
                <Animated.View 
                  style={[
                    styles.storyProgressFill,
                    { 
                      width: i < currentStreakIndex 
                        ? '100%' 
                        : i === currentStreakIndex 
                          ? `${(streakTimer / 40) * 100}%`
                          : '0%'
                    }
                  ]} 
                />
              </View>
            ))}
          </View>
          
          {/* Header */}
          <View style={styles.storyHeader}>
            <View style={styles.storyUserInfo}>
              {partner?.profilePhoto ? (
                <Image
                  source={{ uri: getMediaUrl(partner.profilePhoto) }}
                  style={styles.storyAvatar}
                />
              ) : (
                <View style={styles.storyAvatarPlaceholder}>
                  <Ionicons name="person" size={16} color={colors.primary} />
                </View>
              )}
              <Text style={styles.storyUsername}>{partner?.name}</Text>
              <Text style={styles.storyTime}>🔥 Moment</Text>
            </View>
            <TouchableOpacity onPress={() => setShowStreakModal(false)}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* Story Image - Tap to advance */}
          <TouchableWithoutFeedback onPress={handleStreakTap}>
            <View style={styles.storyImageContainer}>
              {partnerPhotos[currentStreakIndex] && (
                <Image
                  source={{ uri: getMediaUrl(partnerPhotos[currentStreakIndex].imagePath) }}
                  style={styles.storyImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableWithoutFeedback>
          
          {/* Timer indicator */}
          <View style={styles.storyTimer}>
            <Text style={styles.storyTimerText}>
              {40 - streakTimer}s
            </Text>
          </View>
        </View>
      </Modal>

      {/* Mood Selection Modal */}
      <Modal
        visible={showMoodModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoodModal(false)}
      >
        <View style={styles.moodModalOverlay}>
          <View style={[styles.moodModalContent, { backgroundColor: isDark ? '#1a1a2e' : '#FFFFFF' }]}>
            <View style={styles.moodModalHeader}>
              <Text style={[styles.moodModalTitle, { color: colors.text }]}>How are you feeling?</Text>
              <TouchableOpacity onPress={() => setShowMoodModal(false)}>
                <Text style={[styles.moodModalSkip, { color: colors.textMuted }]}>Skip</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.moodModalSubtitle, { color: colors.textMuted }]}>
              Share your mood with {partner?.name || 'your partner'}
            </Text>
            
            <View style={styles.moodGrid}>
              {MOOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.moodOption,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' },
                    selectedMood === option.value && { 
                      backgroundColor: isDark ? 'rgba(255,107,138,0.2)' : '#FFE4E9',
                      borderWidth: 2,
                      borderColor: '#FF6B8A',
                    },
                  ]}
                  onPress={() => setSelectedMood(option.value)}
                >
                  <Text style={styles.moodEmoji}>{option.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: colors.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {selectedMood && (
              <View style={styles.moodMessageContainer}>
                <TextInput
                  style={[styles.moodMessageInput, { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                    color: colors.text,
                  }]}
                  placeholder="Add a short note (optional)"
                  placeholderTextColor={colors.textMuted}
                  value={moodMessage}
                  onChangeText={setMoodMessage}
                  maxLength={100}
                />
              </View>
            )}
            
            <TouchableOpacity
              style={[
                styles.moodSaveBtn,
                !selectedMood && styles.moodSaveBtnDisabled,
              ]}
              onPress={handleSaveMood}
              disabled={!selectedMood || isSavingMood}
            >
              <Text style={styles.moodSaveBtnText}>
                {isSavingMood ? 'Sharing...' : 'Share Mood'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mainContent: {
    flex: 1,
  },
  fullBg: {
    flex: 1,
  },


  // ===== NOW PLAYING DESIGN =====
  nowPlaying: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Top Controls
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 20,
  },
  nowPlayingLabel: {
    alignItems: 'center',
  },
  nowPlayingFrom: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
  },
  nowPlayingSource: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },

  // Album Art / Map Toggle
  albumArt: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  
  // Album Content Area
  albumContent: {
    width: width - 80,
    height: width - 80 + 50, // Extra for moment badge + pill
    position: 'relative',
  },
  
  // iPhone-style Pill Toggle
  pillToggleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pillToggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 20,
    gap: 4,
  },
  pillOption: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOptionActive: {
    // Background set dynamically
  },
  
  // Notification button
  notificationBtn: {
    position: 'relative',
  },
  albumLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  albumTouchable: {
    alignItems: 'center',
  },
  albumFrame: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  albumGlow: {
    shadowColor: '#FBBF24',
    shadowOpacity: 0.5,
  },
  albumImage: {
    width: width - 80,
    height: width - 80,
    borderRadius: 16,
  },
  albumPlaceholder: {
    width: width - 80,
    height: width - 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumInitial: {
    fontSize: 100,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.3)',
  },
  newMoment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(251,191,36,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  newMomentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  
  // Map Container
  mapContainer: {
    width: width - 80,
    height: width - 80,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  
  // Map Controls
  mapWebViewWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapControlsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
    zIndex: 999,
    elevation: 999,
  },
  mapControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
  },
  
  // Map Status Label
  mapStatusLabel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mapStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Song Info
  songInfo: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  songTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  songTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  streakFire: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakFireText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FBBF24',
  },
  artistName: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },

  // Distance Bar Styles
  distanceBarArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  distancePhotosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distancePhotoWrapper: {
    alignItems: 'center',
  },
  distancePhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  distancePhotoImage: {
    width: '100%',
    height: '100%',
  },
  distancePhotoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distancePhotoInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  distanceConnectLine: {
    height: 3,
    borderRadius: 1.5,
    position: 'absolute',
    left: '50%',
    marginLeft: -40,
    zIndex: -1,
  },
  togetherHeart: {
    position: 'absolute',
    zIndex: 10,
  },
  distanceLabelRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Playback Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 32,
  },
  controlBtn: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,107,107,0.2)',
    borderRadius: 25,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadNum: {
    fontSize: 12,
    fontWeight: '800',
    color: 'white',
  },

  // Bottom Extras
  bottomExtras: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  extraBtn: {
    alignItems: 'center',
    gap: 4,
  },
  extraLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  deviceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },


  // ===== NOT CONNECTED =====
  notConnected: {
    flex: 1,
    paddingHorizontal: 24,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAlbum: {
    width: 180,
    height: 180,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  emptyEmoji: {
    fontSize: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 40,
  },
  codeDisplay: {
    alignItems: 'center',
    marginBottom: 32,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 6,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
  },
  connectBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },

  // ===== STORY MODAL =====
  storyModal: {
    flex: 1,
    backgroundColor: 'black',
  },
  storyProgressContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.md,
    gap: 4,
  },
  storyProgressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: 'white',
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  storyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  storyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'white',
  },
  storyAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: staticColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyUsername: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: 'white',
  },
  storyTime: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  storyImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: width,
    height: width,
  },
  storyTimer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  storyTimerText: {
    color: 'white',
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },

  // ===== PARTNER MOOD BADGE =====
  partnerMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  partnerMoodEmoji: {
    fontSize: 16,
  },
  partnerMoodText: {
    fontSize: 13,
    fontWeight: '500',
  },
  partnerMoodTime: {
    fontSize: 11,
  },

  // ===== MOOD MODAL =====
  moodModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  moodModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    ...shadows.lg,
  },
  moodModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodModalTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  moodModalSkip: {
    fontSize: 14,
    fontWeight: '500',
  },
  moodModalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  moodOption: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  moodMessageContainer: {
    marginTop: 16,
  },
  moodMessageInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 44,
  },
  moodSaveBtn: {
    backgroundColor: '#FF6B8A',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  moodSaveBtnDisabled: {
    opacity: 0.5,
  },
  moodSaveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default HomeScreen;
