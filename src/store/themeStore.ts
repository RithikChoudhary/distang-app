import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      isDark: false,
      
      setMode: (mode: ThemeMode) => {
        const isDark = mode === 'dark';
        set({ mode, isDark });
      },
      
      toggleTheme: () => {
        const current = get().mode;
        const newMode = current === 'light' ? 'dark' : 'light';
        set({ mode: newMode, isDark: newMode === 'dark' });
      },
    }),
    {
      name: 'codex-theme',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

