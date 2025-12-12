export const Colors = {
  night: {
    bg: '#0E0F0D',
    bgSoft: '#1A1C1A',
    card: 'rgba(38, 42, 38, 0.92)',
    cardElevated: 'rgba(48, 52, 48, 0.95)',
    cardAlt: 'rgba(32, 36, 32, 0.88)',
    border: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#F2F0EC',
    textSecondary: '#C7C5C0',
    textTertiary: '#A8A6A2',
    accent: '#A8B39A',
    accentSoft: 'rgba(168, 179, 154, 0.15)',
    inputBg: '#2A2C2A',
    orbGlow: 'rgba(168, 179, 154, 0.25)',
    orbCore: 'rgba(255, 255, 255, 0.7)',
    danger: '#C49080',
  },
  day: {
    bg: '#F5F1EB',
    bgSoft: '#E8E4DC',
    card: 'rgba(255, 255, 255, 0.6)',
    cardElevated: 'rgba(255, 255, 255, 0.85)',
    cardAlt: '#C9BCB0',
    border: 'rgba(138, 122, 106, 0.12)',
    textPrimary: '#5A4A3A',
    textSecondary: '#8A7A6A',
    textTertiary: '#6B5A4A',
    accent: '#8DA18F',
    accentSoft: 'rgba(141, 161, 143, 0.15)',
    inputBg: '#E8E4DC',
    orbGlow: 'rgba(141, 161, 143, 0.15)',
    orbCore: 'rgba(90, 74, 58, 0.6)',
    danger: '#C49080',
  },
  shared: {
    activityIcon: '#9A8778',
  },
};

export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

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
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const Audio = {
  ambientVolume: 0.35,
  voiceVolume: 0.12,
  chimeVolume: 0.25,
};
