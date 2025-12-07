// TRACE AI Service - calls backend API which handles OpenAI integration

// Maximum number of messages to keep in conversation history
// This ensures TRACE remembers context without exceeding token limits
const MAX_CONVERSATION_HISTORY = 12;

// Get a unique AI-generated greeting from TRACE
export async function getAIGreeting(userName?: string | null): Promise<string> {
  try {
    const response = await fetch('/api/greeting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userName: userName || null,
        localTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        localDay: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        localDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.greeting || "Whenever you're ready.";
  } catch (error) {
    console.error('Failed to get AI greeting:', error);
    // Fallback to simple greeting
    return userName ? `Hi ${userName}. I'm here.` : "Whenever you're ready.";
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const CONVERSATION_STORAGE_KEY = 'trace_conversation_history';

// Load conversation from localStorage
function loadConversationHistory(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(CONVERSATION_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load conversation history:', e);
  }
  return [];
}

// Save conversation to localStorage
function saveConversationHistory(history: ChatMessage[]): void {
  try {
    localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save conversation history:', e);
  }
}

let conversationHistory: ChatMessage[] = loadConversationHistory();

// Clean up any stale/generic fallback messages from history on load
function cleanConversationHistory(history: ChatMessage[]): ChatMessage[] {
  const genericPhrases = [
    "that sounds like a lot",
    "I hear you",
    "I'm with you",
    "take your time"
  ];
  
  return history.filter(msg => {
    if (msg.role !== 'assistant') return true;
    const lower = msg.content.toLowerCase();
    return !genericPhrases.some(phrase => lower.includes(phrase) && msg.content.length < 50);
  });
}

// Clean history on module load
conversationHistory = cleanConversationHistory(conversationHistory);
saveConversationHistory(conversationHistory);

export interface TraceResponse {
  message: string;
  activity_suggestion: ActivitySuggestion;
}

export async function sendMessageToTrace(userMessage: string, userName?: string | null, chatStyle: 'minimal' | 'conversation' = 'conversation'): Promise<TraceResponse> {
  // Add user message to history
  conversationHistory.push({
    role: 'user',
    content: userMessage,
  });
  
  // Trim conversation history to keep last N messages for context
  if (conversationHistory.length > MAX_CONVERSATION_HISTORY) {
    conversationHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY);
  }
  
  saveConversationHistory(conversationHistory);

  try {
    // Call backend API which handles OpenAI integration
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        userName: userName || null,
        chatStyle: chatStyle,
        localTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        localDay: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        localDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.message || "mm, what's on your mind?";
    const activitySuggestion: ActivitySuggestion = data.activity_suggestion || {
      name: null,
      reason: null,
      should_navigate: false
    };

    // Store the activity suggestion for later reference
    lastActivitySuggestion = activitySuggestion;
    
    // Map the activity name to our internal activity type
    if (activitySuggestion.name) {
      lastSuggestedActivity = mapActivityNameToType(activitySuggestion.name);
    }

    // Add assistant response to history
    conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
    });
    
    // Trim again after adding response
    if (conversationHistory.length > MAX_CONVERSATION_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY);
    }
    
    saveConversationHistory(conversationHistory);

    return {
      message: assistantMessage,
      activity_suggestion: activitySuggestion
    };
  } catch (error: any) {
    console.error('TRACE AI error:', error?.message || error);
    
    // Don't save fallback to history - it poisons future responses
    return {
      message: "mm, I'm here.",
      activity_suggestion: { name: null, reason: null, should_navigate: false }
    };
  }
}

// Map AI activity names to our internal activity types
function mapActivityNameToType(name: string): ActivityType {
  const mapping: Record<string, ActivityType> = {
    'Breathing': 'breathing',
    'Trace the Maze': 'maze',
    'Walking Reset': 'walking',
    'Rest': 'rest',
    'Window': 'window',
    'Echo': 'echo',
  };
  return mapping[name] || null;
}

// Get the last activity suggestion from the AI
export function getLastActivitySuggestion(): ActivitySuggestion | null {
  return lastActivitySuggestion;
}

export function clearConversation(): void {
  conversationHistory = [];
  saveConversationHistory([]);
}

export function getConversationHistory(): ChatMessage[] {
  return [...conversationHistory];
}

export function hasExistingConversation(): boolean {
  return conversationHistory.length > 0;
}

// Reload conversation from storage (useful when component remounts)
export function reloadConversationFromStorage(): ChatMessage[] {
  conversationHistory = loadConversationHistory();
  return [...conversationHistory];
}

// Activity types that TRACE can suggest
export type ActivityType = 'breathing' | 'grounding' | 'walking' | 'maze' | 'powernap' | 'pearlripple' | 'window' | 'echo' | 'rest' | null;

// Activity suggestion from the AI response
export interface ActivitySuggestion {
  name: string | null;
  reason: string | null;
  should_navigate: boolean;
}

// Track the last suggested activity
let lastSuggestedActivity: ActivityType = null;
let lastActivitySuggestion: ActivitySuggestion | null = null;

// Detect if TRACE's response contains an activity suggestion
export function detectActivitySuggestion(response: string): ActivityType {
  const lowerResponse = response.toLowerCase();
  
  if (lowerResponse.includes('[breathing]') || lowerResponse.includes('breathing together') || lowerResponse.includes('try some breathing')) {
    lastSuggestedActivity = 'breathing';
    return 'breathing';
  }
  if (lowerResponse.includes('[grounding]') || lowerResponse.includes('do some grounding') || lowerResponse.includes('grounding exercise')) {
    lastSuggestedActivity = 'grounding';
    return 'grounding';
  }
  if (lowerResponse.includes('[walking]') || lowerResponse.includes('walking reset') || lowerResponse.includes('gentle walk')) {
    lastSuggestedActivity = 'walking';
    return 'walking';
  }
  if (lowerResponse.includes('[maze]') || lowerResponse.includes('try the maze') || lowerResponse.includes('the maze')) {
    lastSuggestedActivity = 'maze';
    return 'maze';
  }
  if (lowerResponse.includes('[power nap]') || lowerResponse.includes('power nap') || lowerResponse.includes('short nap')) {
    lastSuggestedActivity = 'powernap';
    return 'powernap';
  }
  if (lowerResponse.includes('[ripple]') || lowerResponse.includes('ripple') || lowerResponse.includes('ocean sounds')) {
    lastSuggestedActivity = 'pearlripple';
    return 'pearlripple';
  }
  
  return null;
}

// Check if user's message indicates agreement to try an activity
export function detectUserAgreement(userMessage: string): boolean {
  const lowerMessage = userMessage.toLowerCase().trim();
  
  const agreementPhrases = [
    'yes', 'yeah', 'yea', 'yep', 'sure', 'okay', 'ok', 'let\'s do it', 'lets do it',
    'let\'s try', 'lets try', 'i\'d like that', 'id like that', 'sounds good',
    'please', 'i want to', 'i would like', 'that sounds nice', 'that would be nice',
    'let\'s', 'lets', 'go for it', 'why not', 'i\'m in', 'im in', 'definitely',
    'absolutely', 'of course', 'i\'d love to', 'id love to', 'sounds great',
    'that sounds good', 'i think so', 'yes please', 'sure thing', 'alright'
  ];
  
  return agreementPhrases.some(phrase => 
    lowerMessage === phrase || 
    lowerMessage.startsWith(phrase + ' ') || 
    lowerMessage.startsWith(phrase + ',') ||
    lowerMessage.startsWith(phrase + '.')
  );
}

// Get the last suggested activity (for when user agrees)
export function getLastSuggestedActivity(): ActivityType {
  return lastSuggestedActivity;
}

// Clear the last suggested activity
export function clearLastSuggestedActivity(): void {
  lastSuggestedActivity = null;
}

// Track recent greetings to avoid repetition
let recentGreetings: string[] = [];
const MAX_RECENT_GREETINGS = 3;

// Generate a unique, genuine greeting each time - never repeats recent ones
export function getTraceGreeting(): string {
  const hour = new Date().getHours();
  
  // Time-aware greetings
  const morningGreetings = [
    "Hey… how are you feeling this morning?",
    "Good morning. How are you?",
    "Morning… how did you sleep?",
    "Hey there… easing into the day?",
    "Hi. What's on your mind this morning?",
    "Morning. I'm here when you're ready.",
    "Hey… how's this morning treating you?",
  ];
  
  const afternoonGreetings = [
    "Hey… how's your day been so far?",
    "Hi there. Checking in. How are you?",
    "Hey… what's been on your mind today?",
    "Hi. How are you holding up?",
    "Hey. Just wanted to see how you're doing.",
    "Hi. How's the day going?",
    "Hey there. What's happening with you?",
  ];
  
  const eveningGreetings = [
    "Hey… how was your day?",
    "Hi. Winding down? How are you feeling?",
    "Evening. How are you doing right now?",
    "Hey… ready to take a breath?",
    "Hi there. How are you this evening?",
    "Hey. How are you feeling tonight?",
    "Hi. What's on your mind?",
  ];
  
  const lateNightGreetings = [
    "Hey… still awake? I'm here.",
    "Hi. Can't sleep? I'm here.",
    "Hey… what's keeping you up?",
    "Hi there. I'm here with you.",
    "Hey… it's quiet. How are you feeling?",
    "Hi. Late night. How are you?",
    "Hey. I'm here whenever you need.",
  ];
  
  let greetings: string[];
  
  if (hour >= 5 && hour < 12) {
    greetings = morningGreetings;
  } else if (hour >= 12 && hour < 17) {
    greetings = afternoonGreetings;
  } else if (hour >= 17 && hour < 22) {
    greetings = eveningGreetings;
  } else {
    greetings = lateNightGreetings;
  }
  
  // Filter out recently used greetings
  const availableGreetings = greetings.filter(g => !recentGreetings.includes(g));
  
  // If all greetings have been used recently, clear history and use full list
  const greetingsToChooseFrom = availableGreetings.length > 0 ? availableGreetings : greetings;
  
  // Pick a random greeting from available options
  const selectedGreeting = greetingsToChooseFrom[Math.floor(Math.random() * greetingsToChooseFrom.length)];
  
  // Track this greeting to avoid immediate repetition
  recentGreetings.push(selectedGreeting);
  if (recentGreetings.length > MAX_RECENT_GREETINGS) {
    recentGreetings.shift();
  }
  
  return selectedGreeting;
}
