/**
 * TRACE Voice Engine
 * 
 * Transforms structured intent into TRACE's distinctive voice.
 * Preserves meaning exactly - cannot introduce new topics.
 * 
 * TRACE speaks:
 * - grounded, emotionally present
 * - slow human cadence
 * - music-aware tone
 * - never robotic, generic, or therapist-like
 */

// Voice markers to avoid (therapist-speak, robotic, generic)
const BANNED_PHRASES = [
  // Therapist-speak
  'I hear you', 'I understand', 'that sounds', 'it sounds like',
  'how does that make you feel', 'what I\'m hearing is',
  'let\'s explore that', 'let\'s unpack that', 'processing',
  'holding space', 'navigating', 'journey', 'healing journey',
  'self-care', 'boundaries', 'triggers', 'safe space',
  'emotional labor', 'validate', 'validating',
  
  // Robotic/generic
  'I\'m here to help', 'how can I assist', 'is there anything else',
  'let me know if', 'feel free to', 'don\'t hesitate',
  'I\'m happy to', 'I\'d be happy to', 'absolutely',
  'great question', 'that\'s a great', 'certainly',
  
  // Overly positive
  'amazing', 'wonderful', 'fantastic', 'incredible', 'awesome',
  'you\'re doing great', 'proud of you', 'so proud',
  
  // Filler
  'basically', 'essentially', 'actually', 'literally',
  'in terms of', 'at the end of the day'
];

// UNSOLICITED ACTIVITY OFFERS - these break the therapeutic container
// TRACE should NEVER offer activities/soundscapes unless user asks for help
const UNSOLICITED_ACTIVITY_OFFERS = [
  'let me suggest an activity',
  'how about a breathing exercise',
  'how about a calming soundscape',
  'how about a gentle breathing',
  'would you like a breathing',
  'want to try a breathing',
  'want to try an activity',
  'i can suggest an activity',
  'let me offer you',
  'perhaps a soundscape',
  'maybe a breathing exercise',
  'a calming soundscape might help',
];

// CRITICAL: Lazy/generic questions that reset conversations
// These destroy intimacy and make TRACE feel like a chatbot
const LAZY_GENERIC_QUESTIONS = [
  'what\'s on your mind',
  'what\'s been on your mind',
  'what are you thinking',
  'what brings you here',
  'how are you feeling today',
  'what would you like to talk about',
  'is there anything you\'d like to share',
  'what\'s going on with you',
  'tell me more about how you\'re feeling',
  'how can I support you'
];

// TRACE voice characteristics
const VOICE_MARKERS = {
  // Grounded openers (not "hi!" energy)
  openers: [
    'hey.', 'mm.', 'yeah.', 'still here.', 'back.',
    'right here.', 'with you.', 'listening.'
  ],
  
  // Slow cadence transitions
  transitions: [
    'and', 'so', 'but', 'still', 'though',
    '...', '—', 'just'
  ],
  
  // Emotionally present phrases
  presence: [
    'that\'s real', 'makes sense', 'yeah, that tracks',
    'i get it', 'of course', 'that\'s a lot',
    'heavy', 'rough', 'tender', 'big'
  ],
  
  // Music-aware phrases (when music context present)
  musicAware: [
    'the track\'s still playing', 'let it sit',
    'something softer', 'quieter now', 'let the sound hold you'
  ]
};

// Response type to tone mapping
const RESPONSE_TONE_MAP = {
  presence: { energy: 'low', warmth: 'warm', pace: 'slow' },
  validation: { energy: 'low', warmth: 'high', pace: 'slow' },
  reflection: { energy: 'medium', warmth: 'warm', pace: 'measured' },
  grounding: { energy: 'calm', warmth: 'steady', pace: 'slow' },
  curiosity: { energy: 'medium', warmth: 'warm', pace: 'natural' }
};

/**
 * Check if text contains banned phrases
 */
function containsBannedPhrases(text) {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter(phrase => lower.includes(phrase.toLowerCase()));
}

/**
 * Check if response contains lazy generic questions
 */
function containsLazyQuestion(text) {
  const lower = text.toLowerCase();
  return LAZY_GENERIC_QUESTIONS.filter(phrase => lower.includes(phrase));
}

/**
 * Check if response contains unsolicited activity/soundscape offers
 * These should be blocked unless user explicitly asked for help
 */
function containsUnsolicitedOffer(text) {
  const lower = text.toLowerCase();
  return UNSOLICITED_ACTIVITY_OFFERS.filter(phrase => lower.includes(phrase));
}

/**
 * Extract meaningful topics from recent conversation history
 * Returns array of topic snippets that TRACE can reference
 */
function extractRecentTopics(recentHistory = []) {
  if (!recentHistory || recentHistory.length < 2) return [];
  
  const topics = [];
  const userMessages = recentHistory
    .filter(m => m.role === 'user')
    .slice(-5) // Last 5 user messages
    .map(m => m.content || '');
  
  // Extract key phrases/topics from user messages
  for (const msg of userMessages) {
    const lower = msg.toLowerCase();
    
    // Skip very short messages
    if (msg.length < 10) continue;
    
    // Look for emotional content
    if (/feeling|felt|feel\s/i.test(msg)) {
      const match = msg.match(/(?:feeling|felt|feel)\s+(\w+(?:\s+\w+)?)/i);
      if (match) topics.push(`feeling ${match[1]}`);
    }
    
    // Look for topics they mentioned
    if (/about\s+(my|the|a)\s+/i.test(msg)) {
      const match = msg.match(/about\s+(my|the|a)\s+(\w+(?:\s+\w+)?)/i);
      if (match) topics.push(match[0]);
    }
    
    // Work/job mentions
    if (/work|job|boss|coworker|office/i.test(msg)) {
      topics.push('work');
    }
    
    // Relationship mentions
    if (/mom|dad|parent|brother|sister|friend|partner|boyfriend|girlfriend|wife|husband/i.test(msg)) {
      const match = msg.match(/\b(mom|dad|parent|brother|sister|friend|partner|boyfriend|girlfriend|wife|husband)\b/i);
      if (match) topics.push(match[1].toLowerCase());
    }
    
    // Sleep mentions
    if (/sleep|tired|exhausted|insomnia|can't sleep|couldn't sleep/i.test(msg)) {
      topics.push('sleep');
    }
    
    // Anxiety/stress mentions
    if (/anxious|anxiety|stressed|overwhelmed|worried/i.test(msg)) {
      topics.push('stress/anxiety');
    }
    
    // Specific events
    if (/yesterday|today|this morning|last night|earlier/i.test(msg)) {
      const match = msg.match(/(yesterday|today|this morning|last night|earlier)[\s,]+(.{10,40})/i);
      if (match) topics.push(`${match[1]}: ${match[2].trim()}`);
    }
  }
  
  // Deduplicate and limit
  const unique = [...new Set(topics)].slice(0, 4);
  return unique;
}

/**
 * Detect if we should add music awareness
 * NOTE: Only returns true for active non-presence soundscapes.
 * History-based detection removed — it caused random music phrases
 * ("quieter now", "let the sound hold you") to leak into unrelated responses.
 * The V2 prompt system handles music awareness via context budget and directives.
 */
function shouldAddMusicContext(intent, recentHistory) {
  const { soundscape_state } = intent.session_state || {};
  
  if (soundscape_state && soundscape_state !== 'presence' && soundscape_state !== null) {
    return true;
  }
  
  return false;
}

/**
 * Apply TRACE voice characteristics to a base response
 */
function applyVoiceStyle(baseResponse, intent, options = {}) {
  const { recentHistory = [], userMessage = '' } = options;
  
  let styled = baseResponse;
  
  // 1. Remove banned phrases
  const banned = containsBannedPhrases(styled);
  if (banned.length > 0) {
    console.log(`[VOICE] Detected banned phrases: ${banned.join(', ')}`);
  }
  
  // 2. Apply tone based on response type
  const tone = RESPONSE_TONE_MAP[intent.response_type] || RESPONSE_TONE_MAP.presence;
  
  // 3. Lowercase first letter for grounded feel (unless it's "I")
  if (styled.length > 0 && styled[0] !== 'I' && /^[A-Z]/.test(styled)) {
    styled = styled[0].toLowerCase() + styled.slice(1);
  }
  
  // 4. Remove exclamation marks (too high energy)
  styled = styled.replace(/!/g, '.');
  
  // 5. Shorten overly long sentences (slow cadence)
  const sentences = styled.split(/(?<=[.!?])\s+/);
  if (sentences.length > 4) {
    styled = sentences.slice(0, 4).join(' ');
  }
  
  // 6. Music awareness — handled entirely by V2 prompt directives now.
  // Random phrase injection removed: it caused phrases like "quieter now"
  // or "let the sound hold you" to appear in unrelated responses.
  
  return styled;
}

/**
 * Check if response is a conversation restart (should be prevented)
 */
function isConversationRestart(response, recentHistory) {
  const restartPatterns = [
    /^(hi|hey|hello)[\s,!.]+how (are|have) you/i,
    /^what('s| is) (on your mind|going on|up)/i,
    /^how are you (doing|feeling) today/i,
    /^tell me about yourself/i,
    /^what brings you here/i
  ];
  
  // Only flag as restart if there's existing history
  if (!recentHistory || recentHistory.length < 4) {
    return false;
  }
  
  return restartPatterns.some(pattern => pattern.test(response.trim()));
}

/**
 * Build voice engine system prompt injection
 * This gets added to the GPT system prompt to guide generation
 */
function buildVoicePromptInjection(intent, recentHistory = []) {
  const { response_type, is_short_message, topic_shift, primary_emotional_context } = intent;
  const tone = RESPONSE_TONE_MAP[response_type] || RESPONSE_TONE_MAP.presence;
  
  // Extract topics they've been discussing
  const recentTopics = extractRecentTopics(recentHistory);
  const hasConversationContext = recentHistory && recentHistory.length >= 4;
  
  let voiceGuidance = `
VOICE STYLE:
- Speak grounded, not upbeat
- Use lowercase starts when natural
- Short sentences, slow cadence
- No exclamation marks
- Never restart the conversation
- Never use therapist phrases like "I hear you", "that sounds like", "let's explore"
`;

  // CRITICAL: Anti-lazy-question guidance
  if (hasConversationContext) {
    voiceGuidance += `
CRITICAL - CONVERSATION MEMORY:
You are mid-conversation. DO NOT ask generic questions like:
- "What's on your mind?"
- "What's been on your mind?"
- "How are you feeling today?"
- "What would you like to talk about?"

These questions destroy intimacy. You already KNOW what's on their mind from prior messages.
Instead, REFERENCE what they've been sharing. Continue the thread.
`;

    if (recentTopics.length > 0) {
      voiceGuidance += `
TOPICS THEY'VE MENTIONED: ${recentTopics.join(', ')}
Reference these naturally. Ask about specifics, not generics.
Instead of "What's on your mind?" try:
- "how's that going?" (referencing what they mentioned)
- "still thinking about that?"
- "did anything change with [topic]?"
- Or just... continue the thought. No question needed.
`;
    }
  }

  if (is_short_message) {
    voiceGuidance += `
- User sent a short message - treat as continuation, not a new topic
- Respond briefly, stay in current emotional thread
- Do NOT ask "What's on your mind?" - they just said something, respond to it
`;
  }

  if (topic_shift) {
    voiceGuidance += `
- User shifted topics - acknowledge gently and follow their lead
- Don't reference previous topic
`;
  }

  if (primary_emotional_context === 'sad' || primary_emotional_context === 'lonely') {
    voiceGuidance += `
- Be present and validating
- Match their slower energy
- No silver linings or forced positivity
`;
  }

  if (primary_emotional_context === 'anxious') {
    voiceGuidance += `
- Stay grounded and steady
- Short, calming phrases
- Anchor them to the present
`;
  }

  // Music context
  const soundState = intent.session_state?.soundscape_state;
  if (soundState && soundState !== 'presence') {
    voiceGuidance += `
- Music is playing (${soundState} soundscape) - be aware of the atmosphere
- Can reference the sound holding them if it fits naturally
`;
  }

  return voiceGuidance.trim();
}

/**
 * Generate a contextual continuation based on conversation context
 * Instead of stripping lazy questions, we REPLACE them with something that continues the thread
 */
function generateContextualContinuation(response, recentHistory = []) {
  // Extract what was happening in the conversation
  const recentUserMsgs = recentHistory.filter(m => m.role === 'user').slice(-5);
  const recentAssistantMsgs = recentHistory.filter(m => m.role === 'assistant').slice(-3);
  const allRecentContent = [...recentUserMsgs, ...recentAssistantMsgs].map(m => m.content?.toLowerCase() || '').join(' ');
  
  // Detect conversation context
  const contexts = {
    music: /music|play|song|track|album|night swim|slow tides|euphoria|resume|stop music|pause/i.test(allRecentContent),
    positive: /good|nice|yeah|yep|okay|fine|better|thanks|great/i.test(recentUserMsgs.slice(-1)[0]?.content || ''),
    activity: /breathing|grounding|maze|pearl|walking|exercise|activity/i.test(allRecentContent),
    emotional: /sad|tired|stressed|anxious|overwhelmed|lonely|upset/i.test(allRecentContent),
    casual: /hi|hey|hello|sup|yo/i.test(recentUserMsgs.slice(-1)[0]?.content || ''),
  };
  
  // Contextual continuations (no questions, just presence)
  const musicContinuations = [
    "let it play.",
    "this one's nice for just sitting with.",
    "mm. good choice.",
    "here with you.",
  ];
  
  const positiveContinuations = [
    "good.",
    "mm.",
    "I'm here.",
    "nice.",
  ];
  
  const emotionalContinuations = [
    "still here.",
    "mm.",
    "take your time.",
    "no rush.",
  ];
  
  const casualContinuations = [
    "hey.",
    "I'm here.",
    "mm.",
  ];
  
  // Pick based on context
  let continuations = positiveContinuations;
  if (contexts.music) continuations = musicContinuations;
  else if (contexts.emotional) continuations = emotionalContinuations;
  else if (contexts.casual) continuations = casualContinuations;
  
  // Extract the non-lazy part of the response if there is one
  let cleanPart = response;
  const lazyPatterns = [
    /[\.\,\s]*(so\s+)?what['']?s\s+(been\s+)?on\s+your\s+mind\s*\??/gi,
    /[\.\,\s]*(so\s+)?what\s+would\s+you\s+like\s+to\s+talk\s+about\s*\??/gi,
    /[\.\,\s]*(so\s+)?what\s+brings\s+you\s+here\s+(today\s*)?\??/gi,
    /[\.\,\s]*(so\s+)?how\s+are\s+you\s+feeling\s+(today\s*)?\??/gi,
    /[\.\,\s]*(so\s+)?what\s+are\s+you\s+feeling\s+(right\s+now\s*)?\??/gi,
    /[\.\,\s]*(so\s+)?how\s+can\s+I\s+support\s+you\s*\??/gi,
    /[\.\,\s]*(so\s+)?what['']?s\s+going\s+on\s+(with\s+you\s*)?\??/gi,
    /[\.\,\s]*(so\s+)?tell\s+me\s+(more\s+)?about\s+what['']?s\s+happening\s*\.?/gi,
    /[\.\,\s]*(so\s+)?I['']?m\s+here\s+(for\s+you\s*)?if\s+you\s+want\s+to\s+talk\.?/gi,
    /[\.\,\s]*(so\s+)?anything\s+(else\s+)?on\s+your\s+mind\s*\??/gi,
  ];
  
  for (const pattern of lazyPatterns) {
    cleanPart = cleanPart.replace(pattern, '');
  }
  cleanPart = cleanPart.replace(/\s{2,}/g, ' ').trim();
  
  // If clean part is substantial, keep it
  if (cleanPart.length >= 8) {
    console.log(`[VOICE] 🔧 Kept clean part: "${cleanPart}"`);
    return cleanPart;
  }
  
  // Otherwise, use a contextual continuation
  const continuation = continuations[Math.floor(Math.random() * continuations.length)];
  console.log(`[VOICE] 🔧 Using contextual continuation: "${continuation}" (context: ${Object.entries(contexts).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'default'})`);
  return continuation;
}

/**
 * Validate a response before sending
 * Returns { valid: boolean, issues: string[], corrected: string }
 */
function validateResponse(response, intent, recentHistory = []) {
  const issues = [];
  let corrected = response;
  
  const hasConversationContext = recentHistory && recentHistory.length >= 4;
  
  // Check for banned phrases
  const banned = containsBannedPhrases(response);
  if (banned.length > 0) {
    issues.push(`Contains banned phrases: ${banned.join(', ')}`);
  }
  
  // Check for unsolicited activity/soundscape offers - these should be blocked
  const unsolicitedOffers = containsUnsolicitedOffer(corrected);
  if (unsolicitedOffers.length > 0) {
    issues.push(`Contains unsolicited activity offer: "${unsolicitedOffers[0]}" - REPLACING`);
    console.log(`[VOICE] ⚠️ UNSOLICITED OFFER DETECTED: "${unsolicitedOffers[0]}" - replacing with contextual continuation`);
    corrected = generateContextualContinuation(corrected, recentHistory);
  }
  
  // CONTEXTUAL REPLACEMENT: If lazy question detected, replace with contextual continuation
  if (hasConversationContext) {
    const lazy = containsLazyQuestion(corrected);
    if (lazy.length > 0) {
      issues.push(`Contains lazy generic question: "${lazy[0]}" - REPLACING with context-aware response`);
      console.log(`[VOICE] ⚠️ LAZY QUESTION DETECTED: "${lazy[0]}" - replacing with contextual continuation`);
      corrected = generateContextualContinuation(corrected, recentHistory);
    }
  }
  
  // Check for conversation restart
  if (isConversationRestart(response, recentHistory)) {
    issues.push('Appears to restart conversation (generic greeting)');
  }
  
  // Check for over-enthusiasm
  if ((corrected.match(/!/g) || []).length > 1) {
    issues.push('Too many exclamation marks');
    corrected = corrected.replace(/!/g, '.');
  }
  
  // Check for therapist-like questions
  if (/how does that make you feel/i.test(corrected)) {
    issues.push('Contains therapist-style question');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    corrected: applyVoiceStyle(corrected, intent, { recentHistory })
  };
}

module.exports = {
  applyVoiceStyle,
  buildVoicePromptInjection,
  validateResponse,
  isConversationRestart,
  containsBannedPhrases,
  containsLazyQuestion,
  extractRecentTopics,
  generateContextualContinuation,
  BANNED_PHRASES,
  LAZY_GENERIC_QUESTIONS,
  VOICE_MARKERS,
  RESPONSE_TONE_MAP
};
