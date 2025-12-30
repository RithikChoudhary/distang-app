import { useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';
import { lightColors, darkColors, typography, spacing, borderRadius, shadows } from '../utils/theme';

/**
 * Custom hook to get themed colors and utilities
 */
export const useTheme = () => {
  const { isDark, mode, toggleTheme, setMode } = useThemeStore();
  
  const colors = useMemo(() => {
    return isDark ? darkColors : lightColors;
  }, [isDark]);
  
  return {
    colors,
    isDark,
    mode,
    toggleTheme,
    setMode,
    typography,
    spacing,
    borderRadius,
    shadows,
  };
};

export default useTheme;

