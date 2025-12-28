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

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? Colors.night : Colors.day;
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

        const res = await fetch(url);

        if (!res.ok) {
          console.log('⚠️ TRACE chat history failed with status:', res.status);
          return;
        }

        const data = await res.json();

        if (!data.ok || !Array.isArray(data.messages)) {
          console.log('ℹ️ TRACE chat history invalid or empty', data);
          return;
        }

        if (!data.messages.length) {
          console.log('ℹ️ TRACE chat history empty for this user');
          return;
        }

        setMessages((prev) => {
          if (prev.length > 0) return prev;
          return data.messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          }));
        });
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
    if (!input.trim() || isLoading) return;

    const text = input.trim();
    setInput('');

    const newUserMessage: Message = { role: 'user', content: text };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const now = new Date();
      const reply = await sendChatMessage({
        messages: [...messages, newUserMessage],
        userName: null,
        chatStyle: 'conversation',
        localTime: now.toLocaleTimeString(),
        localDay: now.toLocaleDateString('en-US', { weekday: 'long' }),
        localDate: now.toLocaleDateString(),
        userId: authUserId,
        deviceId: stableId,
      });

      if (reply?.message) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: reply.message,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      console.log('CHAT_SEND_ERROR', err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser ? theme.accent : theme.surface,
          },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: isUser ? '#FFFFFF' : theme.textPrimary,
              fontFamily: canelaFont,
            },
          ]}
        >
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.bottom}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={[styles.headerText, { color: theme.textPrimary, fontFamily: canelaFont }]}>
          TRACE
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: canelaFont }]}>
              Start a conversation with TRACE
            </Text>
          </View>
        }
      />

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
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor={theme.textSecondary}
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: input.trim() && !isLoading ? theme.accent : theme.surface,
            },
          ]}
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Text
            style={[
              styles.sendButtonText,
              {
                color: input.trim() && !isLoading ? '#FFFFFF' : theme.textSecondary,
              },
            ]}
          >
            {isLoading ? '...' : '↑'}
          </Text>
        </TouchableOpacity>
      </View>
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
  messagesList: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: 16,
    marginBottom: Spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: BodyText.fontSize,
    lineHeight: 22,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: BodyText.fontSize,
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
