/**
 * TRACE Cognitive Engine
 * 
 * Pre-processes user messages to understand actual meaning and conversational context.
 * Produces structured intent for TRACE response generation.
 * 
 * Responsibilities:
 * - Maintaining context continuity
 * - Detecting topic shifts
 * - Detecting when scripts should be blocked
 * - Preventing generic or mismatched responses
 */

// Short message patterns - treat as continuation, not reset
const SHORT_MESSAGE_PATTERNS = [
  /^(hi|hey|hello|yo|sup)$/i,
  /^(ok|okay|k|kk|alright|sure|yeah|yep|yup|ya|mhm|mmhm)$/i,
  /^(thanks|thx|ty|thank you)$/i,
  /^(lol|lmao|haha|hehe|😊|😢|❤️|🙏|👍|💙|😔|🥺|💕)$/i,
  /^.{1,5}$/  // Very short messages (1-5 chars)
];

// Activity reflection keywords - user is actually reflecting on activity
const ACTIVITY_REFLECTION_SIGNALS = [
  'that helped', 'felt good', 'calming', 'relaxing', 'needed that',
  'grounding', 'breathing helped', 'feel better', 'helped me',
  'the activity', 'the exercise', 'the breathing', 'the maze',
  'just did', 'just finished', 'after that', 'during that'
];

// Topic shift indicators
const TOPIC_SHIFT_SIGNALS = [
  'actually', 'anyway', 'by the way', 'btw', 'speaking of',
  'different topic', 'something else', 'unrelated', 'random but',
  'can we talk about', 'i want to talk about', 'so about',
  'changing subject', 'on another note'
];

// Response type mapping based on emotional context
const RESPONSE_TYPE_MAP = {
  crisis: 'grounding',
  anxious: 'grounding',
  sad: 'validation',
  lonely: 'validation',
  confused: 'curiosity',
  reflective: 'reflection',
  calm: 'presence',
  happy: 'presence',
  neutral: 'presence'
};

/**
 * Detect if message is a short continuation
 */
function isShortMessage(message) {
  if (!message || message.length === 0) return true;
  const trimmed = message.trim().toLowerCase();
  return SHORT_MESSAGE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Detect if user is referencing an activity experience
 */
function detectsActivityReflection(message) {
  const lower = message.toLowerCase();
  return ACTIVITY_REFLECTION_SIGNALS.some(signal => lower.includes(signal));
}

/**
 * Detect topic shift from previous context
 */
function detectTopicShift(currentMessage, recentMessages = []) {
  const lower = currentMessage.toLowerCase();
  
  // Explicit topic shift signals
  if (TOPIC_SHIFT_SIGNALS.some(signal => lower.includes(signal))) {
    return { shifted: true, reason: 'explicit_signal' };
  }
  
  // If no recent messages, can't detect shift
  if (!recentMessages || recentMessages.length < 2) {
    return { shifted: false, reason: 'insufficient_history' };
  }
  
  // Get recent user messages for context comparison
  const recentUserMessages = recentMessages
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => m.content?.toLowerCase() || '');
  
  // Common words that appear across many topics and inflate overlap scores
  const CROSS_TOPIC_STOPWORDS = new Set([
    'feel', 'felt', 'feeling', 'just', 'really', 'like', 'know', 'think',
    'want', 'need', 'been', 'have', 'that', 'this', 'what', 'about',
    'when', 'with', 'from', 'they', 'them', 'their', 'than', 'more',
    'some', 'even', 'also', 'still', 'much', 'very', 'well', 'only',
    'keep', 'kept', 'make', 'made', 'going', 'getting', 'being',
    'work', 'home', 'hurt', 'lost', 'hard', 'long', 'life', 'time',
    'things', 'stuff', 'something', 'everything', 'anything', 'nothing',
    'always', 'never', 'maybe', 'kind', 'sort', 'could', 'would', 'should',
  ]);

  const filterWords = (text) => text.split(/\s+/)
    .filter(w => w.length > 3 && !CROSS_TOPIC_STOPWORDS.has(w));

  const currentWords = new Set(filterWords(lower));
  const recentWords = new Set(filterWords(recentUserMessages.join(' ')));
  
  // Calculate overlap
  let overlap = 0;
  currentWords.forEach(word => {
    if (recentWords.has(word)) overlap++;
  });
  
  const overlapRatio = currentWords.size > 0 ? overlap / currentWords.size : 0;
  
  // Low overlap with substantial message = likely topic shift
  if (currentWords.size >= 5 && overlapRatio < 0.1) {
    return { shifted: true, reason: 'low_context_overlap' };
  }
  
  return { shifted: false, reason: 'context_coherent' };
}

/**
 * Determine primary emotional context from message
 * 
 * When the current message is short or returns neutral, scans the last 3
 * user messages for emotional signal so context doesn't evaporate on
 * "okay", "yeah", or other brief replies.
 */
function detectEmotionalContext(message, recentSentiment = null, recentMessages = []) {
  const lower = message.toLowerCase();
  
  const crisisSignals = ['want to die', 'end it', 'kill myself', 'hurt myself', 'suicide'];
  if (crisisSignals.some(s => lower.includes(s))) {
    return 'crisis';
  }
  
  const emotionMap = {
    anxious: ['anxious', 'worried', 'nervous', 'stressed', 'panicking', 'overwhelmed', 'scared'],
    sad: ['sad', 'depressed', 'down', 'crying', 'tears', 'heartbroken', 'grief', 'miss'],
    lonely: ['lonely', 'alone', 'isolated', 'no one', 'nobody cares'],
    confused: ['confused', 'lost', 'don\'t know', 'not sure', 'uncertain', 'why do i'],
    reflective: ['thinking about', 'wondering', 'realized', 'looking back', 'processing'],
    happy: ['happy', 'excited', 'grateful', 'thankful', 'good news', 'great day'],
    calm: ['calm', 'peaceful', 'relaxed', 'at peace', 'content']
  };
  
  const detectFromText = (text) => {
    const t = text.toLowerCase();
    if (crisisSignals.some(s => t.includes(s))) return 'crisis';
    for (const [emotion, signals] of Object.entries(emotionMap)) {
      if (signals.some(s => t.includes(s))) return emotion;
    }
    return null;
  };
  
  const directResult = detectFromText(message);
  if (directResult) return directResult;
  
  const short = isShortMessage(message);
  if (short || !directResult) {
    const recentUserMsgs = (recentMessages || [])
      .filter(m => m.role === 'user')
      .slice(-3);
    
    for (let i = recentUserMsgs.length - 1; i >= 0; i--) {
      const content = recentUserMsgs[i].content || '';
      const carried = detectFromText(content);
      if (carried) {
        console.log(`[COGNITIVE] Emotional carryover from recent message: ${carried}`);
        return carried;
      }
    }
  }
  
  if (recentSentiment) {
    return recentSentiment;
  }
  
  return 'neutral';
}

/**
 * Evaluate whether a script/template response is appropriate
 */
function evaluateScriptSafety(scriptPurpose, intent) {
  const { topic_shift, is_short_message, primary_emotional_context, awaiting_reflection } = intent;
  
  // Scripts for reflection prompts
  if (scriptPurpose === 'post_activity_reflection') {
    // Only allow if user is actually reflecting on activity
    if (!awaiting_reflection) {
      return { allowed: false, reason: 'not_awaiting_reflection' };
    }
    if (topic_shift) {
      return { allowed: false, reason: 'topic_shifted_away_from_activity' };
    }
    return { allowed: true, reason: 'context_matches_reflection' };
  }
  
  // Scripts for greetings
  if (scriptPurpose === 'greeting') {
    if (is_short_message) {
      return { allowed: true, reason: 'short_greeting_appropriate' };
    }
    // Don't use greeting script if user has substantial content
    return { allowed: false, reason: 'user_has_substantive_content' };
  }
  
  // Scripts for activity suggestions
  if (scriptPurpose === 'activity_suggestion') {
    if (topic_shift) {
      return { allowed: false, reason: 'topic_shifted' };
    }
    // Don't suggest activities during crisis
    if (primary_emotional_context === 'crisis') {
      return { allowed: false, reason: 'crisis_mode_active' };
    }
    return { allowed: true, reason: 'context_appropriate_for_activity' };
  }
  
  // Default: allow with caution
  return { allowed: true, reason: 'default_allowed' };
}

/**
 * Main cognitive engine processing
 * 
 * @param {Object} params
 * @param {string} params.currentMessage - The user's current message
 * @param {Array} params.conversationHistory - Recent conversation history (last 15 exchanges)
 * @param {Object} params.sessionState - Current session state
 * @returns {Object} TRACE intent structure
 */
function processIntent(params) {
  const {
    currentMessage,
    conversationHistory = [],
    sessionState = {}
  } = params;
  
  const {
    mode = 'normal',
    last_activity = null,
    awaiting_reflection = false,
    conversation_phase = 'active',
    soundscape_state = 'presence',
    user_sentiment_recent = null
  } = sessionState;
  
  // Core analysis
  const is_short_message = isShortMessage(currentMessage);
  const topic_shift_result = detectTopicShift(currentMessage, conversationHistory);
  const primary_emotional_context = detectEmotionalContext(currentMessage, user_sentiment_recent, conversationHistory);
  const references_activity = detectsActivityReflection(currentMessage);
  
  // Determine response type based on emotional context
  const response_type = RESPONSE_TYPE_MAP[primary_emotional_context] || 'presence';
  
  // Build core message draft (neutral meaning extraction)
  let core_message_draft = '';
  
  if (is_short_message) {
    core_message_draft = 'User is continuing the conversation with acknowledgment. Maintain current thread.';
  } else if (topic_shift_result.shifted) {
    core_message_draft = `User has shifted topics. New focus: "${currentMessage.slice(0, 100)}". Acknowledge shift and follow their lead.`;
  } else if (references_activity && awaiting_reflection) {
    core_message_draft = `User is reflecting on activity experience: "${currentMessage.slice(0, 100)}". Validate their experience.`;
  } else if (primary_emotional_context === 'crisis') {
    core_message_draft = 'User is in distress. Prioritize safety and grounding.';
  } else {
    core_message_draft = `User expresses ${primary_emotional_context} sentiment: "${currentMessage.slice(0, 100)}". Respond with ${response_type}.`;
  }
  
  // Script allowance default (can be overridden per script type)
  const default_script_allowed = !topic_shift_result.shifted && !is_short_message;
  
  const intent = {
    primary_emotional_context,
    topic_shift: topic_shift_result.shifted,
    topic_shift_reason: topic_shift_result.reason,
    is_short_message,
    references_activity,
    awaiting_reflection,
    script_allowed: default_script_allowed,
    script_reason: default_script_allowed ? 'context_coherent' : 'context_disruption',
    response_type,
    core_message_draft,
    
    // Metadata for downstream processing
    session_state: {
      mode,
      last_activity,
      conversation_phase,
      soundscape_state
    }
  };
  
  console.log(`[COGNITIVE] Intent: emotion=${primary_emotional_context}, shift=${topic_shift_result.shifted}, short=${is_short_message}, response=${response_type}`);
  
  return intent;
}

/**
 * Gate a specific script/template against current intent
 */
function gateScript(scriptPurpose, intent) {
  const result = evaluateScriptSafety(scriptPurpose, intent);
  
  if (!result.allowed) {
    console.log(`[COGNITIVE] Script blocked: ${scriptPurpose} - ${result.reason}`);
  }
  
  return result;
}

module.exports = {
  processIntent,
  gateScript,
  isShortMessage,
  detectTopicShift,
  detectEmotionalContext,
  detectsActivityReflection
};
