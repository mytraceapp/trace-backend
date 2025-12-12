import { Platform } from 'react-native';

export const FontFamily = {
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
  }) as string,
  serifBold: Platform.select({
    ios: 'Georgia-Bold',
    android: 'serif',
  }) as string,
  sans: Platform.select({
    ios: 'System',
    android: 'Roboto',
  }) as string,
  sansMedium: Platform.select({
    ios: 'System',
    android: 'Roboto',
  }) as string,
};

export const FontSize = {
  '2xs': 10,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
};

export const FontWeight = {
  light: '300' as const,
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const LineHeight = {
  none: 1,
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
  loose: 2,
};

export const LetterSpacing = {
  tighter: -0.5,
  tight: -0.25,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
  trace: 4,
};

export const Typography = {
  traceLabel: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    letterSpacing: LetterSpacing.trace,
    textTransform: 'uppercase' as const,
  },
  screenTitle: {
    fontFamily: FontFamily.serif,
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.normal,
    lineHeight: FontSize['4xl'] * LineHeight.tight,
  },
  screenSubtitle: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.base,
    fontWeight: FontWeight.normal,
    lineHeight: FontSize.base * LineHeight.relaxed,
  },
  cardTitle: {
    fontFamily: FontFamily.serif,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.lg * LineHeight.snug,
  },
  cardDescription: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.normal,
    lineHeight: FontSize.sm * LineHeight.relaxed,
  },
  body: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.base,
    fontWeight: FontWeight.normal,
    lineHeight: FontSize.base * LineHeight.normal,
  },
  bodySmall: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.normal,
    lineHeight: FontSize.sm * LineHeight.normal,
  },
  caption: {
    fontFamily: FontFamily.sans,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.normal,
    lineHeight: FontSize.xs * LineHeight.normal,
  },
};
