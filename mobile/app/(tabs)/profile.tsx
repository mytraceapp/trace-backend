import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, Platform, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2, RefreshCw } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { ScreenTitle, BodyText, FontFamily } from '../../constants/typography';
import { useFonts } from 'expo-font';
import { playAmbient } from '../../lib/ambientAudio';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? Colors.night : Colors.day;
  const [isClearing, setIsClearing] = useState(false);

  const [fontsLoaded] = useFonts({
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  useFocusEffect(
    useCallback(() => {
      playAmbient("main", require("../../assets/audio/trace_ambient.m4a"), 0.35);
    }, [])
  );

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;

  const handleClearConversation = async () => {
    Alert.alert(
      'Clear Conversation',
      'This will remove all chat messages and start fresh. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              const userId = await AsyncStorage.getItem('user_id');
              const storageKey = userId ? `trace:conversationHistory:${userId}` : 'trace:conversationHistory';
              
              await AsyncStorage.removeItem(storageKey);
              await AsyncStorage.removeItem('trace:conversationHistory');
              await AsyncStorage.removeItem('trace:pendingActivityCompletion');
              await AsyncStorage.removeItem('trace:pendingJournalInvite');
              await AsyncStorage.removeItem('trace:lastGreetingTime');
              
              Alert.alert('Done', 'Your conversation has been cleared. Open the chat to start fresh.');
            } catch (error) {
              console.error('Failed to clear conversation:', error);
              Alert.alert('Error', 'Failed to clear conversation. Please try again.');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={[styles.placeholder, { color: theme.textPrimary, fontFamily: canelaFont }]}>
          Profile
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: canelaFont }]}>
          Coming soon
        </Text>
        
        <View style={styles.actionsContainer}>
          <Pressable 
            style={[styles.actionButton, { backgroundColor: theme.cardBackground || 'rgba(0,0,0,0.05)' }]}
            onPress={handleClearConversation}
            disabled={isClearing}
          >
            {isClearing ? (
              <RefreshCw size={20} color={theme.textSecondary} />
            ) : (
              <Trash2 size={20} color={theme.textSecondary} />
            )}
            <Text style={[styles.actionText, { color: theme.textPrimary, fontFamily: canelaFont }]}>
              {isClearing ? 'Clearing...' : 'Clear Conversation History'}
            </Text>
          </Pressable>
          <Text style={[styles.actionHint, { color: theme.textSecondary }]}>
            Removes old cached messages and starts fresh
          </Text>
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
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  placeholder: {
    fontSize: ScreenTitle.fontSize,
    fontWeight: ScreenTitle.fontWeight,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: BodyText.fontSize,
  },
  actionsContainer: {
    marginTop: 60,
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionHint: {
    fontSize: 13,
    marginTop: 8,
    opacity: 0.7,
  },
});
