import { Platform } from 'react-native';

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  card: Platform.select({
    ios: {
      shadowColor: 'rgba(75, 75, 75, 1)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
    },
    android: {
      elevation: 4,
    },
  }),
  cardSubtle: Platform.select({
    ios: {
      shadowColor: 'rgba(75, 75, 75, 1)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 16,
    },
    android: {
      elevation: 2,
    },
  }),
  button: Platform.select({
    ios: {
      shadowColor: 'rgba(75, 75, 75, 1)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
    },
    android: {
      elevation: 4,
    },
  }),
  traceWordmark: {
    textShadowColor: 'rgba(90, 74, 58, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
};

export const ShadowsNight = {
  none: Shadows.none,
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
    },
    android: {
      elevation: 6,
    },
  }),
  cardSubtle: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    android: {
      elevation: 3,
    },
  }),
  button: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
    },
    android: {
      elevation: 5,
    },
  }),
  traceWordmark: {
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
};

export default Shadows;
