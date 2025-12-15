import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, useColorScheme, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Send } from 'lucide-react-native';
import { Spacing } from '../../constants/spacing';
import { FontFamily } from '../../constants/typography';
import { useFonts } from 'expo-font';

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.headerTitle, { fontFamily: displayFont }]}>
            TRACE
          </Text>
        </View>

        <ScrollView 
          style={styles.messageArea}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.greetingContainer}>
            <Text style={[styles.greeting, { fontFamily: displayFont }]}>
              Hey, how's your day going?
            </Text>
          </View>
        </ScrollView>

        <View style={styles.bottomSection}>
          <View style={styles.sampleBubble}>
            <Text style={[styles.bubbleText, { fontFamily: displayFont }]}>
              Take a moment to breathe.
            </Text>
          </View>

          <View style={[styles.inputContainer, { paddingBottom: 100 }]}>
            <View style={styles.inputPill}>
              <Pressable style={styles.micButton}>
                <Mic size={20} color="#5A5A5A" strokeWidth={1.5} />
              </Pressable>
              
              <TextInput
                style={[styles.input, { fontFamily: displayFont }]}
                placeholder="Share what's on your mind..."
                placeholderTextColor="#8A8A8A"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
              />
              
              <Pressable 
                style={[styles.sendButton, message.trim() ? styles.sendButtonActive : null]}
                onPress={handleSend}
                disabled={!message.trim()}
              >
                <Send size={18} color={message.trim() ? '#FFFFFF' : '#AAAAAA'} strokeWidth={1.5} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7A8C7B',
  },
  content: {
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
    color: '#F3F1EA',
  },
  messageArea: {
    flex: 1,
  },
  messageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  greetingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 24,
    color: '#F3F1EA',
    textAlign: 'center',
    lineHeight: 32,
  },
  bottomSection: {
    paddingHorizontal: Spacing.md,
  },
  sampleBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(243, 241, 234, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    marginBottom: 16,
    maxWidth: '75%',
  },
  bubbleText: {
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  inputContainer: {
    paddingTop: 8,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 241, 234, 0.95)',
    borderRadius: 28,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#3A3A3A',
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  sendButtonActive: {
    backgroundColor: '#6B7A6E',
  },
});
