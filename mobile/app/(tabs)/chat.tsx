import { View, Text, StyleSheet, useColorScheme, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { ScreenTitle, BodyText, FontFamily } from '../../constants/typography';
import { useFonts } from 'expo-font';

const ORB_SIZE = 240;

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? Colors.night : Colors.day;

  const [fontsLoaded] = useFonts({
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={{ fontSize: 40, color: 'red', marginBottom: 20 }}>
          CHAT FILE LOADED
        </Text>
        <Text style={[styles.placeholder, { color: theme.textPrimary, fontFamily: canelaFont }]}>
          Chat with TRACE
        </Text>
        
        <View style={{ width: 240, height: 240, borderRadius: 120, backgroundColor: 'red', alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
          <Text style={{ color: 'white', fontSize: 16 }}>ORB TEST</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 140,
    paddingHorizontal: Spacing.xl,
  },
  placeholder: {
    fontSize: ScreenTitle.fontSize,
    fontWeight: ScreenTitle.fontWeight,
    marginBottom: Spacing.xl,
  },
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    shadowColor: '#E8DFD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 8,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerGlow: {
    position: 'absolute',
    width: ORB_SIZE * 0.7,
    height: ORB_SIZE * 0.7,
    borderRadius: (ORB_SIZE * 0.7) / 2,
    backgroundColor: 'rgba(255, 253, 250, 0.35)',
    top: ORB_SIZE * 0.1,
    left: ORB_SIZE * 0.15,
  },
});
