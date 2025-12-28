import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Platform,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { BodyText, FontFamily } from '../../constants/typography';
import { useFonts } from 'expo-font';
import { playAmbient } from '../../lib/ambientAudio';
import { sendChatMessage } from '../../lib/chat';
import { getStableId } from '../../lib/stableId';
import { supabase } from '../../lib/supabaseClient';

const CHAT_API_BASE = 'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? Colors.night : Colors.day;
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [stableId, setStableId] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;

  useFocusEffect(
    useCallback(() => {
      playAmbient("main", require("../../assets/audio/trace_ambient.m4a"), 0.35);
    }, [])
  );

  useEffect(() => {
    const initIds = async () => {
      const deviceId = await getStableId();
      setStableId(deviceId);
      console.log('🆔 TRACE chat screen deviceId:', deviceId);

      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id ?? null;
      setAuthUserId(userId);
      console.log('🆔 TRACE chat screen authUserId:', userId);
    };
    initIds();
  }, []);

  const fetchChatHistory = useCallback(
    async (userId: string | null, deviceId: string | null) => {
      try {
        console.log('🕰 TRACE loading chat history...');

        const effectiveUserId = userId || '2ec61767-ffa7-4665-9ee3-7b5ae6d8bd0c';
        const url = `${CHAT_API_BASE}/api/chat-history?userId=${encodeURIComponent(effectiveUserId)}`;

        console.log('🛰 TRACE chat history URL:', url);

        const response = await fetch(url);

        if (!response.ok) {
          console.log('⚠️ TRACE chat history failed with status:', response.status);
          return;
        }

        const json = await response.json();
        console.log('📥 TRACE raw chat history payload:', JSON.stringify(json));

        if (json?.ok && Array.isArray(json.messages)) {
          const historyMessages: ChatMessage[] = json.messages.map(
            (m: { role: string; content: string }, index: number) => ({
              id: `history-${index}`,
              role: (m.role === 'assistant' ? 'assistant' : 'user') as ChatRole,
              content: m.content ?? '',
            })
          );

          console.log('💬 TRACE mapped history messages sample:', historyMessages[0] || null);
          console.log('✅ TRACE chat history loaded, hydrating messages:', historyMessages.length);

          setMessages((current) =>
            current.length === 0 ? historyMessages : current
          );
        } else {
          console.warn('⚠️ TRACE chat history: invalid payload', json);
        }
      } catch (err: any) {
        console.log('⚠️ TRACE chat history error:', err.message || String(err));
      }
    },
    []
  );

  useEffect(() => {
    if (stableId !== null) {
      fetchChatHistory(authUserId, stableId);
    }
  }, [authUserId, stableId, fetchChatHistory]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const previousMessages = messages;

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    console.log('📤 TRACE sending message:', trimmed);

    try {
      const now = new Date();

      const payloadMessages = [...previousMessages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      console.log('📤 TRACE sending payload messages:', payloadMessages.length);

      const result = await sendChatMessage({
        messages: payloadMessages,
        userName: null,
        chatStyle: 'conversation',
        localTime: now.toLocaleTimeString(),
        localDay: now.toLocaleDateString('en-US', { weekday: 'long' }),
        localDate: now.toLocaleDateString(),
        userId: authUserId,
        deviceId: stableId,
      });

      console.log('📥 TRACE received reply:', result);

      const assistantText: string =
        result?.message ||
        "I'm here with you. Something went wrong on my end, but you can still tell me what's on your mind.";

      const assistantMessage: ChatMessage = {
        id: `local-assistant-${Date.now()}`,
        role: 'assistant',
        content: assistantText,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('❌ TRACE handleSend error:', err.message || String(err));
    } finally {
      setIsSending(false);
    }
  };

  console.log('🧩 TRACE chat render, messages length:', messages.length);
  if (messages[0]) {
    console.log('🧩 TRACE first message sample:', messages[0]);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <Pressable style={{ flex: 1 }} onPress={() => Keyboard.dismiss()}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={[styles.headerText, { color: theme.textPrimary, fontFamily: canelaFont }]}>
            TRACE
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: canelaFont }]}>
                Start a conversation with TRACE
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              style={styles.messagesList}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16 }}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.messageBubble,
                    item.role === 'user'
                      ? [styles.messageBubbleUser, { backgroundColor: theme.accent }]
                      : [styles.messageBubbleAssistant, { backgroundColor: theme.surface }],
                  ]}
                >
                  <Text
                    style={[
                      item.role === 'user'
                        ? styles.messageTextUser
                        : [styles.messageTextAssistant, { color: theme.textPrimary }],
                      { fontFamily: canelaFont },
                    ]}
                  >
                    {item.content}
                  </Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}
        </View>

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10, backgroundColor: theme.background }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                color: theme.textPrimary,
                fontFamily: canelaFont,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={500}
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() && !isSending ? theme.accent : theme.surface,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            <Text
              style={[
                styles.sendButtonText,
                {
                  color: inputText.trim() && !isSending ? '#FFFFFF' : theme.textSecondary,
                },
              ]}
            >
              {isSending ? '...' : '↑'}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerText: {
    fontSize: 24,
    letterSpacing: 8,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: BodyText.fontSize,
  },
  messagesList: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messageBubbleUser: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageBubbleAssistant: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageTextUser: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextAssistant: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: BodyText.fontSize,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
});
