import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, useColorScheme, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { FontFamily } from '../../constants/typography';
import { useFonts } from 'expo-font';

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? Colors.night : Colors.day;
  const [message, setMessage] = useState('');

  const [fontsLoaded] = useFonts({
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const displayFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;

  const handleSend = () => {
    if (message.trim()) {
      setMessage('');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: displayFont }]}>
          TRACE
        </Text>
      </View>

      <ScrollView 
        style={styles.messageArea}
        contentContainerStyle={styles.messageContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: displayFont }]}>
            Begin your conversation
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.inputContainer, { paddingBottom: 100 }]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.surface }]}>
          <TextInput
            style={[styles.input, { color: theme.textPrimary }]}
            placeholder="Share what's on your mind..."
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <Pressable 
            style={[
              styles.sendButton, 
              { backgroundColor: message.trim() ? theme.accent : theme.surface }
            ]}
            onPress={handleSend}
            disabled={!message.trim()}
          >
            <Text style={[
              styles.sendButtonText, 
              { color: message.trim() ? '#FFFFFF' : theme.textSecondary }
            ]}>
              Send
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    letterSpacing: 4,
    fontWeight: '300',
  },
  messageArea: {
    flex: 1,
  },
  messageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
  },
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
