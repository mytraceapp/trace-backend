import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';
import { AudioProvider } from '../contexts/AudioContext';

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'day' | 'night'>('night');

  useEffect(() => {
    setTheme(systemColorScheme === 'dark' ? 'night' : 'day');
  }, [systemColorScheme]);

  const colors = Colors[theme];

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AudioProvider>
        <StatusBar style={theme === 'night' ? 'light' : 'dark'} />
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
