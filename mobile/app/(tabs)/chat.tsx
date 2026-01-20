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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { BodyText, FontFamily } from '../../constants/typography';
import { useFonts } from 'expo-font';
import { playAmbient, stopAmbient } from '../../lib/ambientAudio';
import { sendChatMessage, fetchWelcomeGreeting, PatternContext } from '../../lib/chat';
import { getStableId } from '../../lib/stableId';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

// Helper to detect pattern-related questions
function isPatternQuestion(text: string): boolean {
  const lowerText = text.toLowerCase();
  const patternKeywords = [
    'pattern', 'patterns', 'peak window', 'peakwindow',
    'stress echo', 'rhythm', 'what helped', 'what helps',
    'weekly rhythm', 'energy tide', 'my patterns', 'explain patterns',
    'review my patterns', 'patterns page'
  ];
  return patternKeywords.some(k => lowerText.includes(k));
}

// Max age for pattern cache when sending to chat (24 hours - patterns are stable data)
const PATTERN_CHAT_CONTEXT_MAX_AGE = 24 * 60 * 60 * 1000;

// Fetch cached patterns from AsyncStorage with freshness check
async function getCachedPatterns(): Promise<PatternContext | null> {
  try {
    const cached = await AsyncStorage.getItem('cached_patterns');
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    
    // Check cache freshness - don't send stale data to chat
    const lastCalculatedAt = data.lastCalculatedAt || data.timestamp;
    if (lastCalculatedAt) {
      const age = Date.now() - new Date(lastCalculatedAt).getTime();
      if (age > PATTERN_CHAT_CONTEXT_MAX_AGE) {
        console.log('[CHAT] Pattern cache too old for chat context:', Math.round(age / 60000), 'min');
        return null;
      }
    }
    
    // Only send patterns that have valid data
    const context: PatternContext = {};
    
    // Peak Window - only include if has actual label (not fallback)
    if (data.peakWindow?.label && !data.peakWindow.label.includes('Not enough')) {
      context.peakWindow = data.peakWindow.label;
      context.peakWindowConfidence = data.peakWindow.confidence || 'medium';
    }
    
    // Stress Echoes - only if has label
    if (data.stressEchoes?.label && !data.stressEchoes.label.includes('Not enough')) {
      context.stressEchoes = data.stressEchoes.label;
      context.stressEchoesConfidence = data.stressEchoes.confidence || 'medium';
    }
    
    // Most Helpful Activity - only include if count >= 2
    const activityCount = data.mostHelpfulActivity?.count || 0;
    if (data.mostHelpfulActivity?.label && activityCount >= 2) {
      context.mostHelpfulActivity = data.mostHelpfulActivity.label;
      context.mostHelpfulCount = activityCount;
      context.mostHelpfulConfidence = data.mostHelpfulActivity.confidence || 'medium';
    }
    
    // Weekly rhythm peak day
    if (data.weeklyMoodTrend?.peakDay) {
      context.weeklyRhythmPeak = data.weeklyMoodTrend.peakDay;
    }
    
    // Include timestamp for AI to reference data age
    if (lastCalculatedAt) {
      context.lastCalculatedAt = lastCalculatedAt;
    }
    
    // Only return if we have at least one valid pattern
    return Object.keys(context).length > 0 ? context : null;
  } catch (err) {
    console.log('Could not fetch cached patterns:', err);
  }
  return null;
}
// These imports were moved here for organization but work fine
import { supabase } from '../../lib/supabaseClient';
import { logActivityCompletion } from '../../lib/activityAcknowledgment';
import { openSpotifyPlaylist } from '../../lib/spotify';
import { MoodSpace } from '../../lib/musicConfig';

const CHAT_API_BASE = 'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev';

const ACTIVITY_ROUTES: Record<string, string> = {
  'Breathing': '/activities/breathing',
  'Trace the Maze': '/activities/maze',
  'Walking Reset': '/activities/walking',
  'Rest': '/activities/rest',
  'Window': '/activities/window',
  'Echo': '/activities/echo',
  'Rising': '/activities/rising',
  'Drift': '/activities/drift',
  'Grounding': '/activities/grounding',
  'Pearl Ripple': '/activities/ripple',
  'Ripple': '/activities/ripple',
  'Basin': '/activities/basin',
  'Dreamscape': '/activities/dreamscape',
  // Spotify playlists handled separately via openSpotifyPlaylist
  'ground_playlist': 'spotify:ground',
  'drift_playlist': 'spotify:drift',
  'rising_playlist': 'spotify:rising',
};

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

const MAX_MESSAGES = 150;

const limitMessages = (msgs: ChatMessage[]): ChatMessage[] => {
  if (msgs.length <= MAX_MESSAGES) return msgs;
  return msgs.slice(-MAX_MESSAGES);
};

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? Colors.night : Colors.day;
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    completedActivity?: string; 
    activityDuration?: string; 
  }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => limitMessages([...prev, msg]));
  }, []);
  
  const addMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(prev => limitMessages([...prev, ...msgs]));
  }, []);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [stableId, setStableId] = useState<string | null>(null);
  const [welcomeText, setWelcomeText] = useState<string | null>(null);
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  // Onboarding reflection flow state
  const [awaitingOnboardingReflection, setAwaitingOnboardingReflection] = useState(false);
  const [lastCompletedActivityName, setLastCompletedActivityName] = useState<string | null>(null);

  // Night Swim player state
  const [showNightSwimPlayer, setShowNightSwimPlayer] = useState(false);
  const [nightSwimSession, setNightSwimSession] = useState(0); // Session counter for forcing remount
  const [nightSwimTracks, setNightSwimTracks] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isNightSwimPlaying, setIsNightSwimPlaying] = useState(false);
  const [isNightSwimLoading, setIsNightSwimLoading] = useState(false);
  const nightSwimSoundRef = useRef<Audio.Sound | null>(null);

  const [fontsLoaded] = useFonts({
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;

  useFocusEffect(
    useCallback(() => {
      if (!showNightSwimPlayer) {
        playAmbient("main", require("../../assets/audio/trace_ambient.m4a"), 0.35);
      }
      
      return () => {
        stopAmbient().catch(() => {});
        // Cleanup Night Swim audio on unfocus
        if (nightSwimSoundRef.current) {
          nightSwimSoundRef.current.unloadAsync().catch(() => {});
        }
      };
    }, [showNightSwimPlayer])
  );

  // Night Swim player functions
  const openNightSwimPlayer = async (autoplay: boolean = true, trackIndex: number = 0) => {
    console.log('🎵 Opening Night Swim player, autoplay:', autoplay, 'track:', trackIndex, 'session:', nightSwimSession + 1);
    
    // Stop any existing playback first
    if (nightSwimSoundRef.current) {
      await nightSwimSoundRef.current.stopAsync().catch(() => {});
      await nightSwimSoundRef.current.unloadAsync().catch(() => {});
      nightSwimSoundRef.current = null;
    }
    setIsNightSwimPlaying(false);
    
    stopAmbient();
    
    // Increment session counter to force React remount (handles back-to-back requests)
    setNightSwimSession(prev => prev + 1);
    setShowNightSwimPlayer(true);
    setIsNightSwimLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('trace_originals_tracks')
        .select('*')
        .eq('album', 'night_swim')
        .order('track_number', { ascending: true });

      if (error) {
        console.error('Error loading Night Swim tracks:', error);
        setIsNightSwimLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setNightSwimTracks(data);
        setCurrentTrackIndex(trackIndex);
        console.log('🎵 Loaded Night Swim tracks:', data.length);
        
        if (autoplay) {
          await playNightSwimTrack(data[trackIndex] || data[0]);
        }
      } else {
        console.warn('🎵 No Night Swim tracks found in database');
      }
    } catch (err) {
      console.error('Failed to load Night Swim tracks:', err);
    } finally {
      setIsNightSwimLoading(false);
    }
  };

  const playNightSwimTrack = async (track: any) => {
    try {
      if (nightSwimSoundRef.current) {
        await nightSwimSoundRef.current.unloadAsync();
        nightSwimSoundRef.current = null;
      }

      setIsNightSwimLoading(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audio_url },
        { shouldPlay: true, volume: 0.8 }
      );
      
      nightSwimSoundRef.current = sound;
      setIsNightSwimPlaying(true);
      setCurrentTrackIndex(track.track_number - 1);
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          // Auto-play next track
          const nextIndex = (track.track_number) % nightSwimTracks.length;
          const nextTrack = nightSwimTracks[nextIndex];
          if (nextTrack) {
            playNightSwimTrack(nextTrack);
          } else {
            setIsNightSwimPlaying(false);
          }
        }
      });
    } catch (err) {
      console.error('Error playing Night Swim track:', err);
    } finally {
      setIsNightSwimLoading(false);
    }
  };

  const toggleNightSwimPlayPause = async () => {
    if (!nightSwimSoundRef.current) {
      if (nightSwimTracks.length > 0) {
        await playNightSwimTrack(nightSwimTracks[currentTrackIndex]);
      }
      return;
    }

    const status = await nightSwimSoundRef.current.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await nightSwimSoundRef.current.pauseAsync();
        setIsNightSwimPlaying(false);
      } else {
        await nightSwimSoundRef.current.playAsync();
        setIsNightSwimPlaying(true);
      }
    }
  };

  const closeNightSwimPlayer = async () => {
    if (nightSwimSoundRef.current) {
      await nightSwimSoundRef.current.unloadAsync();
      nightSwimSoundRef.current = null;
    }
    setShowNightSwimPlayer(false);
    setIsNightSwimPlaying(false);
    playAmbient("main", require("../../assets/audio/trace_ambient.m4a"), 0.35);
  };

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
            current.length === 0 ? limitMessages(historyMessages) : current
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

  const fetchGreeting = useCallback(async () => {
    try {
      setWelcomeLoading(true);
      console.log('✨ TRACE greeting: starting fetchWelcomeGreeting');

      const now = new Date();
      const result = await fetchWelcomeGreeting({
        userName: null,
        chatStyle: 'conversation',
        localTime: now.toLocaleTimeString(),
        localDay: now.toLocaleDateString('en-US', { weekday: 'long' }),
        localDate: now.toLocaleDateString(),
        userId: authUserId ?? null,
        deviceId: stableId ?? null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      console.log('✨ TRACE greeting result:', result);
      setWelcomeText(result.text);
    } catch (err: any) {
      console.error('❌ TRACE greeting error:', err?.message || err);
      setWelcomeText(
        "I'm really glad you're here. We can take this one breath, one thought at a time."
      );
    } finally {
      setWelcomeLoading(false);
    }
  }, [authUserId, stableId]);

  // Bootstrap: fetch onboarding intro variant for new users
  // Returns true if onboarding, false otherwise
  const fetchBootstrap = useCallback(async (): Promise<boolean> => {
    console.log('[BOOTSTRAP] called');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        console.log('[BOOTSTRAP] no auth token, skipping');
        return false;
      }
      
      const res = await fetch(`${CHAT_API_BASE}/api/chat/bootstrap`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        console.log('[BOOTSTRAP] error status:', res.status);
        return false;
      }
      
      const data = await res.json();
      console.log('[BOOTSTRAP] response', data);
      
      // If onboarding and messages returned, seed the chat
      if (data.onboarding && Array.isArray(data.messages) && data.messages.length > 0) {
        const bootstrapMessages: ChatMessage[] = data.messages.map(
          (m: { role: string; content: string }, idx: number) => ({
            id: `bootstrap-${idx}-${Date.now()}`,
            role: (m.role === 'assistant' ? 'assistant' : 'user') as ChatRole,
            content: m.content,
          })
        );
        
        // Only set if messages array is currently empty
        setMessages((current) => {
          if (current.length === 0) {
            console.log('[BOOTSTRAP] seeding messages with', bootstrapMessages.length, 'intro messages');
            return bootstrapMessages;
          }
          return current;
        });
        
        // Also set welcome text from first message (for empty state display)
        if (bootstrapMessages[0]) {
          setWelcomeText(bootstrapMessages[0].content);
        }
        
        return true; // Is onboarding
      }
      
      return data.onboarding === true;
    } catch (err: any) {
      console.error('[BOOTSTRAP] error:', err?.message || err);
      return false;
    }
  }, []);

  useEffect(() => {
    if (stableId !== null) {
      fetchChatHistory(authUserId, stableId);
      
      // Run bootstrap first - only call greeting if NOT onboarding
      fetchBootstrap().then((isOnboarding) => {
        if (!isOnboarding) {
          console.log('[BOOTSTRAP] not onboarding, calling greeting API');
          fetchGreeting();
        } else {
          console.log('[BOOTSTRAP] is onboarding, skipping greeting API');
          setWelcomeLoading(false);
        }
      });
    }
  }, [authUserId, stableId, fetchChatHistory, fetchBootstrap, fetchGreeting]);

  useEffect(() => {
    if (params.completedActivity && stableId !== null) {
      const activity = params.completedActivity;
      const duration = params.activityDuration ? parseInt(params.activityDuration, 10) : undefined;
      
      console.log('🎯 Activity completion detected:', activity, duration);
      
      // Log activity completion
      logActivityCompletion({
        userId: authUserId,
        deviceId: stableId,
        activityType: activity,
        durationSeconds: duration || 0,
      });
      
      // Immediately append reflection prompt (onboarding flow)
      const reflectionPrompt: ChatMessage = {
        id: `onboard-ack-${Date.now()}`,
        role: 'assistant',
        content: 'Welcome back. Did that help at all?',
      };
      addMessage(reflectionPrompt);
      
      // Set state for reflection capture
      setAwaitingOnboardingReflection(true);
      setLastCompletedActivityName(activity);
      
      console.log('🎓 TRACE: awaiting onboarding reflection for', activity);
      
      router.setParams({ completedActivity: undefined, activityDuration: undefined });
    }
  }, [params.completedActivity, stableId, authUserId]);


  // Check for pending journal conversation invite
  useEffect(() => {
    const checkPendingJournalInvite = async () => {
      try {
        const pending = await AsyncStorage.getItem('trace:pendingJournalInvite');
        if (!pending) return;

        const { message, timestamp } = JSON.parse(pending);
        
        // Only show if less than 24 hours old
        const ageHours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) {
          await AsyncStorage.removeItem('trace:pendingJournalInvite');
          return;
        }

        // Add as TRACE message
        const traceMsg: ChatMessage = {
          id: `journal-invite-${Date.now()}`,
          role: 'assistant',
          content: message,
        };

        addMessage(traceMsg);
        console.log('[Chat] Journal invitation displayed');

        // Clear the pending invite
        await AsyncStorage.removeItem('trace:pendingJournalInvite');
      } catch (error) {
        console.error('[Chat] Failed to check journal invite:', error);
      }
    };

    // Check on mount
    if (stableId !== null) {
      checkPendingJournalInvite();
    }
  }, [stableId]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const previousMessages = messages;

    addMessage(userMessage);
    setInputText('');
    setIsSending(true);

    console.log('📤 TRACE sending message:', trimmed);

    // Onboarding reflection flow: intercept user's reflection response
    if (awaitingOnboardingReflection && lastCompletedActivityName) {
      console.log('🎓 TRACE onboarding: capturing reflection for', lastCompletedActivityName);
      
      try {
        // POST to /api/onboarding/reflection
        await fetch(`${CHAT_API_BASE}/api/onboarding/reflection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authUserId,
            activity_id: lastCompletedActivityName,
            felt_shift: trimmed,
          }),
        });
        console.log('🎓 TRACE onboarding: reflection saved');
      } catch (err) {
        console.error('🎓 TRACE onboarding: reflection save error:', err);
      }

      // Clear onboarding reflection state
      setAwaitingOnboardingReflection(false);
      setLastCompletedActivityName(null);

      // Add the two response messages with delay
      setTimeout(() => {
        const msg1: ChatMessage = {
          id: `onboard-noted-${Date.now()}`,
          role: 'assistant',
          content: "Noted. I'll remember.",
        };
        addMessage(msg1);

        setTimeout(() => {
          const msg2: ChatMessage = {
            id: `onboard-followup-${Date.now()}`,
            role: 'assistant',
            content: "Do you want to talk about what's driving it — or do you want quiet for a bit?",
          };
          addMessage(msg2);
          setIsSending(false);
        }, 800);
      }, 400);

      // Return early - do not call /api/chat for reflection message
      return;
    }

    try {
      const now = new Date();

      const payloadMessages = [...previousMessages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      console.log('📤 TRACE sending payload messages:', payloadMessages.length);

      // Check if user is asking about patterns - if so, fetch cached patterns
      let patternContext: PatternContext | null = null;
      if (isPatternQuestion(trimmed)) {
        console.log('📊 TRACE detected pattern question, fetching cached patterns');
        patternContext = await getCachedPatterns();
        if (patternContext) {
          console.log('📊 TRACE found cached patterns:', patternContext);
        }
      }

      const result = await sendChatMessage({
        messages: payloadMessages,
        userName: null,
        chatStyle: 'conversation',
        localTime: now.toLocaleTimeString(),
        localDay: now.toLocaleDateString('en-US', { weekday: 'long' }),
        localDate: now.toLocaleDateString(),
        userId: authUserId,
        deviceId: stableId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        patternContext,
      });

      console.log('📥 TRACE received reply:', result);

      // Handle multi-message crisis responses (2-3 messages displayed sequentially)
      if (result?.isCrisisMultiMessage && result?.messages && result.messages.length > 1) {
        console.log('📥 TRACE crisis multi-message mode:', result.messages.length, 'messages');
        
        // Add each message with a delay to feel more genuine
        for (let i = 0; i < result.messages.length; i++) {
          const messageText = result.messages[i];
          const messageId = `local-assistant-${Date.now()}-${i}`;
          
          // Add message with typing delay (800ms between each)
          await new Promise(resolve => setTimeout(resolve, i === 0 ? 0 : 800));
          
          const assistantMessage: ChatMessage = {
            id: messageId,
            role: 'assistant',
            content: messageText,
          };
          
          addMessage(assistantMessage);
        }
      } else {
        // Normal single message response
        let assistantText: string =
          result?.message ||
          "I'm here with you. Something went wrong on my end, but you can still tell me what's on your mind.";

        // Append pattern explainability line if pattern_metadata is present
        if (result?.pattern_metadata?.type === 'PATTERN' && result.pattern_metadata.signals_used?.length > 0) {
          const signals = result.pattern_metadata.signals_used.join(', ');
          const confidence = result.pattern_metadata.confidence || 'moderate';
          assistantText += `\n\nSignals: ${signals} • Confidence: ${confidence}`;
          console.log('📊 TRACE appended pattern explainability line');
        }

        const assistantMessage: ChatMessage = {
          id: `local-assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantText,
        };

        addMessage(assistantMessage);
      }

      const suggestion = result?.activity_suggestion;
      if (suggestion?.should_navigate === true && suggestion?.name) {
        const route = ACTIVITY_ROUTES[suggestion.name];
        
        // Handle Spotify playlists with fallback
        if (route?.startsWith('spotify:')) {
          const mood = route.replace('spotify:', '') as MoodSpace;
          console.log('🎵 TRACE opening Spotify playlist:', mood);
          setTimeout(async () => {
            const success = await openSpotifyPlaylist(mood);
            if (success) {
              console.log('🎵 TRACE Spotify opened successfully');
            } else {
              console.warn('🎵 TRACE Spotify failed to open');
            }
          }, 800);
        } else if (route) {
          console.log('🧭 TRACE navigating to activity:', suggestion.name, route);
          setTimeout(() => {
            // Pass dreamscapeTrackId for Dreamscape activity
            if (suggestion.name === 'Dreamscape' && suggestion.dreamscapeTrackId) {
              console.log('🌙 TRACE Dreamscape with trackId:', suggestion.dreamscapeTrackId);
              router.push({
                pathname: route as any,
                params: { 
                  dreamscapeTrackId: suggestion.dreamscapeTrackId,
                  selectionMode: 'ai_selected',
                  selectionSource: 'chat'
                }
              });
            } else {
              router.push(route as any);
            }
          }, 800);
        } else {
          console.warn('🧭 TRACE unknown activity route:', suggestion.name);
        }
      }
      
      // Handle TRACE audio_action (Night Swim originals or Spotify fallback)
      const audioAction = result?.audio_action;
      if (audioAction?.type === 'open') {
        console.log('🎵 TRACE audio_action: open', audioAction);
        
        if (audioAction.source === 'originals') {
          // TRACE Originals (Night Swim) - spawn inline player on chat page
          console.log('🎵 Opening TRACE Originals (Night Swim) player');
          setTimeout(() => {
            openNightSwimPlayer(
              audioAction.autoplay !== false,
              audioAction.track || 0
            );
          }, 600);
        } else if (audioAction.source === 'spotify') {
          // Spotify fallback - open Spotify app/web
          console.log('🎵 Opening Spotify playlist:', audioAction.album);
          setTimeout(async () => {
            const mood = audioAction.album as MoodSpace;
            await openSpotifyPlaylist(mood);
          }, 600);
        } else {
          // Default to originals if source not specified
          console.log('🎵 No source specified, defaulting to Originals');
          setTimeout(() => {
            openNightSwimPlayer(
              audioAction.autoplay !== false,
              audioAction.track || 0
            );
          }, 600);
        }
      } else if (audioAction?.type === 'recommend') {
        // TRACE is offering Night Swim - just log for now, player opens on user agreement
        console.log('🎵 TRACE audio_action: recommend (waiting for user agreement)');
      }
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

        {/* Night Swim Player - spawns at orb position (60px below wordmark) */}
        {/* key={nightSwimSession} forces React to remount on back-to-back requests */}
        {showNightSwimPlayer && (
          <View key={`nightswim-${nightSwimSession}`} style={[styles.nightSwimPlayer, { top: insets.top + 60 }]}>
            <View style={styles.nightSwimContent}>
              <Pressable onPress={closeNightSwimPlayer} style={styles.nightSwimClose}>
                <Text style={styles.nightSwimCloseText}>✕</Text>
              </Pressable>
              
              <Text style={[styles.nightSwimTitle, { fontFamily: canelaFont }]}>
                Night Swim
              </Text>
              <Text style={[styles.nightSwimArtist, { fontFamily: canelaFont }]}>
                TRACE Originals
              </Text>
              
              {nightSwimTracks.length > 0 && (
                <Text style={[styles.nightSwimTrack, { fontFamily: canelaFont }]}>
                  {nightSwimTracks[currentTrackIndex]?.title || 'Loading...'}
                </Text>
              )}
              
              <View style={styles.nightSwimControls}>
                {isNightSwimLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Pressable onPress={toggleNightSwimPlayPause} style={styles.nightSwimPlayBtn}>
                    <Text style={styles.nightSwimPlayIcon}>
                      {isNightSwimPlaying ? '⏸' : '▶️'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: canelaFont }]}>
                {welcomeLoading && !welcomeText
                  ? 'Just a moment while I arrive with you...'
                  : welcomeText ??
                    "I'm really glad you're here. We can take this one breath, one thought at a time."}
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
  // Night Swim Player styles
  nightSwimPlayer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 100,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 15, 35, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nightSwimContent: {
    padding: 16,
    alignItems: 'center',
  },
  nightSwimClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nightSwimCloseText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  nightSwimTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  nightSwimArtist: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  nightSwimTrack: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  nightSwimControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nightSwimPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nightSwimPlayIcon: {
    fontSize: 20,
  },
});
