/**
 * User Favorites
 */
export interface UserFavorites {
  food?: string;
  placeVisited?: string;
  placeToBe?: string;
}

/**
 * Notification Preferences
 */
export interface NotificationPreferences {
  messages: boolean;
  locationUpdates: boolean;
  streaks: boolean;
  calendar: boolean;
  walkieTalkie: boolean;
}

/**
 * User types
 */
export interface User {
  id: string;
  uniqueId: string;
  username: string;
  name: string;
  email: string;
  phoneNumber?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profilePhoto?: string;
  photos?: string[];
  favorites?: UserFavorites;
  relationshipStatus: 'single' | 'paired';
  coupleId?: string;
  pastRelationshipExists?: boolean;
  isProfileComplete?: boolean;
  isVerified?: boolean;
  createdAt?: string;
}

export interface Partner {
  id: string;
  uniqueId: string;
  username?: string;
  name: string;
  profilePhoto?: string;
  photos?: string[];
  favorites?: UserFavorites;
}

/**
 * Auth types - OTP based
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
  };
}

export interface SignupInitPayload {
  name: string;
  username: string;
  email: string;
  phoneNumber?: string;
}

export interface SignupVerifyPayload {
  name: string;
  username: string;
  email: string;
  phoneNumber?: string;
  otp: string;
}

export interface LoginInitPayload {
  email: string;
  username?: string; // Optional - can login with just email
}

export interface LoginVerifyPayload {
  email: string;
  otp: string;
}

export interface CompleteProfilePayload {
  profilePhoto?: string;
  photos?: string[];
  favorites?: UserFavorites;
  gender?: string;
}

// Legacy - for backward compatibility
export interface RegisterPayload {
  email?: string;
  phoneNumber?: string;
  password: string;
  name: string;
  gender?: string;
}

export interface LoginPayload {
  email?: string;
  phoneNumber?: string;
  password: string;
}

/**
 * Couple types
 */
export interface Couple {
  coupleId: string;
  pairingDate: string;
  partner: Partner;
}

export interface PairRequest {
  coupleId: string;
  from?: Partner;
  to?: Partner;
  createdAt: string;
}

export interface Certificate {
  coupleId: string;
  partner1: {
    uniqueId: string;
    name: string;
  };
  partner2: {
    uniqueId: string;
    name: string;
  };
  pairingDate: string;
  disclaimer: string;
}

/**
 * Consent types
 */
export interface ConsentSettings {
  photoSharing: boolean;
  memoryAccess: boolean;
  locationSharing: boolean;
  lastUpdated?: string;
}

export interface ConsentStatus {
  myConsent: ConsentSettings;
  partnerConsent: ConsentSettings;
  activeFeatures: string[];
  featureStatus: {
    photoSharing: FeatureStatus;
    memoryAccess: FeatureStatus;
    locationSharing: FeatureStatus;
  };
}

export interface FeatureStatus {
  active: boolean;
  myConsent: boolean;
  partnerConsent: boolean;
}

/**
 * Memory types
 */
export interface Memory {
  id: string;
  imagePath: string;
  caption?: string;
  uploadedBy: {
    uniqueId: string;
    name: string;
  };
  createdAt: string;
}

export interface MemoryListResponse {
  memories: Memory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Location types
 */
export interface LocationShare {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

/**
 * Chat types
 */
export interface ChatMessage {
  id: string;
  senderId: {
    uniqueId: string;
    name: string;
  };
  message: string;
  messageType: 'text' | 'image' | 'voice' | 'location';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMessages: number;
    hasMore: boolean;
  };
  unreadCount: number;
}

/**
 * Streak types
 */
export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate?: string;
}

export interface StreakPhoto {
  id: string;
  imagePath: string;
  expiresAt: string;
  createdAt: string;
  viewedAt?: string;
  isExpired?: boolean;
  uploadedBy?: {
    uniqueId: string;
    name: string;
  };
}

/**
 * Calendar types
 */
export interface ImportantDate {
  id: string;
  title: string;
  description?: string;
  date: string;
  emoji: string;
  isRecurring: boolean;
  reminderEnabled: boolean;
  createdBy?: {
    uniqueId: string;
    name: string;
  };
}

/**
 * API Response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}
