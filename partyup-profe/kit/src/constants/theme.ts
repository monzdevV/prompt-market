/**
 * PARTYUP Theme System
 * ========================
 * Dark mode design system - Bump style
 * Neon lime green as signature color, electric blue as secondary
 */

import { Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// COLOR PALETTE - DARK MODE BUMP STYLE
// ============================================

export const Colors = {
  // Brand primary colors
  primary: {
    main: '#BFFF00',      // Lime green - SIGNATURE
    light: '#D4FF4D',     // Light lime
    dark: '#99CC00',      // Dark lime
    muted: 'rgba(191, 255, 0, 0.15)',
    glow: 'rgba(191, 255, 0, 0.4)',
    gradient: ['#BFFF00', '#99CC00', '#7AA300'],
  },

  // Secondary color
  secondary: {
    main: '#3B82F6',      // Electric blue
    light: '#60A5FA',     // Light blue
    dark: '#2563EB',      // Dark blue
    muted: 'rgba(59, 130, 246, 0.15)',
    glow: 'rgba(59, 130, 246, 0.4)',
    gradient: ['#3B82F6', '#2563EB', '#1D4ED8'],
  },

  // Backgrounds - Dark Mode
  background: {
    primary: '#0A0A0B',     // Main black
    secondary: '#111113',   // Secondary black
    tertiary: '#18181B',    // Tertiary black
    elevated: '#1C1C1F',    // Elevated
    card: '#1A1A1D',        // Cards
    glass: 'rgba(255, 255, 255, 0.05)',
    glassStrong: 'rgba(255, 255, 255, 0.08)',
  },

  // Surface
  surface: {
    primary: '#1A1A1D',
    secondary: '#242428',
    tertiary: '#2E2E32',
    highlight: '#3A3A3F',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.12)',
    borderStrong: 'rgba(255, 255, 255, 0.18)',
  },

  // Borders
  border: {
    subtle: 'rgba(255, 255, 255, 0.05)',
    default: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.12)',
    accent: 'rgba(191, 255, 0, 0.3)',
  },

  // Accent colors
  accent: {
    pink: '#EC4899',
    purple: '#A855F7',
    cyan: '#22D3EE',
    orange: '#F97316',
    red: '#EF4444',
    green: '#22C55E',
    yellow: '#FACC15',
  },

  // Grayscale (dark mode)
  gray: {
    50: '#FAFAFA',
    100: '#18181B',
    200: '#27272A',
    300: '#3F3F46',
    400: '#52525B',
    500: '#71717A',
    600: '#A1A1AA',
    700: '#D4D4D8',
    800: '#E4E4E7',
    900: '#F4F4F5',
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.55)',
    muted: 'rgba(255, 255, 255, 0.45)',
    inverse: '#0A0A0B',
    link: '#BFFF00',
    accent: '#BFFF00',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#FACC15',
  },

  // UI
  ui: {
    background: '#0A0A0B',
    backgroundSecondary: '#111113',
    card: '#1A1A1D',
    cardElevated: '#242428',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.05)',
    divider: 'rgba(255, 255, 255, 0.06)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.5)',
  },

  // Gradients
  gradients: {
    lime: ['#BFFF00', '#99CC00'],
    blue: ['#3B82F6', '#2563EB'],
    limeToBlue: ['#BFFF00', '#22D3EE', '#3B82F6'],
    dark: ['#0A0A0B', '#111113', '#0A0A0B'],
    card: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'],
    glow: ['rgba(191,255,0,0.2)', 'rgba(191,255,0,0)'],
  },

  // Drink colors
  drinks: {
    beer: '#FBBF24',
    cubata: '#92400E',
    shot: '#EF4444',
    wine: '#881337',
    cocktail: '#EC4899',
  },

  // Status
  status: {
    online: '#22C55E',
    offline: '#52525B',
    busy: '#EF4444',
    away: '#FBBF24',
  },
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const Typography = {
  fontFamily: Platform.select({
    ios: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    android: {
      regular: 'Roboto',
      medium: 'Roboto-Medium',
      semibold: 'Roboto-Medium',
      bold: 'Roboto-Bold',
    },
    default: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
  }),

  size: {
    xs: 11,
    sm: 13,
    md: 15,
    base: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
    '5xl': 48,
  },

  lineHeight: {
    tight: 1.1,
    normal: 1.4,
    relaxed: 1.6,
  },

  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
} as const;

// ============================================
// SPACING
// ============================================

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ============================================
// SHADOWS - DARK MODE
// ============================================

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
    elevation: 12,
  },
  // Lime green glow
  glow: {
    shadowColor: '#BFFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glowSoft: {
    shadowColor: '#BFFF00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  // Blue glow
  glowBlue: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  // Cards
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  cardFloat: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 10,
  },
  // Buttons
  button: {
    shadowColor: '#BFFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonLime: {
    shadowColor: '#BFFF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  buttonBlue: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ============================================
// ANIMATIONS
// ============================================

export const Animation = {
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    slower: 800,
  },

  easing: {
    easeInOut: 'easeInOut',
    easeIn: 'easeIn',
    easeOut: 'easeOut',
    spring: 'spring',
  },

  spring: {
    gentle: {
      damping: 15,
      stiffness: 100,
    },
    bouncy: {
      damping: 10,
      stiffness: 150,
    },
    stiff: {
      damping: 20,
      stiffness: 200,
    },
  },
} as const;

// ============================================
// LAYOUT
// ============================================

export const Layout = {
  window: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  isSmallDevice: SCREEN_WIDTH < 375,
  isLargeDevice: SCREEN_WIDTH >= 414,

  safeArea: {
    top: Platform.OS === 'ios' ? 47 : 24,
    bottom: Platform.OS === 'ios' ? 34 : 0,
  },

  headerHeight: 56,
  tabBarHeight: Platform.OS === 'ios' ? 83 : 60,
  buttonHeight: {
    sm: 36,
    md: 44,
    lg: 52,
  },
  inputHeight: 48,
  avatarSize: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 80,
    '2xl': 120,
  },
  cardWidth: SCREEN_WIDTH - 32,
} as const;

// ============================================
// Z-INDEX
// ============================================

export const ZIndex = {
  base: 0,
  card: 10,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  toast: 400,
  tooltip: 500,
} as const;

// ============================================
// ICONS
// ============================================

export const IconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  base: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

// ============================================
// COMPLETE THEME
// ============================================

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  animation: Animation,
  layout: Layout,
  zIndex: ZIndex,
  iconSize: IconSize,
} as const;

export type ThemeType = typeof Theme;
export default Theme;
