/**
 * Codex Couples - Premium Clean Theme with Dark Mode
 * 
 * White & clean design with colorful accents.
 * Professional, modern, and minimal.
 */

export const lightColors = {
  // Primary - Soft Rose
  primary: '#FF6B8A',
  primaryLight: '#FFE5EA',
  primaryDark: '#E85577',
  
  // Backgrounds - Clean White
  background: '#FFFFFF',
  backgroundAlt: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  
  // Text - Dark & Readable
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Status Colors - Vibrant
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  // Feature Colors - Colorful Icons
  chat: '#8B5CF6',
  chatLight: '#EDE9FE',
  memories: '#EC4899',
  memoriesLight: '#FCE7F3',
  location: '#10B981',
  locationLight: '#D1FAE5',
  consent: '#3B82F6',
  consentLight: '#DBEAFE',
  
  // Map
  mapOverlay: 'rgba(0, 0, 0, 0.03)',
  
  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderFocus: '#FF6B8A',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.05)',
  
  // Card shadows
  shadow: 'rgba(0, 0, 0, 0.08)',
  
  // Chat specific
  chatBackground: '#F5F5F5',
  bubbleMe: '#FF6B8A',
  bubblePartner: '#FFFFFF',
  
  // Card background (same as surface for light)
  cardBackground: '#FFFFFF',
};

export const darkColors = {
  // Primary - Soft Rose (same for brand consistency)
  primary: '#FF6B8A',
  primaryLight: '#3D2832',
  primaryDark: '#FF8AA3',
  
  // Backgrounds - Dark
  background: '#0F0F0F',
  backgroundAlt: '#1A1A1A',
  surface: '#1F1F1F',
  surfaceElevated: '#2A2A2A',
  
  // Text - Light & Readable
  text: '#FFFFFF',
  textSecondary: '#A1A1A1',
  textMuted: '#6B6B6B',
  textInverse: '#0F0F0F',
  
  // Status Colors - Vibrant (slightly adjusted for dark)
  success: '#22C55E',
  successLight: '#1A3D2A',
  warning: '#F59E0B',
  warningLight: '#3D3020',
  error: '#EF4444',
  errorLight: '#3D2020',
  info: '#3B82F6',
  infoLight: '#1E2D4A',
  
  // Feature Colors
  chat: '#A78BFA',
  chatLight: '#2D2642',
  memories: '#F472B6',
  memoriesLight: '#3D2035',
  location: '#34D399',
  locationLight: '#1A3D2A',
  consent: '#60A5FA',
  consentLight: '#1E2D4A',
  
  // Map
  mapOverlay: 'rgba(255, 255, 255, 0.03)',
  
  // Borders
  border: '#333333',
  borderLight: '#2A2A2A',
  borderFocus: '#FF6B8A',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(255, 255, 255, 0.05)',
  
  // Card shadows
  shadow: 'rgba(0, 0, 0, 0.3)',
  
  // Chat specific
  chatBackground: '#1A1A1A',
  bubbleMe: '#FF6B8A',
  bubblePartner: '#2A2A2A',
  
  // Card background (elevated for dark)
  cardBackground: '#1F1F1F',
};

// Export colors for backward compatibility (defaults to light)
export const colors = lightColors;

// Function to get colors based on dark mode
export const getColors = (isDark: boolean) => isDark ? darkColors : lightColors;

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const theme = {
  colors,
  lightColors,
  darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
};

export default theme;
