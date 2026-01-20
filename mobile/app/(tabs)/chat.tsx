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
import { getDisplayName } from '../../lib/supabase';
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

// Get conversation storage key - keyed by userId for multi-user support
const getConversationStorageKey = (userId: string | null): string => {
  return userId ? `trace:conversation_history:${userId}` : 'trace:conversation_history:anonymous';
};

// Save conversation to AsyncStorage (keyed by userId)
const saveConversationToStorage = async (msgs: ChatMessage[], userId: string | null): Promise<void> => {
  try {
    const key = getConversationStorageKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(msgs));
    console.log('📱 Saved', msgs.length, 'messages to storage for user:', userId);
  } catch (e) {
    console.warn('Failed to save conversation to storage:', e);
  }
};

// Load conversation from AsyncStorage (keyed by userId)
const loadConversationFromStorage = async (userId: string | null): Promise<ChatMessage[]> => {
  try {
    const key = getConversationStorageKey(userId);
    const saved = await AsyncStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log('📱 Loaded conversation from storage:', parsed.length, 'messages for user:', userId);
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load conversation from storage:', e);
  }
  return [];
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
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  
  // Keep a ref to authUserId so callbacks can access current value
  const authUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    authUserIdRef.current = authUserId;
  }, [authUserId]);
  
  // Save to AsyncStorage whenever messages change (keyed by userId)
  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      const updated = limitMessages([...prev, msg]);
      saveConversationToStorage(updated, authUserIdRef.current); // Persist immediately
      return updated;
    });
  }, []);
  
  const addMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(prev => {
      const updated = limitMessages([...prev, ...msgs]);
      saveConversationToStorage(updated, authUserIdRef.current); // Persist immediately
      return updated;
    });
  }, []);
  const [stableId, setStableId] = useState<string | null>(null);
  const [welcomeText, setWelcomeText] = useState<string | null>(null);
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  // Track whether chat history has been loaded (to prevent greeting before history)
  const [historyLoaded, setHistoryLoaded] = useState(false);
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
      // FIRST: Check for pending activity completion BEFORE anything else
      // This is the highest priority - returning from activity should just append reflection
      let hasPendingActivity = false;
      try {
        const pendingCompletion = await AsyncStorage.getItem('trace:pendingActivityCompletion');
        if (pendingCompletion) {
          const { activity, duration, timestamp } = JSON.parse(pendingCompletion);
          const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
          
          if (ageMinutes < 5) {
            hasPendingActivity = true;
            console.log('🎯 INIT: Found pending activity, will handle after loading:', activity);
          } else {
            await AsyncStorage.removeItem('trace:pendingActivityCompletion');
          }
        }
      } catch (e) {
        console.warn('Failed to check pending activity early:', e);
      }
      
      const deviceId = await getStableId();
      setStableId(deviceId);
      console.log('🆔 TRACE chat screen deviceId:', deviceId);

      // Try supabase.auth.getUser() first (preferred)
      const { data } = await supabase.auth.getUser();
      let userId = data?.user?.id ?? null;
      console.log('🆔 TRACE chat screen supabase authUserId:', userId);

      // Fallback: If auth session not ready, check AsyncStorage (set by onboarding)
      if (!userId) {
        try {
          const storedUserId = await AsyncStorage.getItem('user_id');
          if (storedUserId) {
            userId = storedUserId;
            console.log('🆔 TRACE chat screen using AsyncStorage userId:', userId);
          }
        } catch (e) {
          console.warn('🆔 TRACE failed to read userId from AsyncStorage:', e);
        }
      }

      setAuthUserId(userId);
      authUserIdRef.current = userId; // Update ref immediately
      console.log('🆔 TRACE chat screen final authUserId:', userId);
      
      // Load conversation from AsyncStorage (keyed by userId)
      const storedMessages = await loadConversationFromStorage(userId);
      if (storedMessages.length > 0) {
        setMessages(storedMessages);
        console.log('📱 Restored', storedMessages.length, 'messages from storage for user:', userId);
      }
      
      // If we have pending activity, handle it NOW before any greeting logic
      if (hasPendingActivity) {
        try {
          const pendingCompletion = await AsyncStorage.getItem('trace:pendingActivityCompletion');
          if (pendingCompletion) {
            const { activity, duration } = JSON.parse(pendingCompletion);
            await AsyncStorage.removeItem('trace:pendingActivityCompletion');
            
            console.log('🎯 INIT: Handling pending activity completion:', activity);
            
            // Append reflection to whatever messages we have
            const reflectionPrompt: ChatMessage = {
              id: `activity-reflection-${Date.now()}`,
              role: 'assistant',
              content: 'How was that?',
            };
            
            // Add to current messages (which may have been loaded from storage)
            setMessages(prev => {
              const updated = [...prev, reflectionPrompt];
              saveConversationToStorage(updated, userId);
              return updated;
            });
            
            setAwaitingOnboardingReflection(true);
            setLastCompletedActivityName(activity);
            setWelcomeLoading(false);
            setChatInitialized(true); // Mark as initialized - NO greeting needed
            setHistoryLoaded(true);
            
            // Log the activity
            logActivityCompletion({
              userId: userId,
              deviceId: deviceId,
              activityType: activity,
              durationSeconds: duration || 0,
            });
            
            // Notify backend
            if (userId) {
              fetch(`${CHAT_API_BASE}/api/onboarding/activity-complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, activityName: activity }),
              }).catch(err => console.error('Failed to notify activity complete:', err));
            }
            
            console.log('🎓 INIT: Activity reflection appended, skipping all greeting logic');
            return; // EXIT EARLY - no greeting logic needed
          }
        } catch (e) {
          console.warn('Failed to handle pending activity:', e);
        }
      }
      
      // Mark history as loaded (enables greeting logic for non-activity cases)
      setHistoryLoaded(true);
    };
    initIds();
  }, []);

  const fetchChatHistory = useCallback(
    async (userId: string | null, deviceId: string | null) => {
      try {
        console.log('🕰 TRACE syncing chat history from server...');

        // Don't use hardcoded fallback - require real userId or skip
        if (!userId) {
          console.log('⚠️ TRACE chat history: no userId, skipping fetch');
          return 0;
        }
        const url = `${CHAT_API_BASE}/api/chat-history?userId=${encodeURIComponent(userId)}`;

        const response = await fetch(url);

        if (!response.ok) {
          console.log('⚠️ TRACE chat history failed with status:', response.status);
          return 0;
        }

        const json = await response.json();

        if (json?.ok && Array.isArray(json.messages) && json.messages.length > 0) {
          const historyMessages: ChatMessage[] = json.messages.map(
            (m: { role: string; content: string }, index: number) => ({
              id: `history-${index}`,
              role: (m.role === 'assistant' ? 'assistant' : 'user') as ChatRole,
              content: m.content ?? '',
            })
          );

          console.log('✅ TRACE server history:', historyMessages.length, 'messages');

          // Only update if server has MORE messages than local (sync from server)
          setMessages((current) => {
            if (historyMessages.length > current.length) {
              saveConversationToStorage(historyMessages, userId); // Sync to storage
              return limitMessages(historyMessages);
            }
            return current; // Keep local if equal or more
          });
          
          return historyMessages.length;
        }
        return 0;
      } catch (err: any) {
        console.log('⚠️ TRACE chat history error:', err.message || String(err));
        return 0;
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
      
      // If server says to skip greeting (onboarding in progress), don't set welcome text
      if (result.skipGreeting) {
        console.log('✨ TRACE greeting: skipping (onboarding in progress)');
        setWelcomeLoading(false);
        return;
      }
      
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
  // Now uses POST to send userName from mobile (avoids Supabase sync lag)
  const fetchBootstrap = useCallback(async (userId: string): Promise<boolean> => {
    console.log('[BOOTSTRAP] called for userId:', userId);
    try {
      // Get display name from mobile's Supabase cache (no lag since mobile just wrote it)
      const userName = await getDisplayName(userId);
      console.log('[BOOTSTRAP] userName from mobile cache:', userName);
      
      // POST with userName to avoid backend needing to query Supabase
      const res = await fetch(`${CHAT_API_BASE}/api/chat/bootstrap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          userName: userName || null,
        }),
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

  // Track if we've already initialized the chat greeting - use state for reliable tracking
  const [chatInitialized, setChatInitialized] = useState(false);

  useEffect(() => {
    if (stableId !== null) {
      fetchChatHistory(authUserId, stableId);
    }
  }, [stableId, authUserId, fetchChatHistory]);

  // Helper to handle activity completion flow (appends reflection to existing conversation)
  const handlePendingActivityCompletion = useCallback(async (activity: string, duration: number, userId: string | null, deviceId: string | null) => {
    console.log('🎯 Activity completion detected:', activity, duration);
    
    // Log activity completion
    logActivityCompletion({
      userId: userId,
      deviceId: deviceId,
      activityType: activity,
      durationSeconds: duration || 0,
    });
    
    // Notify backend that activity is done (update onboarding_step)
    if (userId) {
      fetch(`${CHAT_API_BASE}/api/onboarding/activity-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId, activityName: activity }),
      }).catch(err => console.error('Failed to notify activity complete:', err));
    }
    
    // Append subtle reflection prompt to existing conversation (not a greeting)
    const reflectionPrompt: ChatMessage = {
      id: `activity-reflection-${Date.now()}`,
      role: 'assistant',
      content: 'How was that?',
    };
    addMessage(reflectionPrompt);
    
    // Set state for reflection capture
    setAwaitingOnboardingReflection(true);
    setLastCompletedActivityName(activity);
    setWelcomeLoading(false);
    
    console.log('🎓 TRACE: awaiting activity reflection for', activity);
  }, [addMessage]);

  // UNIFIED INITIALIZATION: Wait for history to load, then decide what to show
  // Uses state-based lock PLUS durable AsyncStorage flag for bootstrap
  useEffect(() => {
    if (!historyLoaded) return; // Wait for history to load first
    if (chatInitialized) return; // Already initialized this mount
    if (!authUserId || stableId === null) return;
    
    // Lock immediately to prevent duplicate calls this session
    setChatInitialized(true);
    console.log('🔒 Chat initialization starting - locked');
    
    const initializeChat = async () => {
      // PRIORITY 1: Check for pending activity completion (AsyncStorage backup)
      try {
        const pendingCompletion = await AsyncStorage.getItem('trace:pendingActivityCompletion');
        if (pendingCompletion) {
          const { activity, duration, timestamp } = JSON.parse(pendingCompletion);
          const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
          
          if (ageMinutes < 5) {
            console.log('🎯 Found pending activity completion, appending reflection:', activity);
            await AsyncStorage.removeItem('trace:pendingActivityCompletion');
            handlePendingActivityCompletion(activity, duration, authUserId, stableId);
            return; // Done - don't show greeting
          }
          await AsyncStorage.removeItem('trace:pendingActivityCompletion');
        }
      } catch (e) {
        console.warn('Failed to check pending activity:', e);
      }
      
      // PRIORITY 2: Check route params for activity completion
      if (params.completedActivity) {
        console.log('🎯 Found activity completion in params:', params.completedActivity);
        const duration = params.activityDuration ? parseInt(params.activityDuration, 10) : 0;
        handlePendingActivityCompletion(params.completedActivity, duration, authUserId, stableId);
        router.setParams({ completedActivity: undefined, activityDuration: undefined });
        return; // Done - don't show greeting
      }
      
      // PRIORITY 3: Check AsyncStorage for existing conversation (most reliable)
      const storedConversation = await loadConversationFromStorage(authUserId);
      if (storedConversation.length > 0) {
        console.log('🎯 Chat has existing conversation in storage, skipping greeting:', storedConversation.length, 'messages');
        setWelcomeLoading(false);
        return; // Done - user sees their existing conversation
      }
      
      // PRIORITY 4: Check if bootstrap was already shown for this user (durable flag)
      const bootstrapShownKey = `trace:bootstrapShown:${authUserId}`;
      const bootstrapAlreadyShown = await AsyncStorage.getItem(bootstrapShownKey);
      if (bootstrapAlreadyShown) {
        console.log('🎯 Bootstrap already shown for this user, skipping');
        setWelcomeLoading(false);
        return; // Done - bootstrap was already shown once, don't repeat
      }
      
      // PRIORITY 5: No history, no prior bootstrap - check if user is in onboarding state
      console.log('🎯 Checking bootstrap eligibility...');
      
      try {
        const userName = await getDisplayName(authUserId);
        const res = await fetch(`${CHAT_API_BASE}/api/chat/bootstrap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authUserId, userName: userName || null }),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.onboarding && Array.isArray(data.messages) && data.messages.length > 0) {
            // Mark bootstrap as shown for this user BEFORE setting messages
            await AsyncStorage.setItem(bootstrapShownKey, 'true');
            console.log('📝 Marked bootstrap as shown for user:', authUserId);
            
            const bootstrapMessages: ChatMessage[] = data.messages.map(
              (m: { role: string; content: string }, idx: number) => ({
                id: `bootstrap-${idx}-${Date.now()}`,
                role: (m.role === 'assistant' ? 'assistant' : 'user') as ChatRole,
                content: m.content,
              })
            );
            
            // Only set if truly empty - never overwrite existing conversation
            setMessages((current) => {
              if (current.length === 0) {
                saveConversationToStorage(bootstrapMessages, authUserId); // Persist immediately
                return bootstrapMessages;
              }
              return current;
            });
            if (bootstrapMessages[0]) setWelcomeText(bootstrapMessages[0].content);
            setWelcomeLoading(false);
            return; // Done - onboarding bootstrap shown (once and only once)
          }
        }
      } catch (e) {
        console.warn('Bootstrap failed:', e);
      }
      
      // PRIORITY 6: Not onboarding, show regular greeting for returning user
      try {
        setWelcomeLoading(true);
        const now = new Date();
        const result = await fetchWelcomeGreeting({
          userName: null,
          chatStyle: 'conversation',
          localTime: now.toLocaleTimeString(),
          localDay: now.toLocaleDateString('en-US', { weekday: 'long' }),
          localDate: now.toLocaleDateString(),
          userId: authUserId,
          deviceId: stableId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        setWelcomeText(result.text);
      } catch (err: any) {
        setWelcomeText("I'm really glad you're here. We can take this one breath, one thought at a time.");
      } finally {
        setWelcomeLoading(false);
      }
    };
    
    initializeChat();
  }, [historyLoaded, authUserId, stableId, chatInitialized, params.completedActivity, params.activityDuration, handlePendingActivityCompletion, router]);


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
    
    // Guard: Ensure authUserId is available before sending
    // Try multiple sources: state → supabase.auth → AsyncStorage
    let currentUserId = authUserId;
    if (!currentUserId) {
      console.log('⚠️ TRACE handleSend: authUserId is null, trying fallbacks...');
      
      // Try 1: Re-fetch from Supabase auth
      const { data } = await supabase.auth.getUser();
      currentUserId = data?.user?.id ?? null;
      
      // Try 2: Check AsyncStorage (set by onboarding)
      if (!currentUserId) {
        try {
          const storedUserId = await AsyncStorage.getItem('user_id');
          if (storedUserId) {
            currentUserId = storedUserId;
            console.log('✅ TRACE handleSend: using AsyncStorage userId:', currentUserId.slice(0, 8));
          }
        } catch (e) {
          console.warn('⚠️ TRACE handleSend: AsyncStorage read failed:', e);
        }
      } else {
        console.log('✅ TRACE handleSend: re-fetched supabase authUserId:', currentUserId.slice(0, 8));
      }
      
      if (currentUserId) {
        setAuthUserId(currentUserId);
      } else {
        console.error('❌ TRACE handleSend: No auth from any source, cannot send message');
        return; // Block send if no auth
      }
    }

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
            userId: currentUserId,
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
        userId: currentUserId,
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
