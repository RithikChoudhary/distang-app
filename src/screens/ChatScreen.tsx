import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  Image,
  Vibration,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { chatApi, questionApi, API_BASE_URL, getMediaUrl, QuestionPrompt, QuestionAnswer as QAType } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { ChatMessage } from '../types';
import { colors as staticColors, typography, spacing, borderRadius, shadows } from '../utils/theme';
import { useTheme } from '../hooks/useTheme';

const { width, height } = Dimensions.get('window');
const BUBBLE_MAX_WIDTH = width * 0.78;

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, partner } = useAuthStore();
  const { colors, isDark } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // Question prompt states
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPrompt | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<QAType[]>([]);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QAType | null>(null);
  const [myAnswer, setMyAnswer] = useState('');
  
  // Questions history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [questionsHistory, setQuestionsHistory] = useState<QAType[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMessages();
    markMessagesAsRead();
    loadPendingQuestions();
    
    const interval = setInterval(() => {
      loadMessages(true);
      loadPendingQuestions();
    }, 3000);
    
    return () => {
      clearInterval(interval);
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      if (sound) sound.unloadAsync();
    };
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const loadMessages = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await chatApi.getMessages(1, 100);
      if (response.success && response.data) {
        // Don't reverse here - FlatList with inverted will handle ordering
        setMessages(response.data.messages);
      }
    } catch (error: any) {
      if (!silent) console.log('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await chatApi.markAsRead();
    } catch (error) {}
  };

  const loadPendingQuestions = async () => {
    try {
      const response = await questionApi.getPending();
      if (response.success && response.data) {
        setPendingQuestions(response.data.questions);
      }
    } catch (error) {}
  };

  const loadQuestionsHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await questionApi.getHistory(1, 50);
      if (response.success && response.data) {
        setQuestionsHistory(response.data.questions);
      }
    } catch (error) {
      console.log('Failed to load questions history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    setShowHistoryModal(true);
    loadQuestionsHistory();
  };

  const handleSend = async (text?: string) => {
    const messageText = (text || inputText).trim();
    if (!messageText) return;
    
    setInputText('');
    
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChatMessage = {
      id: tempId,
      senderId: { uniqueId: user?.uniqueId || '', name: user?.name || '' },
      message: messageText,
      messageType: 'text',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempMessage]);
    // With inverted FlatList, scrollToOffset(0) scrolls to the newest message
    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
    
    try {
      setIsSending(true);
      const response = await chatApi.sendMessage(messageText);
      if (response.success && response.data) {
        setMessages(prev => prev.map(m => m.id === tempId ? response.data!.message : m));
      }
    } catch (error: any) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert('Error', 'Failed to send message');
      setInputText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  const sendQuickReaction = (emoji: string) => {
    handleSend(emoji);
    setShowReactions(false);
    Vibration.vibrate(30);
  };

  // Photo sharing - NO cropping, full photo
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // No cropping
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      try {
        const response = await chatApi.sendImage(result.assets[0].uri);
        if (response.success) {
          loadMessages(true);
          Vibration.vibrate(50);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to send image');
      }
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false, // No cropping
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      try {
        const response = await chatApi.sendImage(result.assets[0].uri);
        if (response.success) {
          loadMessages(true);
          Vibration.vibrate(50);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to send photo');
      }
    }
  };

  // Voice recording
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
      setRecordingDuration(0);
      Vibration.vibrate(50);
      
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.log('Recording error:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      const duration = recordingDuration;
      setRecordingDuration(0);
      
      if (uri && duration > 0) {
        // Send voice message to chat (not walkie)
        const response = await chatApi.sendVoice(uri, duration);
        if (response.success) {
          loadMessages(true);
          Vibration.vibrate([50, 50, 50]);
        }
      }
    } catch (error) {
      console.log('Stop recording error:', error);
      Alert.alert('Error', 'Failed to send voice message');
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {}
  };

  // Audio playback
  const playVoiceMessage = async (audioPath: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: getMediaUrl(audioPath) || '' },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setPlayingAudio(audioPath);
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingAudio(null);
        }
      });
    } catch (error) {
      console.log('Playback error:', error);
      Alert.alert('Error', 'Could not play voice message');
    }
  };

  // Question prompts
  const getRandomQuestion = async () => {
    setIsLoadingQuestion(true);
    try {
      const response = await questionApi.getRandom();
      if (response.success && response.data) {
        setCurrentQuestion(response.data.question);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not load question');
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const askQuestion = async () => {
    if (!currentQuestion) return;
    
    try {
      const response = await questionApi.ask(currentQuestion.id, currentQuestion.text);
      if (response.success) {
        handleSend(`❓ ${currentQuestion.emoji} ${currentQuestion.text}`);
        setShowQuestionModal(false);
        setCurrentQuestion(null);
        Vibration.vibrate(100);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not send question');
    }
  };

  const submitAnswer = async () => {
    if (!selectedQuestion || !myAnswer.trim()) return;
    
    try {
      const response = await questionApi.answer(selectedQuestion.id, myAnswer.trim());
      if (response.success) {
        handleSend(`💬 Answered: "${myAnswer.trim()}"`);
        setShowAnswerModal(false);
        setSelectedQuestion(null);
        setMyAnswer('');
        loadPendingQuestions();
        Vibration.vibrate(100);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Could not submit answer');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shouldShowDate = (index: number) => {
    if (index === 0) return true;
    const curr = new Date(messages[index].createdAt).toDateString();
    const prev = new Date(messages[index - 1].createdAt).toDateString();
    return curr !== prev;
  };

  const isLastInGroup = (index: number) => {
    if (index === messages.length - 1) return true;
    return messages[index].senderId.uniqueId !== messages[index + 1].senderId.uniqueId;
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId.uniqueId === user?.uniqueId;
    const showDate = shouldShowDate(index);
    const lastInGroup = isLastInGroup(index);
    const isTemp = item.id.startsWith('temp-');
    const isQuestion = item.message.startsWith('❓');
    const isImage = item.messageType === 'image' || item.message.startsWith('/uploads/chat/');
    const isVoice = item.messageType === 'voice';
    
    // Parse voice message data
    const getVoiceData = () => {
      try {
        const data = JSON.parse(item.message);
        return { path: data.path, duration: data.duration || 0 };
      } catch {
        return { path: '', duration: 0 };
      }
    };
    
    const renderContent = () => {
      // Image message
      if (isImage) {
        const imagePath = item.message.startsWith('/uploads') ? item.message : item.message;
        return (
          <TouchableOpacity onPress={() => {/* TODO: Full screen view */}}>
            <Image 
              source={{ uri: getMediaUrl(imagePath) }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );
      }
      
      // Voice message - actually playable
      if (isVoice) {
        const voiceData = getVoiceData();
        const isPlaying = playingAudio === voiceData.path;
        
        return (
          <TouchableOpacity 
            style={styles.voiceBubble}
            onPress={() => {
              if (voiceData.path) {
                if (isPlaying) {
                  // Stop playing
                  if (sound) {
                    sound.stopAsync();
                    setPlayingAudio(null);
                  }
                } else {
                  // Play voice message
                  playVoiceMessage(voiceData.path);
                }
              }
            }}
          >
            <Ionicons 
              name={isPlaying ? "pause" : "play"} 
              size={20} 
              color={isMe ? 'white' : colors.primary} 
            />
            <View style={styles.voiceWaves}>
              {[1,2,3,4,5,6,7].map((i) => (
                <View 
                  key={i} 
                  style={[
                    styles.voiceWave, 
                    { height: 8 + Math.random() * 12, backgroundColor: isMe ? 'rgba(255,255,255,0.7)' : colors.primary }
                  ]} 
                />
              ))}
            </View>
            <Text style={[styles.voiceDuration, { color: isMe ? 'white' : colors.textSecondary }]}>
              {formatDuration(voiceData.duration)}
            </Text>
          </TouchableOpacity>
        );
      }
      
      // Regular text message
      return (
        <Text style={[
          styles.messageText, 
          isMe ? styles.textMe : [styles.textPartner, { color: colors.text }],
          isQuestion && styles.textQuestion,
        ]}>
          {item.message}
        </Text>
      );
    };
    
    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <View style={styles.datePill}>
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          isMe ? styles.messageContainerMe : styles.messageContainerPartner,
        ]}>
          <View style={[
            styles.bubble,
            isMe ? styles.bubbleMe : [styles.bubblePartner, { backgroundColor: colors.bubblePartner }],
            isMe && lastInGroup && styles.bubbleMeTail,
            !isMe && lastInGroup && styles.bubblePartnerTail,
            isTemp && styles.bubbleSending,
            isQuestion && styles.bubbleQuestion,
            isImage && styles.bubbleImage,
          ]}>
            {renderContent()}
          </View>
          
          {lastInGroup && (
            <View style={[styles.meta, isMe ? styles.metaMe : styles.metaPartner]}>
              <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
              {isMe && (
                <View style={styles.readStatus}>
                  {isTemp ? (
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  ) : item.isRead ? (
                    <Ionicons name="checkmark-done" size={14} color="#34B7F1" />
                  ) : (
                    <Ionicons name="checkmark" size={14} color={colors.textMuted} />
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryLight }]}>
        <Text style={styles.emptyEmoji}>💬</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Say hi to {partner?.name}! Start a conversation 💕
      </Text>
      
      <View style={styles.starterContainer}>
        <Text style={[styles.starterLabel, { color: colors.textMuted }]}>Quick starters:</Text>
        <View style={styles.starterButtons}>
          {['Hey! 👋', 'Miss you ❤️', 'Good morning ☀️'].map((starter, i) => (
            <TouchableOpacity 
              key={i}
              style={[styles.starterBtn, { backgroundColor: colors.primaryLight }]}
              onPress={() => handleSend(starter)}
            >
              <Text style={[styles.starterBtnText, { color: colors.primary }]}>{starter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  // Theme-specific colors (matching HomeScreen)
  const iconColors = {
    back: isDark ? 'rgba(255,255,255,0.8)' : '#6B7280',
    photo: isDark ? 'rgba(255,255,255,0.9)' : '#3B82F6',
    question: isDark ? 'rgba(255,255,255,0.9)' : '#8B5CF6',
    emoji: isDark ? 'rgba(255,255,255,0.6)' : '#F59E0B',
    mic: isDark ? 'rgba(255,255,255,0.9)' : '#EC4899',
    send: '#FFFFFF',
  };

  const textColors = {
    primary: isDark ? '#FFFFFF' : '#1F2937',
    secondary: isDark ? 'rgba(255,255,255,0.6)' : '#6B7280',
    muted: isDark ? 'rgba(255,255,255,0.4)' : '#9CA3AF',
  };

  if (!user?.coupleId || !partner) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0f0f23' : '#FFFFFF' }]}>
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 48 }}>💔</Text>
          <Text style={[styles.emptyTitle, { color: textColors.primary }]}>Not Connected</Text>
          <Text style={[styles.emptySubtitle, { color: textColors.secondary }]}>Connect with your partner first</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
        <Ionicons name="chevron-back" size={26} color={iconColors.back} />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.headerCenter} onPress={handleOpenHistory}>
        {/* Musical theme: "Now Chatting" */}
        <View style={styles.nowChatting}>
          <Text style={[styles.nowChattingLabel, { color: textColors.muted }]}>NOW CHATTING</Text>
          <View style={styles.headerNameRow}>
            {partner.profilePhoto ? (
              <Image
                source={{ uri: getMediaUrl(partner.profilePhoto) }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={[styles.headerAvatarPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                <Text style={[styles.headerAvatarInitial, { color: textColors.secondary }]}>
                  {partner.name?.charAt(0)}
                </Text>
              </View>
            )}
            <Text style={[styles.headerName, { color: textColors.primary }]}>{partner.name}</Text>
            <Ionicons name="chevron-down" size={14} color={textColors.muted} />
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Pending questions indicator */}
      {pendingQuestions.length > 0 && (
        <TouchableOpacity 
          style={[styles.pendingBtn, { backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : '#EDE9FE' }]}
          onPress={() => {
            setSelectedQuestion(pendingQuestions[0]);
            setShowAnswerModal(true);
          }}
        >
          <Text style={[styles.pendingBtnText, { color: '#8B5CF6' }]}>❓ {pendingQuestions.length}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0f0f23' : '#FFFFFF' }]}>
      {isDark ? (
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f0f23']}
          style={styles.gradientBg}
        >
          <SafeAreaView style={styles.safeArea}>
            {renderHeader()}
        
            <KeyboardAvoidingView
              style={styles.keyboardView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <View style={[styles.chatBackground, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB' }]}>
                {isLoading && messages.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={isDark ? '#FF6B8A' : '#FF6B8A'} />
                  </View>
                ) : (
                  <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    ListEmptyComponent={renderEmpty}
                    inverted
                    contentContainerStyle={[
                      styles.messagesList,
                      messages.length === 0 && styles.messagesListEmpty,
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="interactive"
                    keyboardShouldPersistTaps="handled"
                  />
                )}
              </View>

              {/* Quick Reactions */}
              {showReactions && (
                <View style={[styles.reactionsBar, { backgroundColor: isDark ? '#1a1a2e' : '#FFFFFF' }]}>
                  {QUICK_REACTIONS.map((emoji, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.reactionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}
                      onPress={() => sendQuickReaction(emoji)}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Recording Overlay */}
              {isRecording && (
                <View style={[styles.recordingBar, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2' }]}>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={[styles.recordingTime, { color: '#EF4444' }]}>{formatDuration(recordingDuration)}</Text>
                  </View>
                  <Text style={[styles.recordingText, { color: textColors.secondary }]}>Recording... Release to send</Text>
                  <TouchableOpacity onPress={cancelRecording}>
                    <Ionicons name="close-circle" size={28} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Input Area */}
              <View style={[styles.inputArea, { backgroundColor: isDark ? '#1a1a2e' : '#FFFFFF', borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]}>
                <View style={styles.inputRow}>
                  {/* Photo button */}
                  <TouchableOpacity 
                    style={styles.inputIconBtn}
                    onPress={pickImage}
                    onLongPress={takePhoto}
                  >
                    <Ionicons name="image" size={24} color={iconColors.photo} />
                  </TouchableOpacity>
                  
                  {/* Question prompt button */}
                  <TouchableOpacity 
                    style={styles.inputIconBtn}
                    onPress={() => {
                      setShowQuestionModal(true);
                      getRandomQuestion();
                    }}
                  >
                    <Ionicons name="help-circle" size={26} color={iconColors.question} />
                  </TouchableOpacity>
                  
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                    <TextInput
                      style={[styles.input, { color: textColors.primary }]}
                      placeholder="Type a message..."
                      placeholderTextColor={textColors.muted}
                      value={inputText}
                      onChangeText={setInputText}
                      multiline
                      maxLength={2000}
                    />
                    <TouchableOpacity 
                      onPress={() => setShowReactions(!showReactions)}
                      style={styles.emojiBtn}
                    >
                      <Ionicons 
                        name={showReactions ? "close" : "happy-outline"} 
                        size={22} 
                        color={iconColors.emoji} 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {inputText.trim() ? (
                    <TouchableOpacity
                      style={[styles.sendBtn, { backgroundColor: '#FF6B8A' }]}
                      onPress={() => handleSend()}
                      disabled={isSending}
                    >
                      <Ionicons name="send" size={20} color="white" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.micBtn, { backgroundColor: isDark ? 'rgba(236,72,153,0.2)' : '#FCE7F3' }, isRecording && styles.micBtnRecording]}
                      onPressIn={startRecording}
                      onPressOut={stopRecording}
                    >
                      <Ionicons 
                        name="mic" 
                        size={22} 
                        color={isRecording ? 'white' : iconColors.mic} 
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </LinearGradient>
      ) : (
        <SafeAreaView style={styles.safeArea}>
          {renderHeader()}
          
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={[styles.chatBackground, { backgroundColor: '#F9FAFB' }]}>
              {isLoading && messages.length === 0 ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF6B8A" />
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  renderItem={renderMessage}
                  ListEmptyComponent={renderEmpty}
                  inverted
                  contentContainerStyle={[
                    styles.messagesList,
                    messages.length === 0 && styles.messagesListEmpty,
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </View>

            {/* Quick Reactions */}
            {showReactions && (
              <View style={[styles.reactionsBar, { backgroundColor: '#FFFFFF' }]}>
                {QUICK_REACTIONS.map((emoji, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.reactionBtn, { backgroundColor: '#F3F4F6' }]}
                    onPress={() => sendQuickReaction(emoji)}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recording Overlay */}
            {isRecording && (
              <View style={[styles.recordingBar, { backgroundColor: '#FEE2E2' }]}>
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={[styles.recordingTime, { color: '#EF4444' }]}>{formatDuration(recordingDuration)}</Text>
                </View>
                <Text style={[styles.recordingText, { color: '#6B7280' }]}>Recording... Release to send</Text>
                <TouchableOpacity onPress={cancelRecording}>
                  <Ionicons name="close-circle" size={28} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* Input Area */}
            <View style={[styles.inputArea, { backgroundColor: '#FFFFFF', borderTopColor: '#E5E7EB' }]}>
              <View style={styles.inputRow}>
                {/* Photo button */}
                <TouchableOpacity 
                  style={styles.inputIconBtn}
                  onPress={pickImage}
                  onLongPress={takePhoto}
                >
                  <Ionicons name="image" size={24} color="#3B82F6" />
                </TouchableOpacity>
                
                {/* Question prompt button */}
                <TouchableOpacity 
                  style={styles.inputIconBtn}
                  onPress={() => {
                    setShowQuestionModal(true);
                    getRandomQuestion();
                  }}
                >
                  <Ionicons name="help-circle" size={26} color="#8B5CF6" />
                </TouchableOpacity>
                
                <View style={[styles.inputContainer, { backgroundColor: '#F3F4F6' }]}>
                  <TextInput
                    style={[styles.input, { color: '#1F2937' }]}
                    placeholder="Type a message..."
                    placeholderTextColor="#9CA3AF"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={2000}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowReactions(!showReactions)}
                    style={styles.emojiBtn}
                  >
                    <Ionicons 
                      name={showReactions ? "close" : "happy-outline"} 
                      size={22} 
                      color="#F59E0B" 
                    />
                  </TouchableOpacity>
                </View>
                
                {inputText.trim() ? (
                  <TouchableOpacity
                    style={[styles.sendBtn, { backgroundColor: '#FF6B8A' }]}
                    onPress={() => handleSend()}
                    disabled={isSending}
                  >
                    <Ionicons name="send" size={20} color="white" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.micBtn, { backgroundColor: '#FCE7F3' }, isRecording && styles.micBtnRecording]}
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                  >
                    <Ionicons 
                      name="mic" 
                      size={22} 
                      color={isRecording ? 'white' : '#EC4899'} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}

      {/* Question Prompt Modal */}
      <Modal
        visible={showQuestionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuestionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.questionModal}>
            <View style={styles.questionModalHeader}>
              <Text style={styles.questionModalTitle}>Ask a Question 💭</Text>
              <TouchableOpacity onPress={() => setShowQuestionModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {isLoadingQuestion ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
            ) : currentQuestion ? (
              <View style={styles.questionCard}>
                <Text style={styles.questionEmoji}>{currentQuestion.emoji}</Text>
                <Text style={styles.questionText}>{currentQuestion.text}</Text>
                <Text style={styles.questionCategory}>{currentQuestion.category}</Text>
              </View>
            ) : null}
            
            <View style={styles.questionActions}>
              <TouchableOpacity 
                style={styles.shuffleBtn}
                onPress={getRandomQuestion}
              >
                <Ionicons name="shuffle" size={20} color={colors.primary} />
                <Text style={styles.shuffleBtnText}>Another</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.askBtn}
                onPress={askQuestion}
                disabled={!currentQuestion}
              >
                <Text style={styles.askBtnText}>Ask Partner</Text>
                <Ionicons name="send" size={18} color="white" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.questionHint}>
              Both of you will answer this question!
            </Text>
          </View>
        </View>
      </Modal>

      {/* Answer Question Modal */}
      <Modal
        visible={showAnswerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnswerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.answerModal}>
                <View style={styles.questionModalHeader}>
                  <Text style={styles.questionModalTitle}>Your Turn! 💬</Text>
                  <TouchableOpacity onPress={() => setShowAnswerModal(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                {selectedQuestion && (
                  <>
                    <View style={styles.questionCard}>
                      <Text style={styles.questionText}>{selectedQuestion.questionText}</Text>
                    </View>
                    
                    {selectedQuestion.answers.length > 0 && (
                      <View style={styles.partnerAnswerCard}>
                        <Text style={styles.partnerAnswerLabel}>
                          {selectedQuestion.answers[0].name}'s answer:
                        </Text>
                        <Text style={styles.partnerAnswerText}>
                          "{selectedQuestion.answers[0].answer}"
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.myAnswerSection}>
                      <Text style={styles.myAnswerLabel}>Your answer:</Text>
                      <TextInput
                        style={styles.answerInput}
                        placeholder="Type your answer..."
                        placeholderTextColor={colors.textMuted}
                        value={myAnswer}
                        onChangeText={setMyAnswer}
                        multiline
                        maxLength={500}
                      />
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.submitBtn, !myAnswer.trim() && styles.submitBtnDisabled]}
                      onPress={submitAnswer}
                      disabled={!myAnswer.trim()}
                    >
                      <Text style={styles.submitBtnText}>Submit Answer</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Questions History Modal */}
      <Modal
        visible={showHistoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.historyModalContent, { backgroundColor: isDark ? '#1a1a2e' : '#FFFFFF' }]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: textColors.primary }]}>💬 Our Questions</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color={textColors.secondary} />
              </TouchableOpacity>
            </View>
            
            {isLoadingHistory ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="large" color="#FF6B8A" />
              </View>
            ) : questionsHistory.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Text style={{ fontSize: 48 }}>💭</Text>
                <Text style={[styles.historyEmptyText, { color: textColors.secondary }]}>
                  No questions answered yet
                </Text>
                <Text style={[styles.historyEmptySubtext, { color: textColors.muted }]}>
                  Start a conversation with the ❓ button!
                </Text>
              </View>
            ) : (
              <FlatList
                data={questionsHistory}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.historyList}
                renderItem={({ item }) => (
                  <View style={[styles.historyCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB' }]}>
                    <Text style={[styles.historyQuestion, { color: textColors.primary }]}>
                      {item.questionText}
                    </Text>
                    <Text style={[styles.historyDate, { color: textColors.muted }]}>
                      {new Date(item.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                    <View style={styles.historyAnswers}>
                      {item.answers.map((ans, idx) => (
                        <View key={idx} style={[
                          styles.historyAnswerItem,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }
                        ]}>
                          <Text style={[styles.historyAnswerName, { color: '#FF6B8A' }]}>
                            {ans.name}
                          </Text>
                          <Text style={[styles.historyAnswerText, { color: textColors.primary }]}>
                            "{ans.answer}"
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Header - Musical theme
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  nowChatting: {
    alignItems: 'center',
  },
  nowChattingLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  headerAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pendingBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pendingBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },

  // Chat Background
  chatBackground: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: staticColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: staticColors.textSecondary,
    textAlign: 'center',
  },
  starterContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  starterLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.textMuted,
    marginBottom: spacing.sm,
  },
  starterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  starterBtn: {
    backgroundColor: staticColors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: staticColors.border,
  },
  starterBtnText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.text,
  },

  // Messages List
  messagesList: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  messagesListEmpty: {
    flex: 1,
  },

  // Date
  dateContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  datePill: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  dateText: {
    fontSize: 11,
    color: staticColors.textSecondary,
    fontWeight: '500',
  },

  // Message Container
  messageContainer: {
    marginBottom: 2,
    maxWidth: BUBBLE_MAX_WIDTH,
  },
  messageContainerMe: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageContainerPartner: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },

  // Bubble
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleMe: {
    backgroundColor: staticColors.primary,
  },
  bubblePartner: {
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  bubbleMeTail: {
    borderBottomRightRadius: 4,
  },
  bubblePartnerTail: {
    borderBottomLeftRadius: 4,
  },
  bubbleSending: {
    opacity: 0.7,
  },
  bubbleQuestion: {
    backgroundColor: '#F3E5F5',
    borderWidth: 1,
    borderColor: '#CE93D8',
  },
  bubbleImage: {
    padding: 4,
    backgroundColor: 'transparent',
  },

  // Image message
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 16,
  },

  // Voice message
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 150,
  },
  voiceWaves: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  voiceWave: {
    width: 3,
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Message Text
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  textMe: {
    color: 'white',
  },
  textPartner: {
    color: staticColors.text,
  },
  textQuestion: {
    color: '#7B1FA2',
    fontStyle: 'italic',
  },

  // Meta
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  metaMe: {
    justifyContent: 'flex-end',
  },
  metaPartner: {
    justifyContent: 'flex-start',
  },
  time: {
    fontSize: 11,
    color: staticColors.textMuted,
  },
  readStatus: {
    marginLeft: 4,
  },

  // Reactions Bar
  reactionsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: staticColors.background,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  reactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: staticColors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },

  // Recording Bar
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: staticColors.error,
  },
  recordingTime: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.error,
  },
  recordingText: {
    fontSize: typography.fontSize.sm,
    color: staticColors.textSecondary,
  },

  // Input Area
  inputArea: {
    backgroundColor: staticColors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  inputIconBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.backgroundAlt,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: staticColors.text,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  emojiBtn: {
    padding: spacing.xs,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: staticColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: staticColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnRecording: {
    backgroundColor: staticColors.error,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  questionModal: {
    backgroundColor: staticColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
  },
  questionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  questionModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: staticColors.text,
  },
  questionCard: {
    backgroundColor: '#F3E5F5',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  questionEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  questionText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: '#7B1FA2',
    textAlign: 'center',
    lineHeight: 28,
  },
  questionCategory: {
    fontSize: typography.fontSize.sm,
    color: '#9C27B0',
    marginTop: spacing.sm,
    textTransform: 'capitalize',
  },
  questionActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  shuffleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: staticColors.primary,
  },
  shuffleBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: staticColors.primary,
  },
  askBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: '#9C27B0',
  },
  askBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: 'white',
  },
  questionHint: {
    fontSize: typography.fontSize.sm,
    color: staticColors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Answer Modal
  answerModal: {
    backgroundColor: staticColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    maxHeight: height * 0.8,
  },
  partnerAnswerCard: {
    backgroundColor: staticColors.backgroundAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  partnerAnswerLabel: {
    fontSize: typography.fontSize.sm,
    color: staticColors.textMuted,
    marginBottom: spacing.xs,
  },
  partnerAnswerText: {
    fontSize: typography.fontSize.base,
    color: staticColors.text,
    fontStyle: 'italic',
  },
  myAnswerSection: {
    marginBottom: spacing.md,
  },
  myAnswerLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: staticColors.text,
    marginBottom: spacing.xs,
  },
  answerInput: {
    backgroundColor: staticColors.backgroundAlt,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: staticColors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#9C27B0',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    color: 'white',
  },

  // Questions History Modal
  historyModalContent: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  historyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '800',
  },
  historyLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyEmptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  historyEmptySubtext: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  historyList: {
    paddingBottom: spacing.xl,
  },
  historyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  historyQuestion: {
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  historyDate: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.sm,
  },
  historyAnswers: {
    gap: spacing.sm,
  },
  historyAnswerItem: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  historyAnswerName: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyAnswerText: {
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default ChatScreen;
