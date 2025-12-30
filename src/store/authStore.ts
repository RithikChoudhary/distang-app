import { create } from 'zustand';
import { User, Partner, ConsentStatus } from '../types';
import { authApi, userApi, consentApi, getToken, clearToken, setToken as saveToken } from '../services/api';

interface AuthState {
  // State
  user: User | null;
  partner: Partner | null;
  consentStatus: ConsentStatus | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string | undefined, phoneNumber: string | undefined, password: string) => Promise<void>;
  register: (name: string, email: string | undefined, phoneNumber: string | undefined, password: string, gender?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshConsent: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => Promise<void>;
  setPartner: (partner: Partner | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  partner: null,
  consentStatus: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Initialize - check for existing token and load user
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const token = await getToken();
      
      if (!token) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }
      
      // Try to get user data
      const response = await userApi.getMe();
      
      if (response.success && response.data) {
        set({
          user: response.data.user,
          partner: response.data.partner,
          isAuthenticated: true,
          isLoading: false,
        });
        
        // Load consent status if in a relationship
        if (response.data.user.coupleId) {
          get().refreshConsent();
        }
      } else {
        await clearToken();
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      await clearToken();
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  // Login
  login: async (email, phoneNumber, password) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await authApi.login({ email, phoneNumber, password });
      
      if (response.success && response.data) {
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        
        // Load full user data including partner
        await get().refreshUser();
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // Register
  register: async (name, email, phoneNumber, password, gender) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await authApi.register({
        name,
        email,
        phoneNumber,
        password,
        gender,
      });
      
      if (response.success && response.data) {
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  // Logout
  logout: async () => {
    await authApi.logout();
    set({
      user: null,
      partner: null,
      consentStatus: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // Refresh user data
  refreshUser: async () => {
    try {
      const response = await userApi.getMe();
      
      if (response.success && response.data) {
        set({
          user: response.data.user,
          partner: response.data.partner,
        });
        
        // Load consent status if in a relationship
        if (response.data.user.coupleId) {
          get().refreshConsent();
        } else {
          set({ consentStatus: null });
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },

  // Refresh consent status
  refreshConsent: async () => {
    try {
      const response = await consentApi.getStatus();
      
      if (response.success && response.data) {
        set({ consentStatus: response.data });
      }
    } catch (error) {
      // User might not be in a relationship
      set({ consentStatus: null });
    }
  },

  // Set user
  setUser: (user) => set({ user, isAuthenticated: true }),

  // Set token
  setToken: async (token) => {
    await saveToken(token);
    set({ isAuthenticated: true });
  },

  // Set partner
  setPartner: (partner) => set({ partner }),

  // Clear error
  clearError: () => set({ error: null }),
}));

