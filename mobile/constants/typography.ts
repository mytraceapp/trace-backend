import { Platform } from 'react-native';

export const FontFamily = {
  alore: 'Alore',
  canela: 'Canela',
  system: Platform.select({ ios: 'System', android: 'Roboto' }) || 'System',
};

export const FontWeight = {
  thin: '100' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const TraceWordmark = {
  fontFamily: FontFamily.alore,
  fontSize: 11,
  fontWeight: FontWeight.light,
  letterSpacing: 14,
  marginLeft: 7,
  color: '#5A4A3A',
  opacity: 0.88,
  textShadowColor: 'rgba(90, 74, 58, 0.45)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 15,
};

export const ScreenTitle = {
  fontFamily: FontFamily.canela,
  fontSize: 28,
  fontWeight: FontWeight.regular,
  letterSpacing: -0.56,
  color: '#4B4B4B',
};

export const CardTitle = {
  fontFamily: FontFamily.canela,
  fontSize: 16,
  fontWeight: FontWeight.medium,
  letterSpacing: 0.16,
  color: '#4B4B4B',
};

export const BodyText = {
  fontFamily: FontFamily.canela,
  fontSize: 15,
  fontWeight: FontWeight.light,
  letterSpacing: 0.15,
  lineHeight: 22,
  color: '#4B4B4B',
};

export const MetaText = {
  fontFamily: FontFamily.canela,
  fontSize: 12,
  fontWeight: FontWeight.light,
  letterSpacing: 0.1,
  lineHeight: 18,
  color: '#8A8680',
  opacity: 0.75,
};

export const Typography = {
  fontFamily: FontFamily,
  fontWeight: FontWeight,
  traceWordmark: TraceWordmark,
  screenTitle: ScreenTitle,
  cardTitle: CardTitle,
  bodyText: BodyText,
  metaText: MetaText,
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
};

export default Typography;
