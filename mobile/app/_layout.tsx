import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StyleSheet, useColorScheme, Platform } from 'react-native';
import { Colors } from '../constants/theme';
import { initAudioMode } from '../lib/ambientAudio';
import { AudioProvider } from '../providers/AudioProvider';
import { ensureAuthSession, upsertUserProfile } from '../lib/supabase';
import { initOneSignal, setOneSignalExternalId } from '../lib/notifications';

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'day' | 'night'>('night');

  useEffect(() => {
    setTheme(systemColorScheme === 'dark' ? 'night' : 'day');
  }, [systemColorScheme]);

  useEffect(() => {
    initAudioMode();
  }, []);

  useEffect(() => {
    initOneSignal();
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const userId = await ensureAuthSession();
      if (userId) {
        await upsertUserProfile(userId);
        setOneSignalExternalId(userId);
      }
    };
    initAuth();
  }, []);

  const colors = Colors[theme];

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <AudioProvider>
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
        </AudioProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
