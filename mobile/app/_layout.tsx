import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StyleSheet, useColorScheme, View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { Colors } from '../constants/theme';
import { initAudioMode } from '../lib/ambientAudio';

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'day' | 'night'>('night');

  const [fontsLoaded] = useFonts({
    'Alore': require('../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../assets/fonts/Canela-Regular.ttf'),
  });

  useEffect(() => {
    setTheme(systemColorScheme === 'dark' ? 'night' : 'day');
  }, [systemColorScheme]);

  useEffect(() => {
    initAudioMode();
  }, []);

  const colors = Colors[theme];

  // Wait for fonts to load to ensure consistent layout metrics
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style={theme === 'night' ? 'light' : 'dark'} translucent backgroundColor="transparent" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="activities/ripple" 
            options={{ 
              headerShown: false,
              presentation: 'containedTransparentModal',
              animation: 'fade',
            }} 
          />
          <Stack.Screen 
            name="activities/breathing" 
            options={{ 
              headerShown: false,
              presentation: 'containedTransparentModal',
              animation: 'fade',
            }} 
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
