export const Colors = {
  day: {
    background: '#F5F1EB',
    backgroundGradient: ['#EDE5DA', '#D8CDBF', '#C9BBAA'] as const,
    textPrimary: '#4B4B4B',
    textSecondary: '#8A8680',
    traceBrand: '#5A4A3A',
    cardWhite: '#FFFFFF',
    cardCream: '#FAF9F7',
    cardMuted: '#D3CFC8',
    sage: {
      light: '#9AB09C',
      medium: '#7D9180',
      dark: '#6B7A6E',
    },
    tabBar: {
      gradient: [
        'rgba(245, 241, 235, 0.65)',
        'rgba(232, 228, 222, 0.65)',
        'rgba(200, 207, 201, 0.65)',
        'rgba(168, 181, 170, 0.65)',
        'rgba(143, 163, 149, 0.65)',
      ] as const,
      activeIcon: '#EDE8DB',
      inactiveIcon: 'rgba(237, 232, 219, 0.6)',
    },
  },
  night: {
    background: '#0E0F0D',
    backgroundGradient: ['#1A1B18', '#0E0F0D', '#0A0B09'] as const,
    textPrimary: '#D4D8D0',
    textSecondary: '#8A8F86',
    traceBrand: '#C4BFB8',
    cardDark: '#1E1F1C',
    cardMuted: '#2A2E2A',
    sage: {
      light: '#3A403A',
      medium: '#2A2E2A',
      dark: '#1E201E',
    },
    tabBar: {
      gradient: [
        'rgba(30, 32, 30, 0.65)',
        'rgba(42, 46, 42, 0.65)',
        'rgba(58, 64, 58, 0.65)',
      ] as const,
      activeIcon: '#D4D8D0',
      inactiveIcon: 'rgba(212, 216, 208, 0.6)',
    },
  },
};

export default Colors;
