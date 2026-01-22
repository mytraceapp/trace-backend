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
  Linking,
  Alert,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { BodyText, FontFamily } from '../../constants/typography';
import { useFonts } from 'expo-font';
import { playAmbient, stopAmbient } from '../../lib/ambientAudio';
import { sendChatMessage, fetchWelcomeGreeting, PatternContext } from '../../lib/chat';
import { getStableId } from '../../lib/stableId';
import { logSuggestionAccepted, logSuggestionCompleted, logNegativeResponse } from '../../lib/telemetry';
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
  'breathing': '/activities/breathing',
  'Trace the Maze': '/activities/maze',
  'Maze': '/activities/maze',
  'maze': '/activities/maze',
  'Walking Reset': '/activities/walking',
  'Rest': '/activities/rest',
  'rest': '/activities/rest',
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

// ==================== WEEK 1 PAYOFF (Retention Feature) ====================
// AsyncStorage keys
const WEEK1_KEYS = {
  FIRST_SEEN_AT: 'week1_first_seen_at',
  ACTIVITY_COUNT: 'week1_activity_complete_count',
  PAYOFF_SHOWN: 'week1_payoff_shown',
  PAYOFF_DISMISSED: 'week1_payoff_dismissed',
  PAYOFF_COMPLETED: 'week1_payoff_completed',
  HOOK_HISTORY: 'week1_hook_history_v1',
  LEADIN_HISTORY: 'week1_leadin_history_v1',
  CLOSING_HISTORY: 'week1_closing_history_v1',
};

// 72 hours in milliseconds
const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

// Hook templates (8 variants)
const WEEK1_HOOK_TEMPLATES = [
  { id: 'h1', text: (pattern: string) => `Quick thing I'm noticing: ${pattern}.\n\nWant a 30-second summary?` },
  { id: 'h2', text: (pattern: string) => `Something interesting: ${pattern}.\n\nCan I share what I'm seeing?` },
  { id: 'h3', text: (pattern: string) => `I've been paying attention. ${pattern}.\n\nWant to hear what else I've noticed?` },
  { id: 'h4', text: (pattern: string) => `Small pattern emerging: ${pattern}.\n\nWant the quick version?` },
  { id: 'h5', text: (pattern: string) => `Noticing something about you: ${pattern}.\n\nShould I break it down?` },
  { id: 'h6', text: (pattern: string) => `I'm starting to see a rhythm: ${pattern}.\n\nWant the highlights?` },
  { id: 'h7', text: (pattern: string) => `Early read on your patterns: ${pattern}.\n\nInterested in hearing more?` },
  { id: 'h8', text: (pattern: string) => `Something's clicking: ${pattern}.\n\nWant me to walk you through it?` },
];

// Lead-in templates (4 variants)
const WEEK1_LEADIN_TEMPLATES = [
  { id: 'l1', text: "Okay. Here's what I'm seeing so far:" },
  { id: 'l2', text: "Sure. Here's what I've picked up:" },
  { id: 'l3', text: "Alright, here's the short version:" },
  { id: 'l4', text: "Got it. Here's what stands out:" },
];

// Closing templates (4 variants)
const WEEK1_CLOSING_TEMPLATES = [
  { id: 'c1', text: "Want me to keep tracking this?" },
  { id: 'c2', text: "I'll keep an eye on this — just checking in." },
  { id: 'c3', text: "Let me know if you want updates on this." },
  { id: 'c4', text: "I'm here if you want to dig deeper sometime." },
];

// LRU template selection (picks fresh template, tracks history)
async function selectFreshTemplate<T extends { id: string }>(
  templates: T[],
  historyKey: string,
  maxHistory: number = 10,
  maxRerolls: number = 3
): Promise<T> {
  let history: string[] = [];
  try {
    const stored = await AsyncStorage.getItem(historyKey);
    if (stored) history = JSON.parse(stored);
  } catch (e) {}

  let selected: T | null = null;
  let attempts = 0;

  while (attempts < maxRerolls) {
    const randomIndex = Math.floor(Math.random() * templates.length);
    const candidate = templates[randomIndex];
    if (!history.includes(candidate.id)) {
      selected = candidate;
      break;
    }
    attempts++;
  }

  // If still colliding after rerolls, pick LRU (oldest in history or first not in history)
  if (!selected) {
    if (history.length > 0) {
      const lruId = history[0];
      selected = templates.find(t => t.id === lruId) || templates[0];
    } else {
      selected = templates[0];
    }
  }

  // Update history (append new, trim to max)
  history = history.filter(id => id !== selected!.id);
  history.push(selected.id);
  if (history.length > maxHistory) history = history.slice(-maxHistory);

  try {
    await AsyncStorage.setItem(historyKey, JSON.stringify(history));
  } catch (e) {}

  return selected;
}

// Consent detection
function isWeek1ConsentYes(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const yesPatterns = ['yes', 'yeah', 'ok', 'okay', 'show me', 'sure', 'yep', 'please', 'do it', 'go ahead', 'tell me', 'hit me'];
  return yesPatterns.some(p => lower.includes(p));
}

function isWeek1ConsentNo(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const noPatterns = ['no', 'nope', 'skip', 'not now', 'later', 'pass', 'nah'];
  return noPatterns.some(p => lower === p || lower.startsWith(p + ' ') || lower.endsWith(' ' + p));
}

// Compute insight content from local data
async function computeWeek1Insights(chatMessages: ChatMessage[]): Promise<{ pattern: string; trigger: string; support: string; caveat: boolean }> {
  let activityCount = 0;
  let lastActivity = 'Breathing';
  let reflectionCount = 0;

  try {
    const countStr = await AsyncStorage.getItem(WEEK1_KEYS.ACTIVITY_COUNT);
    activityCount = countStr ? parseInt(countStr, 10) : 0;
    
    const lastActivityStr = await AsyncStorage.getItem('lastCompletedActivityName');
    if (lastActivityStr) lastActivity = lastActivityStr;
  } catch (e) {}

  // Extract reflection themes from last 3 user messages after assistant "Noted" responses
  const userMessages = chatMessages.filter(m => m.role === 'user').slice(-6);
  let stressedMentions = 0;
  let tiredMentions = 0;
  let overwhelmedMentions = 0;

  for (const m of userMessages) {
    const lower = m.content.toLowerCase();
    if (lower.includes('stressed') || lower.includes('stress')) stressedMentions++;
    if (lower.includes('tired') || lower.includes('exhausted')) tiredMentions++;
    if (lower.includes('overwhelmed') || lower.includes('too much')) overwhelmedMentions++;
    if (lower.includes('reflect') || lower.includes('felt') || lower.includes('feel')) reflectionCount++;
  }

  // Infer pattern
  let pattern = "your stress shows up most often later in the day";
  if (stressedMentions > tiredMentions && stressedMentions > overwhelmedMentions) {
    pattern = "stress seems to be a recurring theme for you";
  } else if (tiredMentions > stressedMentions) {
    pattern = "fatigue or low energy comes up a lot";
  } else if (overwhelmedMentions > 0) {
    pattern = "you often feel like there's too much going on";
  }

  // Infer trigger
  let trigger = "it tends to rise after mentally heavy days";
  if (tiredMentions > 0) {
    trigger = "it often follows periods of not enough rest";
  } else if (overwhelmedMentions > 0) {
    trigger = "it spikes when responsibilities pile up";
  }

  // Infer support
  let support = `${lastActivity} helps fastest for you right now`;
  if (activityCount >= 2) {
    support = `${lastActivity} seems to work well for you`;
  }

  // Caveat if insufficient data
  const caveat = activityCount < 2 || reflectionCount < 2;

  return { pattern, trigger, support, caveat };
}

// Check if Week 1 payoff should trigger (returns true if should trigger)
async function shouldTriggerWeek1Payoff(): Promise<{ shouldTrigger: boolean; reason: 'activity' | '72h' | null }> {
  try {
    // Check permanent gate - if already shown or dismissed, never trigger again
    const payoffShown = await AsyncStorage.getItem(WEEK1_KEYS.PAYOFF_SHOWN);
    const payoffDismissed = await AsyncStorage.getItem(WEEK1_KEYS.PAYOFF_DISMISSED);
    
    if (payoffShown === 'true' || payoffDismissed === 'true') {
      return { shouldTrigger: false, reason: null };
    }
    
    // Check activity count trigger (>= 3)
    const activityCountStr = await AsyncStorage.getItem(WEEK1_KEYS.ACTIVITY_COUNT);
    const activityCount = activityCountStr ? parseInt(activityCountStr, 10) : 0;
    
    if (activityCount >= 3) {
      return { shouldTrigger: true, reason: 'activity' };
    }
    
    // Check 72h trigger
    const firstSeenStr = await AsyncStorage.getItem(WEEK1_KEYS.FIRST_SEEN_AT);
    if (firstSeenStr) {
      const firstSeenAt = parseInt(firstSeenStr, 10);
      const elapsed = Date.now() - firstSeenAt;
      
      if (elapsed >= SEVENTY_TWO_HOURS_MS) {
        return { shouldTrigger: true, reason: '72h' };
      }
    }
    
    return { shouldTrigger: false, reason: null };
  } catch (e) {
    console.warn('📊 WEEK1: Error checking trigger:', e);
    return { shouldTrigger: false, reason: null };
  }
}

// Insert Week 1 hook message and set consent state
async function insertWeek1Hook(
  addMessage: (msg: ChatMessage) => void,
  chatMessages: ChatMessage[],
  setAwaitingConsent: (v: boolean) => void
): Promise<void> {
  try {
    // Mark as shown immediately (permanent gate)
    await AsyncStorage.setItem(WEEK1_KEYS.PAYOFF_SHOWN, 'true');
    
    // Compute pattern for hook
    const insights = await computeWeek1Insights(chatMessages);
    
    // Select fresh hook template
    const hookTemplate = await selectFreshTemplate(WEEK1_HOOK_TEMPLATES, WEEK1_KEYS.HOOK_HISTORY, 10, 3);
    const hookText = hookTemplate.text(insights.pattern);
    
    // Insert hook message
    addMessage({
      id: `week1-hook-${Date.now()}`,
      role: 'assistant',
      content: hookText,
    });
    
    // Set consent state
    setAwaitingConsent(true);
    
    console.log('📊 WEEK1: Hook inserted, awaiting consent');
  } catch (e) {
    console.warn('📊 WEEK1: Error inserting hook:', e);
  }
}

// Crisis support: dial 988 or contact
const handleCrisisDial = async (
  dial?: string, 
  dialContact?: string, 
  addCrisisMessage?: (msg: ChatMessage) => void
): Promise<void> => {
  if (dial === '988') {
    console.log('[CRISIS] Dialing 988 crisis line');
    await Linking.openURL('tel:988');
    return;
  }
  
  if (dialContact) {
    console.log('[CRISIS] Looking up contact:', dialContact);
    
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('[CRISIS] Contacts permission denied');
        if (addCrisisMessage) {
          addCrisisMessage({
            id: `crisis-permission-${Date.now()}`,
            role: 'assistant',
            content: "I can't access contacts on this device.\n\nIf you're in the U.S., type CALL 988 and I'll pull that up.",
          });
        }
        return;
      }
      
      // Search for contact by name
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        name: dialContact,
      });
      
      if (data.length > 0 && data[0].phoneNumbers && data[0].phoneNumbers.length > 0) {
        const phone = data[0].phoneNumbers[0].number;
        console.log('[CRISIS] Found contact, dialing:', phone);
        await Linking.openURL(`tel:${phone}`);
      } else {
        console.log('[CRISIS] Contact not found:', dialContact);
        if (addCrisisMessage) {
          addCrisisMessage({
            id: `crisis-notfound-${Date.now()}`,
            role: 'assistant',
            content: `I couldn't find ${dialContact} in your contacts.\n\nIf you're in the U.S., type CALL 988 and I'll pull that up.`,
          });
        }
      }
    } catch (err) {
      console.error('[CRISIS] Contact lookup error:', err);
      if (addCrisisMessage) {
        addCrisisMessage({
          id: `crisis-error-${Date.now()}`,
          role: 'assistant',
          content: "Something went wrong looking up that contact.\n\nIf you're in the U.S., type CALL 988 and I'll pull that up.",
        });
      }
    }
  }
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

  // Week 1 Payoff state (in-memory only for consent tracking)
  const [awaitingWeek1PayoffConsent, setAwaitingWeek1PayoffConsent] = useState(false);
  const week1ConsentPendingCountRef = useRef(0); // In-memory counter, not persisted

  // Night Swim player state
  const [showNightSwimPlayer, setShowNightSwimPlayer] = useState(false);
  const [nightSwimSession, setNightSwimSession] = useState(0); // Session counter for forcing remount
  
  // Track TRACE Studios music reveal context to avoid playlist clash
  const [traceStudiosContext, setTraceStudiosContext] = useState<string | null>(null);
  const [nightSwimTracks, setNightSwimTracks] = useState<any[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isNightSwimPlaying, setIsNightSwimPlaying] = useState(false);
  const [isNightSwimLoading, setIsNightSwimLoading] = useState(false);
  const nightSwimSoundRef = useRef<Audio.Sound | null>(null);
  
  // Track brain suggestions for telemetry
  const lastBrainSuggestionRef = useRef<{
    suggestion_id: string;
    activity_name: string;
    type: string;
    shown_ts: number;
    accepted_ts?: number;
  } | null>(null);

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

  // Week 1 Payoff: Check 72h trigger on mount
  useEffect(() => {
    const check72hTrigger = async () => {
      // Only trigger if we have history loaded and not already awaiting consent
      if (!historyLoaded || awaitingWeek1PayoffConsent) return;
      
      const { shouldTrigger, reason } = await shouldTriggerWeek1Payoff();
      if (shouldTrigger && reason === '72h') {
        console.log('📊 WEEK1: Triggering on mount (72h passed)');
        await insertWeek1Hook(addMessage, messages, setAwaitingWeek1PayoffConsent);
      }
    };
    
    check72hTrigger();
  }, [historyLoaded]); // Only run when history is loaded

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

  // SINGLE UNIFIED INIT - handles everything in one sequential flow
  useEffect(() => {
    const initChat = async () => {
      console.log('🚀 UNIFIED INIT: Starting...');
      
      // Step 1: Get device ID
      const deviceId = await getStableId();
      setStableId(deviceId);
      console.log('🆔 deviceId:', deviceId);

      // Step 2: Get user ID
      const { data } = await supabase.auth.getUser();
      let userId = data?.user?.id ?? null;
      if (!userId) {
        try {
          const storedUserId = await AsyncStorage.getItem('user_id');
          if (storedUserId) userId = storedUserId;
        } catch (e) {}
      }
      setAuthUserId(userId);
      authUserIdRef.current = userId;
      console.log('🆔 userId:', userId);

      // Step 3: Load existing conversation from SERVER (Supabase) with one-hour session logic
      let serverMessages: ChatMessage[] = [];
      let sessionActive = false; // Is there an active session (messages within last hour)?
      
      if (userId) {
        try {
          const res = await fetch(`${CHAT_API_BASE}/api/chat-history?userId=${encodeURIComponent(userId)}`);
          if (res.ok) {
            const json = await res.json();
            if (json?.ok && Array.isArray(json.messages) && json.messages.length > 0) {
              serverMessages = json.messages.map((m: { role: string; content: string; created_at?: string }, idx: number) => ({
                id: `server-${idx}`,
                role: (m.role === 'assistant' ? 'assistant' : 'user') as ChatRole,
                content: m.content,
                timestamp: m.created_at,
              }));
              
              // Check if last message is within one hour (session still active)
              const lastMsg = json.messages[json.messages.length - 1];
              if (lastMsg?.created_at) {
                const lastMsgTime = new Date(lastMsg.created_at).getTime();
                const ageMinutes = (Date.now() - lastMsgTime) / (1000 * 60);
                sessionActive = ageMinutes < 60;
                console.log('⏰ Last message age:', Math.round(ageMinutes), 'minutes, session active:', sessionActive);
              }
            }
          }
        } catch (e) {
          console.warn('Failed to load server history:', e);
        }
      }
      
      // Use server messages if session is active, otherwise check local storage
      if (sessionActive && serverMessages.length > 0) {
        setMessages(serverMessages);
        saveConversationToStorage(serverMessages, userId); // Sync to local
        console.log('📱 Loaded', serverMessages.length, 'messages from server (session active)');
      } else {
        // Session expired or no server history - check local storage as fallback
        const storedMessages = await loadConversationFromStorage(userId);
        if (storedMessages.length > 0) {
          // Check if local messages are within one hour
          // For now, trust local storage for pending activity flow
          setMessages(storedMessages);
          console.log('📱 Loaded', storedMessages.length, 'messages from local storage');
        }
      }
      
      // Step 4: CHECK PENDING ACTIVITY - highest priority
      try {
        const pendingCompletion = await AsyncStorage.getItem('trace:pendingActivityCompletion');
        if (pendingCompletion) {
          const { activity, duration, timestamp } = JSON.parse(pendingCompletion);
          const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
          
          if (ageMinutes < 5) {
            console.log('🎯 PENDING ACTIVITY FOUND:', activity);
            await AsyncStorage.removeItem('trace:pendingActivityCompletion');
            
            // Append "How was that?" to existing messages
            const reflectionPrompt: ChatMessage = {
              id: `activity-reflection-${Date.now()}`,
              role: 'assistant',
              content: 'How was that?',
            };
            
            setMessages(prev => {
              const updated = [...prev, reflectionPrompt];
              saveConversationToStorage(updated, userId);
              console.log('📱 Appended reflection, total:', updated.length, 'messages');
              return updated;
            });
            
            // CRITICAL: Update onboarding step to reflection_pending FIRST (blocking)
            // This must complete BEFORE user can respond to ensure proper flow
            if (userId) {
              try {
                console.log('🔄 Updating onboarding step to reflection_pending...');
                const stepRes = await fetch(`${CHAT_API_BASE}/api/onboarding/activity-complete`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, activityName: activity }),
                });
                if (stepRes.ok) {
                  console.log('✅ Onboarding step updated to reflection_pending');
                } else {
                  console.warn('⚠️ Failed to update onboarding step:', await stepRes.text());
                }
              } catch (err) {
                console.error('Activity complete notify failed:', err);
              }
            }
            
            // Log activity completion (non-blocking)
            logActivityCompletion({ userId, deviceId, activityType: activity, durationSeconds: duration || 0 });
            
            // Week 1 Payoff: Increment activity count
            try {
              const countStr = await AsyncStorage.getItem(WEEK1_KEYS.ACTIVITY_COUNT);
              const currentCount = countStr ? parseInt(countStr, 10) : 0;
              await AsyncStorage.setItem(WEEK1_KEYS.ACTIVITY_COUNT, (currentCount + 1).toString());
              await AsyncStorage.setItem('lastCompletedActivityName', activity);
              console.log('📊 WEEK1: Activity count incremented to', currentCount + 1);
            } catch (e) {
              console.warn('📊 WEEK1: Failed to increment activity count:', e);
            }
            
            setAwaitingOnboardingReflection(true);
            setLastCompletedActivityName(activity);
            setWelcomeLoading(false);
            setHistoryLoaded(true);
            setChatInitialized(true);
            
            console.log('✅ UNIFIED INIT: Completed with pending activity');
            return; // DONE - no greeting needed
          } else {
            await AsyncStorage.removeItem('trace:pendingActivityCompletion');
          }
        }
      } catch (e) {
        console.warn('Pending activity check failed:', e);
      }
      
      // Step 5: If we have active session with messages, we're done - no greeting needed
      if (sessionActive && serverMessages.length > 0) {
        console.log('✅ UNIFIED INIT: Completed with active session');
        setWelcomeLoading(false);
        setHistoryLoaded(true);
        setChatInitialized(true);
        return; // DONE - session continues
      }
      
      // Step 6: Check if bootstrap was already shown (durable flag)
      if (userId) {
        const bootstrapShownKey = `trace:bootstrapShown:${userId}`;
        const bootstrapAlreadyShown = await AsyncStorage.getItem(bootstrapShownKey);
        if (bootstrapAlreadyShown) {
          console.log('✅ UNIFIED INIT: Bootstrap already shown, skipping');
          setWelcomeLoading(false);
          setHistoryLoaded(true);
          setChatInitialized(true);
          return; // DONE
        }
      }
      
      // Step 7: No messages, no bootstrap shown - fetch bootstrap/greeting
      console.log('🎯 UNIFIED INIT: Fetching bootstrap...');
      if (userId) {
        try {
          const userName = await getDisplayName(userId);
          const res = await fetch(`${CHAT_API_BASE}/api/chat/bootstrap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, userName: userName || null }),
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.onboarding && Array.isArray(data.messages) && data.messages.length > 0) {
              // Mark bootstrap as shown
              await AsyncStorage.setItem(`trace:bootstrapShown:${userId}`, 'true');
              
              const bootstrapMessages: ChatMessage[] = data.messages.map(
                (m: { role: string; content: string }, idx: number) => ({
                  id: `bootstrap-${idx}-${Date.now()}`,
                  role: (m.role === 'assistant' ? 'assistant' : 'user') as ChatRole,
                  content: m.content,
                })
              );
              
              setMessages(bootstrapMessages);
              saveConversationToStorage(bootstrapMessages, userId);
              if (bootstrapMessages[0]) setWelcomeText(bootstrapMessages[0].content);
              
              console.log('✅ UNIFIED INIT: Bootstrap shown');
              setWelcomeLoading(false);
              setHistoryLoaded(true);
              setChatInitialized(true);
              return; // DONE
            }
          }
        } catch (e) {
          console.warn('Bootstrap fetch failed:', e);
        }
      }
      
      // Step 8: Fetch regular greeting for returning user
      try {
        setWelcomeLoading(true);
        const now = new Date();
        const result = await fetchWelcomeGreeting({
          userName: null,
          chatStyle: 'conversation',
          localTime: now.toLocaleTimeString(),
          localDay: now.toLocaleDateString('en-US', { weekday: 'long' }),
          localDate: now.toLocaleDateString(),
          userId: userId,
          deviceId: deviceId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        
        if (!result.skipGreeting && result.text) {
          setWelcomeText(result.text);
        }
      } catch (err: any) {
        setWelcomeText("I'm really glad you're here. We can take this one breath, one thought at a time.");
      } finally {
        setWelcomeLoading(false);
      }
      
      setHistoryLoaded(true);
      setChatInitialized(true);
      console.log('✅ UNIFIED INIT: Completed');
    };
    
    initChat();
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

  // REMOVED: Separate fetchChatHistory effect - now handled in unified init

  // Helper to handle activity completion flow (appends reflection to existing conversation)
  const handlePendingActivityCompletion = useCallback(async (activity: string, duration: number, userId: string | null, deviceId: string | null) => {
    console.log('🎯 Activity completion detected:', activity, duration);
    
    // CRITICAL: Update onboarding step to reflection_pending FIRST (blocking)
    if (userId) {
      try {
        console.log('🔄 Updating onboarding step to reflection_pending...');
        const stepRes = await fetch(`${CHAT_API_BASE}/api/onboarding/activity-complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, activityName: activity }),
        });
        if (stepRes.ok) {
          console.log('✅ Onboarding step updated to reflection_pending');
        } else {
          console.warn('⚠️ Failed to update onboarding step');
        }
      } catch (err) {
        console.error('Failed to notify activity complete:', err);
      }
    }
    
    // Log activity completion (non-blocking)
    logActivityCompletion({
      userId: userId,
      deviceId: deviceId,
      activityType: activity,
      durationSeconds: duration || 0,
    });
    
    // Week 1 Payoff: Increment activity count
    (async () => {
      try {
        const countStr = await AsyncStorage.getItem(WEEK1_KEYS.ACTIVITY_COUNT);
        const currentCount = countStr ? parseInt(countStr, 10) : 0;
        await AsyncStorage.setItem(WEEK1_KEYS.ACTIVITY_COUNT, (currentCount + 1).toString());
        await AsyncStorage.setItem('lastCompletedActivityName', activity);
        console.log('📊 WEEK1: Activity count incremented to', currentCount + 1);
      } catch (e) {
        console.warn('📊 WEEK1: Failed to increment activity count:', e);
      }
    })();
    
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

  // REMOVED: Second init effect - now handled in unified init above

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

    // Week 1 Payoff: Initialize first_seen_at if missing (before first user message ever)
    try {
      const existingFirstSeen = await AsyncStorage.getItem(WEEK1_KEYS.FIRST_SEEN_AT);
      if (!existingFirstSeen) {
        await AsyncStorage.setItem(WEEK1_KEYS.FIRST_SEEN_AT, Date.now().toString());
        console.log('📅 WEEK1: Initialized first_seen_at');
      }
    } catch (e) {
      console.warn('📅 WEEK1: Failed to init first_seen_at:', e);
    }

    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    // ===== TELEMETRY: Detect negative response after suggestion =====
    const lastSugg = lastBrainSuggestionRef.current;
    if (lastSugg && lastSugg.shown_ts && (Date.now() - lastSugg.shown_ts < 10 * 60 * 1000)) {
      const lower = trimmed.toLowerCase();
      const negativePatterns = /no thanks|not now|don't want|stop|leave me alone|not helpful|annoying|shut up|go away|not interested/i;
      if (negativePatterns.test(lower)) {
        console.log('📊 TRACE negative response detected post-suggestion:', trimmed.slice(0, 30));
        logNegativeResponse(currentUserId, 'post_suggestion', trimmed.slice(0, 50));
      }
    }

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
        const reflectionRes = await fetch(`${CHAT_API_BASE}/api/onboarding/reflection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            activityName: lastCompletedActivityName,
            reflection: trimmed,
          }),
        });
        if (reflectionRes.ok) {
          const data = await reflectionRes.json();
          console.log('🎓 TRACE onboarding: reflection saved', data.reflectionId);
        } else {
          console.warn('🎓 TRACE onboarding: reflection API returned', reflectionRes.status);
        }
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

        setTimeout(async () => {
          const msg2: ChatMessage = {
            id: `onboard-followup-${Date.now()}`,
            role: 'assistant',
            content: "Do you want to talk about what's driving it — or do you want quiet for a bit?",
          };
          addMessage(msg2);
          setIsSending(false);
          
          // Week 1 Payoff: Check if we should trigger after reflection ack (activity >= 3)
          const { shouldTrigger, reason } = await shouldTriggerWeek1Payoff();
          if (shouldTrigger && reason === 'activity') {
            console.log('📊 WEEK1: Triggering after reflection ack (activity count >= 3)');
            setTimeout(() => {
              insertWeek1Hook(addMessage, messages, setAwaitingWeek1PayoffConsent);
            }, 1200);
          }
        }, 800);
      }, 400);

      // Return early - do not call /api/chat for reflection message
      return;
    }

    // ==================== WEEK 1 PAYOFF CONSENT HANDLING ====================
    if (awaitingWeek1PayoffConsent) {
      console.log('📊 WEEK1: Checking consent response:', trimmed);
      
      // Check for yes/no response
      if (isWeek1ConsentYes(trimmed)) {
        console.log('📊 WEEK1: User consented, delivering bullets');
        setAwaitingWeek1PayoffConsent(false);
        week1ConsentPendingCountRef.current = 0;
        
        // Compute insights and deliver bullets
        const insights = await computeWeek1Insights(messages);
        const leadIn = await selectFreshTemplate(WEEK1_LEADIN_TEMPLATES, WEEK1_KEYS.LEADIN_HISTORY, 10, 3);
        const closing = await selectFreshTemplate(WEEK1_CLOSING_TEMPLATES, WEEK1_KEYS.CLOSING_HISTORY, 10, 3);
        
        // Build bullet message
        const caveatLine = insights.caveat ? "Still learning your patterns — but early on I'm noticing:\n\n" : "";
        const bulletContent = `${caveatLine}What I'm noticing so far:\n• Pattern: ${insights.pattern}\n• Trigger: ${insights.trigger}\n• Support: ${insights.support}\n\n${closing.text}`;
        
        // Add lead-in then bullets with delay
        setTimeout(() => {
          addMessage({
            id: `week1-leadin-${Date.now()}`,
            role: 'assistant',
            content: leadIn.text,
          });
          
          setTimeout(() => {
            addMessage({
              id: `week1-bullets-${Date.now()}`,
              role: 'assistant',
              content: bulletContent,
            });
            setIsSending(false);
            
            // Mark completed (optional analytics)
            AsyncStorage.setItem(WEEK1_KEYS.PAYOFF_COMPLETED, 'true').catch(() => {});
            console.log('📊 WEEK1: Payoff completed');
          }, 600);
        }, 400);
        
        return; // Don't call API
      } else if (isWeek1ConsentNo(trimmed)) {
        console.log('📊 WEEK1: User declined, dismissing permanently');
        setAwaitingWeek1PayoffConsent(false);
        week1ConsentPendingCountRef.current = 0;
        AsyncStorage.setItem(WEEK1_KEYS.PAYOFF_DISMISSED, 'true').catch(() => {});
        // Continue to normal API call - don't return
      } else {
        // Neither yes nor no - increment ignore counter
        week1ConsentPendingCountRef.current++;
        console.log('📊 WEEK1: Consent pending, count:', week1ConsentPendingCountRef.current);
        
        if (week1ConsentPendingCountRef.current >= 5) {
          console.log('📊 WEEK1: 5 messages ignored, dismissing permanently');
          setAwaitingWeek1PayoffConsent(false);
          week1ConsentPendingCountRef.current = 0;
          AsyncStorage.setItem(WEEK1_KEYS.PAYOFF_DISMISSED, 'true').catch(() => {});
        }
        // Continue to normal API call
      }
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
        traceStudiosContext, // Pass current context to avoid playlist clash
      });

      console.log('📥 TRACE received reply:', result);
      
      // Update TRACE Studios context from response (clears after 2 turns if not renewed)
      if (result?.traceStudios?.traceStudiosContext) {
        setTraceStudiosContext(result.traceStudios.traceStudiosContext);
      } else if (traceStudiosContext) {
        // Clear context after one turn without renewal
        setTraceStudiosContext(null);
      }

      // Handle multi-message crisis responses (2-3 messages displayed sequentially)
      if (result?.isCrisisMultiMessage && result?.messages && result.messages.length > 1) {
        console.log('📥 TRACE crisis multi-message mode:', result.messages.length, 'messages');
        
        // Week 1 Payoff: Crisis override - clear consent state
        if (awaitingWeek1PayoffConsent) {
          console.log('📊 WEEK1: Crisis detected, clearing consent state');
          setAwaitingWeek1PayoffConsent(false);
          week1ConsentPendingCountRef.current = 0;
        }
        
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

      // Handle crisis resources (dial 988 or contact)
      const crisisRes = result?.crisis_resources;
      if (crisisRes?.triggered || crisisRes?.dial || crisisRes?.dial_contact) {
        // Week 1 Payoff: Crisis override - clear consent state
        if (awaitingWeek1PayoffConsent) {
          console.log('📊 WEEK1: Crisis resources detected, clearing consent state');
          setAwaitingWeek1PayoffConsent(false);
          week1ConsentPendingCountRef.current = 0;
        }
        
        if (crisisRes?.dial || crisisRes?.dial_contact) {
          console.log('[CRISIS] Handling dial action:', crisisRes);
          setTimeout(() => {
            handleCrisisDial(crisisRes.dial, crisisRes.dial_contact, addMessage);
          }, 600);
        }
      }

      // ===== TELEMETRY: Track brain suggestion from traceBrain =====
      const brainSuggestion = result?.suggestion;
      if (brainSuggestion?.suggestion_id) {
        console.log('📊 TRACE brain suggestion received:', brainSuggestion);
        lastBrainSuggestionRef.current = {
          suggestion_id: brainSuggestion.suggestion_id,
          activity_name: brainSuggestion.id,
          type: brainSuggestion.type,
          shown_ts: Date.now(),
        };
      }

      const suggestion = result?.activity_suggestion;
      if (suggestion?.should_navigate === true && suggestion?.name) {
        const route = ACTIVITY_ROUTES[suggestion.name];
        
        // ===== TELEMETRY: Log suggestion_accepted if this matches last brain suggestion =====
        const lastSugg = lastBrainSuggestionRef.current;
        if (lastSugg && lastSugg.activity_name === suggestion.name?.toLowerCase()) {
          logSuggestionAccepted(userId, lastSugg.suggestion_id, lastSugg.shown_ts, lastSugg.activity_name);
          const acceptedTs = Date.now();
          lastBrainSuggestionRef.current = { ...lastSugg, accepted_ts: acceptedTs };
          // Store for activity completion tracking
          AsyncStorage.setItem('trace:pendingSuggestion', JSON.stringify({
            suggestion_id: lastSugg.suggestion_id,
            activity_name: lastSugg.activity_name,
            accepted_ts: acceptedTs,
          })).catch(() => {});
        }
        
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
