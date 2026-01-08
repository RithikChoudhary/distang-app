import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import {
  ApiResponse,
  AuthResponse,
  RegisterPayload,
  LoginPayload,
  SignupInitPayload,
  SignupVerifyPayload,
  LoginInitPayload,
  LoginVerifyPayload,
  CompleteProfilePayload,
  User,
  Partner,
  PairRequest,
  Certificate,
  ConsentSettings,
  ConsentStatus,
  Memory,
  MemoryListResponse,
  LocationShare,
  ChatMessage,
  ChatMessagesResponse,
  StreakStatus,
  StreakPhoto,
  ImportantDate,
  UserFavorites,
  NotificationPreferences,
} from '../types';

/**
 * API Configuration
 * 
 * Development: Uses local server IP
 * Production: Uses your production API URL
 * 
 * To find your local IP:
 * - Windows: Run 'ipconfig' in PowerShell, look for IPv4 Address
 * - Mac/Linux: Run 'ifconfig' or 'ip addr'
 */
const DEV_API_URL = 'http://192.168.68.110:3000'; // Update with YOUR local IP
const PROD_API_URL = 'https://backend.distang.com'; // Production API

// For testing with real users, you can force production URL:
const USE_PRODUCTION = true; // Using production backend

export const API_BASE_URL = USE_PRODUCTION ? PROD_API_URL : (__DEV__ ? DEV_API_URL : PROD_API_URL);

/**
 * Get full media URL - handles both Cloudinary URLs and relative paths
 * @param url - Either a full URL (Cloudinary) or a relative path (/uploads/...)
 * @returns Full URL ready for use in Image components
 */
export const getMediaUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  // If it's already a full URL (Cloudinary, etc.), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Otherwise, prepend the API base URL
  return `${API_BASE_URL}${url}`;
};

// API timeout (30 seconds for development, 15 for production)
const API_TIMEOUT = __DEV__ ? 30000 : 15000;

const TOKEN_KEY = 'codex_auth_token';

/**
 * Create axios instance with interceptors
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.log('⚠️ No auth token found for request:', config.url);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle errors
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiResponse>) => {
      // Only clear token for auth-specific 401s, not general API 401s
      // 401 can also mean "not authorized for this action" (e.g., no consent)
      // We should NOT clear the token in those cases
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      const isTokenInvalid = error.response?.data?.message?.toLowerCase().includes('token') ||
                             error.response?.data?.message?.toLowerCase().includes('expired') ||
                             error.response?.data?.message?.toLowerCase().includes('invalid');
      
      if (error.response?.status === 401 && isAuthEndpoint && isTokenInvalid) {
        // Only clear token if it's actually invalid/expired
        console.log('🔑 Token invalid, clearing...');
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const api = createApiClient();

/**
 * Token management
 */
export const setToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const clearToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

/**
 * Auth API - OTP based
 */
export const authApi = {
  // Signup flow
  signupInit: async (payload: SignupInitPayload): Promise<ApiResponse<{ email: string; expiresIn: number; devOtp?: string }>> => {
    const response = await api.post('/auth/signup/init', payload);
    return response.data;
  },

  signupVerify: async (payload: SignupVerifyPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/signup/verify', payload);
    if (response.data.data?.token) {
      await setToken(response.data.data.token);
    }
    return response.data;
  },

  // Login flow
  loginInit: async (payload: LoginInitPayload): Promise<ApiResponse<{ email: string; name: string; expiresIn: number; devOtp?: string }>> => {
    const response = await api.post('/auth/login/init', payload);
    return response.data;
  },

  loginVerify: async (payload: LoginVerifyPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login/verify', payload);
    if (response.data.data?.token) {
      await setToken(response.data.data.token);
    }
    return response.data;
  },

  // Resend OTP
  resendOTP: async (email: string, type: 'signup' | 'login'): Promise<ApiResponse> => {
    const response = await api.post('/auth/resend-otp', { email, type });
    return response.data;
  },

  // Complete profile (first time)
  completeProfile: async (payload: CompleteProfilePayload): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.post('/auth/complete-profile', payload);
    return response.data;
  },

  // Legacy methods
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', payload);
    if (response.data.data?.token) {
      await setToken(response.data.data.token);
    }
    return response.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', payload);
    if (response.data.data?.token) {
      await setToken(response.data.data.token);
    }
    return response.data;
  },

  logout: async (): Promise<void> => {
    await clearToken();
  },
};

/**
 * User API
 */
export const userApi = {
  getMe: async (): Promise<ApiResponse<{ user: User; partner: Partner | null }>> => {
    const response = await api.get('/user/me');
    return response.data;
  },

  updateProfile: async (data: { name?: string; gender?: string }): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  uploadProfilePhoto: async (uri: string): Promise<ApiResponse<{ profilePhoto: string }>> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('photo', {
      uri,
      name: filename,
      type,
    } as any);

    const response = await api.post('/user/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  searchUser: async (uniqueId: string): Promise<ApiResponse<{ user: Partner }>> => {
    const response = await api.get(`/user/search/${uniqueId}`);
    return response.data;
  },

  // Favorites
  getFavorites: async (): Promise<ApiResponse<{ favorites: UserFavorites }>> => {
    const response = await api.get('/user/favorites');
    return response.data;
  },

  updateFavorites: async (data: Partial<UserFavorites>): Promise<ApiResponse<{ favorites: UserFavorites }>> => {
    const response = await api.put('/user/favorites', data);
    return response.data;
  },

  // Notifications
  getNotifications: async (): Promise<ApiResponse<{ notifications: NotificationPreferences }>> => {
    const response = await api.get('/user/notifications');
    return response.data;
  },

  updateNotifications: async (data: Partial<NotificationPreferences>): Promise<ApiResponse<{ notifications: NotificationPreferences }>> => {
    const response = await api.put('/user/notifications', data);
    return response.data;
  },

  // Partner Profile
  getPartnerProfile: async (): Promise<ApiResponse<{
    partner: {
      uniqueId: string;
      name: string;
      profilePhoto?: string;
      photos: string[];
      about: {
        bio?: string;
        hobbies: string[];
        occupation?: string;
        education?: string;
        location?: string;
        birthday?: string;
      };
      favorites: UserFavorites;
      gender?: string;
      memberSince: string;
    };
    relationshipHistory: Array<{
      partnerName: string;
      partnerUniqueId: string;
      startDate: string;
      endDate: string;
      durationDays: number;
      initiatedBreakup: boolean;
    }>;
    currentRelationship: {
      startDate: string;
      daysTogether: number;
      relationshipStartDate?: string;
    };
    stats: {
      totalPastRelationships: number;
      totalDaysInRelationships: number;
    };
  }>> => {
    const response = await api.get('/user/partner-profile');
    return response.data;
  },

  // About
  updateAbout: async (data: {
    bio?: string;
    hobbies?: string[];
    occupation?: string;
    education?: string;
    location?: string;
    birthday?: string;
  }): Promise<ApiResponse<{ about: any }>> => {
    const response = await api.put('/user/about', data);
    return response.data;
  },

  // Relationship History
  getMyRelationshipHistory: async (): Promise<ApiResponse<{
    relationshipHistory: Array<{
      partnerName: string;
      partnerUniqueId: string;
      startDate: string;
      endDate: string;
      durationDays: number;
      initiatedBreakup: boolean;
    }>;
    totalPastRelationships: number;
    totalDaysInRelationships: number;
  }>> => {
    const response = await api.get('/user/relationship-history');
    return response.data;
  },
};

/**
 * Couple API
 */
export const coupleApi = {
  sendRequest: async (partnerUniqueId: string): Promise<ApiResponse> => {
    const response = await api.post('/couple/request', { partnerUniqueId });
    return response.data;
  },

  acceptRequest: async (coupleId: string): Promise<ApiResponse> => {
    const response = await api.post('/couple/accept', { coupleId });
    return response.data;
  },

  rejectRequest: async (coupleId: string): Promise<ApiResponse> => {
    const response = await api.post('/couple/reject', { coupleId });
    return response.data;
  },

  getPendingRequests: async (): Promise<ApiResponse<{
    incoming: PairRequest[];
    outgoing: PairRequest[];
  }>> => {
    const response = await api.get('/couple/requests');
    return response.data;
  },

  breakup: async (anonymousReview?: string): Promise<ApiResponse> => {
    const response = await api.post('/couple/breakup', { anonymousReview });
    return response.data;
  },

  getCertificate: async (): Promise<ApiResponse<{ certificate: Certificate }>> => {
    const response = await api.get('/couple/certificate');
    return response.data;
  },

  downloadCertificatePdf: async (): Promise<ArrayBuffer> => {
    const response = await api.get('/couple/certificate?format=pdf', {
      responseType: 'arraybuffer',
    });
    return response.data;
  },

  getRelationshipInfo: async (): Promise<ApiResponse<{
    relationshipStartDate: string | null;
    pairingDate: string;
    daysTogether: number;
    isStartDateSet: boolean;
  }>> => {
    const response = await api.get('/couple/relationship-info');
    return response.data;
  },

  setRelationshipStartDate: async (startDate: string): Promise<ApiResponse<{
    relationshipStartDate: string;
    daysTogether: number;
  }>> => {
    const response = await api.put('/couple/relationship-start-date', { startDate });
    return response.data;
  },
};

/**
 * Consent API
 */
export const consentApi = {
  update: async (settings: Partial<ConsentSettings>): Promise<ApiResponse<{
    myConsent: ConsentSettings;
    activeFeatures: string[];
  }>> => {
    const response = await api.post('/consent/update', settings);
    return response.data;
  },

  getStatus: async (): Promise<ApiResponse<ConsentStatus>> => {
    const response = await api.get('/consent/status');
    return response.data;
  },
};

/**
 * Memory API
 */
export const memoryApi = {
  upload: async (uri: string, caption?: string): Promise<ApiResponse<{ memory: Memory }>> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'memory.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    console.log('Uploading image:', { uri, filename, type });
    
    formData.append('image', {
      uri,
      name: filename,
      type,
    } as any);
    
    if (caption) {
      formData.append('caption', caption);
    }

    const response = await api.post('/memory/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    console.log('Upload response:', response.data);
    return response.data;
  },

  list: async (page = 1, limit = 20): Promise<ApiResponse<MemoryListResponse>> => {
    const response = await api.get(`/memory/list?page=${page}&limit=${limit}`);
    return response.data;
  },

  get: async (id: string): Promise<ApiResponse<{ memory: Memory }>> => {
    const response = await api.get(`/memory/${id}`);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/memory/${id}`);
    return response.data;
  },
};

/**
 * Location API
 */
export const locationApi = {
  share: async (location: LocationShare): Promise<ApiResponse> => {
    const response = await api.post('/location/share', location);
    return response.data;
  },
  
  stopSharing: async (): Promise<ApiResponse> => {
    const response = await api.post('/location/stop');
    return response.data;
  },
  
  getPartnerLocation: async (): Promise<ApiResponse<{
    location: {
      sharedBy: { uniqueId: string; name: string };
      latitude: number;
      longitude: number;
      accuracy?: number;
      sharedAt: string;
      isActive: boolean;
    };
  }>> => {
    const response = await api.get('/location/partner');
    return response.data;
  },
  
  getMyStatus: async (): Promise<ApiResponse<{
    isSharing: boolean;
    location?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      sharedAt: string;
    };
  }>> => {
    const response = await api.get('/location/status');
    return response.data;
  },
};

/**
 * Chat API
 */
export const chatApi = {
  sendMessage: async (message: string, messageType: string = 'text'): Promise<ApiResponse<{ message: ChatMessage }>> => {
    const response = await api.post('/chat/send', { message, messageType });
    return response.data;
  },
  
  sendImage: async (uri: string): Promise<ApiResponse<{ message: ChatMessage }>> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri,
      name: filename,
      type,
    } as any);

    const response = await api.post('/chat/send-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  sendVoice: async (uri: string, duration: number): Promise<ApiResponse<{ message: ChatMessage }>> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'audio.m4a';
    
    formData.append('audio', {
      uri,
      name: filename,
      type: 'audio/m4a',
    } as any);
    formData.append('duration', duration.toString());

    const response = await api.post('/chat/send-voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  getMessages: async (page = 1, limit = 50): Promise<ApiResponse<ChatMessagesResponse>> => {
    const response = await api.get(`/chat/messages?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  markAsRead: async (): Promise<ApiResponse> => {
    const response = await api.post('/chat/read');
    return response.data;
  },
  
  deleteMessage: async (messageId: string): Promise<ApiResponse> => {
    const response = await api.delete(`/chat/message/${messageId}`);
    return response.data;
  },
  
  getUnreadCount: async (): Promise<ApiResponse<{ unreadCount: number }>> => {
    const response = await api.get('/chat/unread');
    return response.data;
  },
};

/**
 * Streak API
 */
export const streakApi = {
  uploadPhoto: async (uri: string): Promise<ApiResponse<{
    photo: StreakPhoto;
    streak: StreakStatus;
    activePhotosCount: number;
  }>> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'streak.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('image', {
      uri,
      name: filename,
      type,
    } as any);
    
    const response = await api.post('/streak/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  getStatus: async (): Promise<ApiResponse<{
    streak: StreakStatus;
    myPhoto: StreakPhoto | null;
    partnerPhoto: StreakPhoto | null;
    allPhotos: StreakPhoto[];
    partnerPhotosCount: number;
    myPhotosCount: number;
  }>> => {
    const response = await api.get('/streak/status');
    return response.data;
  },
  
  markViewed: async (photoId: string): Promise<ApiResponse> => {
    const response = await api.post(`/streak/${photoId}/viewed`);
    return response.data;
  },
};

/**
 * Calendar API
 */
export const calendarApi = {
  addDate: async (data: {
    title: string;
    description?: string;
    date: string;
    emoji?: string;
    isRecurring?: boolean;
  }): Promise<ApiResponse<{ date: ImportantDate }>> => {
    const response = await api.post('/calendar/add', data);
    return response.data;
  },
  
  getDates: async (): Promise<ApiResponse<{
    dates: ImportantDate[];
    upcoming: ImportantDate[];
  }>> => {
    const response = await api.get('/calendar/dates');
    return response.data;
  },
  
  deleteDate: async (dateId: string): Promise<ApiResponse> => {
    const response = await api.delete(`/calendar/${dateId}`);
    return response.data;
  },
};

/**
 * Walkie-Talkie API
 */
/**
 * Call Status API
 */
export const callStatusApi = {
  update: async (data: { state: string; platform: 'ios' | 'android' }): Promise<ApiResponse> => {
    const response = await api.post('/call-status', data);
    return response.data;
  },
  
  getMe: async (): Promise<ApiResponse<{
    state: string;
    platform: string | null;
    updatedAt: string | null;
  }>> => {
    const response = await api.get('/call-status/me');
    return response.data;
  },
  
  getPartner: async (): Promise<ApiResponse<{
    state: string;
    platform: string | null;
    updatedAt: string | null;
    isStale: boolean;
    secondsAgo: number;
  }>> => {
    const response = await api.get('/call-status/partner');
    return response.data;
  },
  
  clear: async (): Promise<ApiResponse> => {
    const response = await api.delete('/call-status');
    return response.data;
  },
};

export const walkieApi = {
  sendBuzz: async (type: 'single' | 'double' | 'long' = 'single'): Promise<ApiResponse> => {
    const response = await api.post('/walkie/buzz', { type });
    return response.data;
  },
  
  getPendingBuzzes: async (): Promise<ApiResponse<{
    buzzes: Array<{
      _id: string;
      sender: { uniqueId: string; name: string };
      type: string;
      createdAt: string;
    }>;
    count: number;
  }>> => {
    const response = await api.get('/walkie/buzzes');
    return response.data;
  },
  
  sendVoiceMessage: async (uri: string, duration: number): Promise<ApiResponse> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'voice.m4a';
    
    formData.append('audio', {
      uri,
      name: filename,
      type: 'audio/m4a',
    } as any);
    
    formData.append('duration', duration.toString());
    
    const response = await api.post('/walkie/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  
  getPendingVoiceMessages: async (): Promise<ApiResponse<{
    messages: Array<{
      _id: string;
      sender: { uniqueId: string; name: string };
      audioPath: string;
      duration: number;
      createdAt: string;
    }>;
    count: number;
  }>> => {
    const response = await api.get('/walkie/voice');
    return response.data;
  },
  
  markVoiceListened: async (messageId: string): Promise<ApiResponse> => {
    const response = await api.post(`/walkie/voice/${messageId}/listened`);
    return response.data;
  },
  
  getStatus: async (): Promise<ApiResponse<{
    pendingBuzzes: number;
    pendingVoice: number;
    hasNotifications: boolean;
  }>> => {
    const response = await api.get('/walkie/status');
    return response.data;
  },
};

/**
 * Question Prompts API
 */
export interface QuestionPrompt {
  id: string;
  text: string;
  category: string;
  emoji: string;
}

export interface QuestionAnswer {
  id: string;
  questionText: string;
  answers: Array<{
    uniqueId: string;
    name: string;
    answer: string;
    answeredAt: string;
  }>;
  isComplete: boolean;
  createdAt: string;
}

export const questionApi = {
  getRandom: async (category?: string): Promise<ApiResponse<{ question: QuestionPrompt }>> => {
    const url = category ? `/questions/random?category=${category}` : '/questions/random';
    const response = await api.get(url);
    return response.data;
  },
  
  getCategories: async (): Promise<ApiResponse<{
    categories: Array<{ value: string; label: string; emoji: string }>;
  }>> => {
    const response = await api.get('/questions/categories');
    return response.data;
  },
  
  ask: async (questionId: string, questionText: string): Promise<ApiResponse<{
    questionAnswer: QuestionAnswer;
  }>> => {
    const response = await api.post('/questions/ask', { questionId, questionText });
    return response.data;
  },
  
  answer: async (questionAnswerId: string, answer: string): Promise<ApiResponse<{
    questionAnswer: QuestionAnswer;
  }>> => {
    const response = await api.post(`/questions/${questionAnswerId}/answer`, { answer });
    return response.data;
  },
  
  getPending: async (): Promise<ApiResponse<{
    questions: QuestionAnswer[];
    count: number;
  }>> => {
    const response = await api.get('/questions/pending');
    return response.data;
  },
  
  getHistory: async (page = 1, limit = 20): Promise<ApiResponse<{
    questions: QuestionAnswer[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>> => {
    const response = await api.get(`/questions/history?page=${page}&limit=${limit}`);
    return response.data;
  },
};

/**
 * Mood types
 */
export type MoodType = 'happy' | 'excited' | 'calm' | 'tired' | 'sad' | 'stressed' | 'loving' | 'angry' | 'anxious' | 'neutral';

export interface MoodData {
  id: string;
  uniqueId?: string;
  name?: string;
  mood: MoodType;
  emoji: string;
  message?: string;
  createdAt: string;
}

/**
 * Mood API
 */
export const moodApi = {
  setMood: async (mood: MoodType, message?: string): Promise<ApiResponse<{ mood: MoodData }>> => {
    const response = await api.post('/mood', { mood, message });
    return response.data;
  },
  
  getPartnerMood: async (): Promise<ApiResponse<{ mood: MoodData | null }>> => {
    const response = await api.get('/mood/partner');
    return response.data;
  },
  
  getMyMood: async (): Promise<ApiResponse<{ mood: MoodData | null }>> => {
    const response = await api.get('/mood/me');
    return response.data;
  },
  
  getMoodHistory: async (page = 1, limit = 20): Promise<ApiResponse<{
    moods: MoodData[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>> => {
    const response = await api.get(`/mood/history?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  getMoodTypes: async (): Promise<ApiResponse<{
    types: Array<{ value: MoodType; label: string; emoji: string }>;
  }>> => {
    const response = await api.get('/mood/types');
    return response.data;
  },
};

export default api;

