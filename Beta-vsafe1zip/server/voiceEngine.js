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
  'let\'s explore that', 'let\'s unpack that', 'unpack this',
  'unpack that', 'regulate first', 'processing',
  'holding space', 'navigating', 'journey', 'healing journey',
  'self-care', 'boundaries', 'triggers', 'safe space',
  'emotional labor', 'validate', 'validating',
  // Performative care
  'I\'m here to support you', 'I care about your feelings',
  'I care about what you\'re going through',
  // Therapy validation phrases
  'it\'s natural to', 'it\'s normal to', 'it\'s okay to feel',
  'feeling proud is important', 'acknowledging your',
  'can boost your confidence', 'moving forward',
  'sounds like a big step', 'congratulations on',
  
  // Robotic/generic
  'I\'m here to help', 'how can I assist', 'is there anything else',
  'let me know if', 'feel free to', 'don\'t hesitate',
  'I\'m happy to', 'I\'d be happy to', 'absolutely',
  'great question', 'that\'s a great', 'certainly',
  
  // Fake engagement / dismissive
  'it sounds interesting', 'that sounds interesting',
  'enjoy your time', 'hope you enjoy',
  'sounds like a nice plan', 'sounds like a great plan',
  'sounds like a good plan',
  
  // Overly positive
  'amazing', 'wonderful', 'fantastic', 'incredible', 'awesome',
  'you\'re doing great', 'proud of you', 'so proud',
  
  // Filler
  'basically', 'essentially', 'actually', 'literally',
  'in terms of', 'at the end of the day',
  
  // Attitude words (read as snobby in text — only standalone "mm.")
  'mm.'
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

const HOLLOW_PATTERNS = [
  /that sounds like .{5,40} (?:is|has been|must be) (?:weighing|hard|tough|difficult|heavy|a lot)/i,
  /it makes sense that you(?:'d| would) feel .{3,30} about/i,
  /(?:it's|that's) (?:completely |totally |perfectly )?(?:normal|natural|valid|understandable|okay) to feel/i,
  /(?:i can see|i can tell|i sense) (?:that |how much )?(?:this|that|it) (?:means|matters|affects|impacts)/i,
  /thank you for (?:sharing|opening up|trusting|being vulnerable)/i,
  /(?:it's clear|it sounds like) (?:this|that|you) (?:means|matters|is important)/i,
  /what (?:comes up|arises|surfaces) (?:for you )?when you (?:think|sit with|reflect)/i,
  /how does (?:that|this|it) (?:sit with|land for|resonate with) you/i,
];

const THERAPIST_FRAME_PATTERNS = [
  /(?:it's|that's|it is|that is) (?:really |so |pretty |very )?(?:tough|hard|difficult|challenging|frustrating|rough|overwhelming) (?:when|to|that)/i,
  /(?:it's|that's|it is|that is) (?:really |so |pretty |very )?(?:tough|hard|difficult|challenging|frustrating|rough|overwhelming)\./i,
  /(?:it can be|that can be) (?:really |so |pretty |very )?(?:tough|hard|difficult|challenging|frustrating|rough|overwhelming)/i,
  /just take a moment/i,
  /take a moment (?:to|for)/i,
  /let it out/i,
  /in whatever way feels right/i,
  /(?:might|can|could|may) (?:really )?help you feel/i,
  /(?:might|can|could|may) help (?:to )?(?:ease|calm|soothe|release|relieve)/i,
  /(?:take|give) (?:a |some )?(?:moment|time|space) (?:for|to) yourself/i,
  /(?:get|gets|getting) under your skin/i,
  /give yourself (?:permission|grace|space)/i,
  /you(?:'re| are) (?:allowed|permitted) to (?:feel|be|take)/i,
  /(?:remember|don't forget) (?:that )?(?:you're|you are) (?:not alone|worthy|enough|deserving)/i,
  /(?:it's okay|it is okay) to (?:not be okay|feel|take)/i,
  /(?:be gentle|be kind) (?:with|to) yourself/i,
  /what(?:'s| is) coming up for you/i,
  /how (?:does|did) that (?:feel|land|sit|resonate) (?:for|with) you/i,
  /(?:move|moving) through (?:this|that|it) (?:at your|in your|with)/i,
  /(?:just )?sit with (?:that|this|it|those) (?:feeling|emotion|for a)/i,
  /(?:honor|acknowledge|recognize) (?:what you(?:'re| are) feeling|your (?:feelings|emotions))/i,
  /(?:and|but|so) that(?:'s| is) (?:completely |totally |perfectly )?(?:valid|okay|understandable|normal|natural)/i,
];

const APPROVED_MICRO_ACKS = [
  'yeah.', 'got you.', 'oh nice.', 'okay.', 'damn.', 'bet.', 'true.', 'fair.',
  'nice.', 'cool.', 'love that.', 'lol fair.', 'for real.', 'heard.',
  'hey.', 'rough.', 'okayyy.', 'ha fair.', 'alright.',
];

const VOICE_PALETTE = {
  light: ['oh nice.', 'love that.', 'okayyy.', 'lol fair.', 'nice.', 'ha, fair.'],
  neutral: ['got you.', 'yeah.', 'okay.', 'bet.', 'true.', 'cool.', 'for real.', 'heard.'],
  heavy: ['damn.', 'yeah… okay.', 'yeah. i\'m here.', 'that\'s real.', 'rough.', 'yeah. okay.'],
};

const BUDDY_OPENERS_EMOTIONAL = [
  'yeah. i\'m here.',
  'that\'s a lot.',
  'yeah, no, i get it.',
  'damn. okay.',
  'that tracks.',
  'yeah that makes sense.',
  'not gonna lie, that\'s rough.',
  'yeah. that\'s real.',
  'rough.',
];

const BUDDY_OPENERS_CASUAL = [
  'oh nice.',
  'wait really?',
  'oh word?',
  'ha, solid.',
  'okay okay.',
  'oh for real?',
  'nice.',
  'lol fair.',
  'love that.',
  'haha okay.',
];

// TRACE voice characteristics
const VOICE_MARKERS = {
  // Grounded openers (not "hi!" energy)
  openers: [
    'hey.', 'yeah.', 'still here.', 'back.',
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

function detectHollowResponse(text) {
  if (!text || text.length < 20) return null;
  for (const pattern of HOLLOW_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function sentenceHasConcreteDetail(sentence) {
  const quotePattern = /["'\u201c\u201d].{3,}["'\u201c\u201d]/;
  if (quotePattern.test(sentence)) return true;
  const words = sentence.split(/\s+/).filter(w => w.length > 3);
  if (words.length > 12) return true;
  const concreteSignals = /\b(?:because|when you said|the part about|specifically|yesterday|last night|this morning|your \w+)\b/i;
  if (concreteSignals.test(sentence)) return true;
  return false;
}

function rewriteHollowSentence(text, recentTopics) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (sentences.length <= 1) {
    const isHollow = HOLLOW_PATTERNS.some(p => p.test(text)) && !sentenceHasConcreteDetail(text);
    if (!isHollow) return text;
    const topicPhrase = recentTopics.length > 0 ? recentTopics[0] : null;
    const aliveReplacements = topicPhrase ? [
      `that ${topicPhrase} thing — it's not small.`,
      `yeah. ${topicPhrase} hits different when you say it out loud.`,
      `${topicPhrase}. that's real.`,
    ] : [
      "yeah. that's not nothing.",
      "that's real. you're not making it up.",
      "you felt that for a reason.",
    ];
    const pick = aliveReplacements[Math.floor(Math.random() * aliveReplacements.length)];
    console.log(`[VOICE] Single hollow sentence — alive replacement: "${pick}"`);
    return pick;
  }
  const cleaned = [];
  let hollowCount = 0;
  for (const s of sentences) {
    const matchesPattern = HOLLOW_PATTERNS.some(p => p.test(s));
    if (matchesPattern && !sentenceHasConcreteDetail(s)) {
      hollowCount++;
    } else {
      cleaned.push(s);
    }
  }
  if (hollowCount === 0) return text;
  const remaining = cleaned.join(' ').trim();
  if (remaining.length >= 15) {
    console.log(`[VOICE] Stripped ${hollowCount} hollow sentence(s), kept: "${remaining.slice(0, 60)}..."`);
    return remaining;
  }
  console.log(`[VOICE] All sentences hollow but preserving original to avoid content loss`);
  return text;
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
function splitSentences(text) {
  return text.match(/[^.!?…]+(?:[.!?](?!\s*\w\.)|…|$)+/g)?.filter(s => s.trim()) || [text];
}

function containsTherapistFrame(sentence) {
  return THERAPIST_FRAME_PATTERNS.some(p => p.test(sentence));
}

function pickBuddyOpener(context = 'emotional') {
  const pool = context === 'casual' ? BUDDY_OPENERS_CASUAL : BUDDY_OPENERS_EMOTIONAL;
  return pool[Math.floor(Math.random() * pool.length)];
}

const DISMISSIVE_PATTERNS = [
  /enjoy (?:the |your |it|that)/i,
  /hope you (?:enjoy|have a|have fun)/i,
  /have (?:a good|a great|a nice|fun) (?:time|day|one|evening|night|weekend)/i,
  /sounds like a (?:nice|good|great|solid) plan/i,
  /(?:that's|that is) (?:a )?(?:nice|good|great|solid) (?:plan|idea|choice)/i,
  /enjoy your (?:time|day|evening|night|weekend)/i,
  /(?:take care|stay safe)\b/i,
  /^enjoy\.\s*$/i,
];

function isResponseDismissive(text) {
  const lower = text.toLowerCase().trim();
  if (DISMISSIVE_PATTERNS.some(p => p.test(lower))) return true;
  const sentences = splitSentences(text);
  const dismissiveCount = sentences.filter(s => 
    DISMISSIVE_PATTERNS.some(p => p.test(s.trim().toLowerCase()))
  ).length;
  if (dismissiveCount > 0 && dismissiveCount >= sentences.length * 0.5) return true;
  return false;
}

function stripDismissiveSentences(text) {
  const sentences = splitSentences(text);
  const kept = sentences.filter(s => 
    !DISMISSIVE_PATTERNS.some(p => p.test(s.trim().toLowerCase()))
  );
  return kept.length > 0 ? kept.join(' ').trim() : null;
}

function detectConversationMood(recentHistory = []) {
  if (!recentHistory || recentHistory.length === 0) return 'casual';
  const lastUserMsg = (recentHistory.filter(m => m.role === 'user').slice(-1)[0]?.content || '').toLowerCase();
  const emotionalWords = /sad|angry|anxious|stressed|overwhelmed|lonely|hurt|scared|frustrated|depressed|upset|tired|exhausted|can't sleep|can't think/i;
  return emotionalWords.test(lastUserMsg) ? 'emotional' : 'casual';
}

function applyVoiceStyle(baseResponse, intent, options = {}) {
  const { recentHistory = [], userMessage = '' } = options;
  const mood = detectConversationMood(recentHistory);
  
  let styled = baseResponse;

  // 1. HARD OPENER REWRITE: If first sentence starts with a therapist validation frame, replace it
  const firstSentenceEnd = styled.search(/[.!?]/);
  if (firstSentenceEnd > 0) {
    const firstSentence = styled.substring(0, firstSentenceEnd + 1);
    if (containsTherapistFrame(firstSentence)) {
      const rest = styled.substring(firstSentenceEnd + 1).trim();
      const opener = pickBuddyOpener(mood);
      styled = rest.length > 5 ? `${opener} ${rest}` : opener;
      console.log(`[VOICE] OPENER REWRITE: "${firstSentence.trim()}" → "${opener}"`);
    }
  }

  // 2. STRIP BANNED PHRASES: Remove entire sentences containing banned phrases
  const banned = containsBannedPhrases(styled);
  if (banned.length > 0) {
    console.log(`[VOICE] Stripping banned phrases: ${banned.join(', ')}`);
    const sentences = splitSentences(styled);
    const cleaned = sentences.filter(s => {
      const sLower = s.toLowerCase();
      return !banned.some(b => sLower.includes(b.toLowerCase()));
    });
    if (cleaned.length > 0) {
      styled = cleaned.join(' ').trim();
    } else {
      styled = pickBuddyOpener(mood);
      console.log(`[VOICE] All sentences banned — replaced with buddy opener: "${styled}"`);
    }
  }

  // 3. STRIP THERAPIST FRAME SENTENCES: Remove any remaining therapist-frame sentences
  {
    const sentences = splitSentences(styled);
    const cleaned = [];
    let strippedCount = 0;
    for (const s of sentences) {
      if (containsTherapistFrame(s)) {
        strippedCount++;
        console.log(`[VOICE] THERAPIST FRAME stripped: "${s.trim()}"`);
      } else {
        cleaned.push(s);
      }
    }
    if (strippedCount > 0) {
      styled = cleaned.length > 0 ? cleaned.join(' ').trim() : pickBuddyOpener(mood);
    }
  }

  // 4. DISMISSIVE RESPONSE CHECK: Catch polite sign-offs that lack curiosity
  if (isResponseDismissive(styled)) {
    console.log(`[VOICE] DISMISSIVE detected: "${styled}" — not how a friend talks`);
    const stripped = stripDismissiveSentences(styled);
    styled = stripped || pickBuddyOpener(mood);
  }

  // 5. Lowercase first letter for grounded feel (unless it's "I")
  if (styled.length > 0 && styled[0] !== 'I' && /^[A-Z]/.test(styled)) {
    styled = styled[0].toLowerCase() + styled.slice(1);
  }
  
  // 6. Remove exclamation marks (too high energy)
  styled = styled.replace(/!/g, '.');
  
  // 7. Shorten overly long sentences (slow cadence)
  const sentences = splitSentences(styled);
  if (sentences.length > 4) {
    styled = sentences.slice(0, 3).join(' ');
  }
  
  // 8. BAN "mm." — always reads as attitude in text
  if (/\bmm\b/i.test(styled)) {
    const replacement = mood === 'emotional' 
      ? VOICE_PALETTE.heavy[Math.floor(Math.random() * VOICE_PALETTE.heavy.length)]
      : VOICE_PALETTE.neutral[Math.floor(Math.random() * VOICE_PALETTE.neutral.length)];
    const cleanReplacement = replacement.replace(/\.$/, '');
    styled = styled.replace(/\bmm\b[.,]?\s*/gi, cleanReplacement + ' ').replace(/\s{2,}/g, ' ').trim();
    console.log(`[VOICE] Replaced "mm" → "${cleanReplacement}"`);
  }

  // 9. MICRO-ACK GUARD: if response is ≤2 words and not in approved list, replace with warmer ack
  const wordCount = styled.trim().split(/\s+/).length;
  if (wordCount <= 2) {
    const normalized = styled.trim().toLowerCase().replace(/[^\w\s…]/g, '').trim();
    const isApproved = APPROVED_MICRO_ACKS.some(a => 
      a.toLowerCase().replace(/[^\w\s…]/g, '').trim() === normalized
    );
    if (!isApproved) {
      const palette = mood === 'emotional' ? VOICE_PALETTE.heavy : VOICE_PALETTE.light;
      const warmer = palette[Math.floor(Math.random() * palette.length)];
      console.log(`[VOICE] Unapproved micro-ack "${styled}" → "${warmer}"`);
      styled = warmer;
    }
  }
  
  // 9. Final safety: if everything got stripped, use a buddy fallback
  if (!styled || styled.trim().length < 3) {
    styled = pickBuddyOpener(mood);
    console.log(`[VOICE] Empty after cleanup — buddy fallback: "${styled}"`);
  }

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
VOICE STYLE — "warm-minimal":
- You are a FRIEND, not a therapist and not a polite stranger
- Be curious and engaged — ask about what they're telling you, like a friend actually would
- If they mention plans (movies, trips, events), ask about details: "what movie?", "who are you going with?", "oh nice, where?"
- NEVER give polite sign-offs like "enjoy the movie", "have a good time", "hope you enjoy it" — that's how a customer service agent, not a friend
- A friend says: "oh wait what movie?", "is it any good?", "tell me if it's worth watching"
- NEVER say "mm." — it always reads as attitude. Use: "got you." / "yeah." / "okay." instead
- One send-off max per message. Don't double up ("enjoy" + "hope you enjoy" = too much)
- Approved micro-acks (1-2 words): yeah / got you / oh nice / okay / damn / bet / true / fair / nice / cool / love that
- Use lowercase starts when natural
- Short sentences, slow cadence
- No exclamation marks
- Never restart the conversation
- Never use therapist phrases like "I hear you", "that sounds like", "let's explore", "unpack", "regulate"
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
    "good choice.",
    "here with you.",
  ];
  
  const positiveContinuations = [
    "nice.",
    "got you.",
    "cool.",
    "love that.",
  ];
  
  const emotionalContinuations = [
    "still here.",
    "got you.",
    "take your time.",
    "no rush.",
  ];
  
  const casualContinuations = [
    "hey, what's good?",
    "yo, what's happening?",
    "hey — what's new?",
    "hey. fill me in.",
  ];
  
  // Pick based on context
  let continuations = positiveContinuations;
  if (contexts.music) continuations = musicContinuations;
  else if (contexts.emotional) continuations = emotionalContinuations;
  else if (contexts.casual) continuations = casualContinuations;
  
  const lazySentencePatterns = [
    /what[''\u2019]?s\s+(been\s+)?on\s+your\s+mind/i,
    /what\s+would\s+you\s+like\s+to\s+talk\s+about/i,
    /what\s+brings\s+you\s+here/i,
    /how\s+are\s+you\s+feeling\s+(today|right now)?/i,
    /what\s+are\s+you\s+feeling/i,
    /how\s+can\s+I\s+support\s+you/i,
    /what[''\u2019]?s\s+going\s+on\s+(with\s+you)?/i,
    /tell\s+me\s+(more\s+)?about\s+what[''\u2019]?s\s+happening/i,
    /I[''\u2019]?m\s+here\s+(for\s+you\s*)?if\s+you\s+want\s+to\s+talk/i,
    /anything\s+(else\s+)?on\s+your\s+mind/i,
    /is\s+there\s+anything\s+(you[''\u2019]?d\s+like\s+to\s+share|on\s+your\s+mind)/i,
  ];

  const sentences = response.match(/[^.!?]+[.!?]+/g) || [response];
  const cleanSentences = sentences.filter(sentence => {
    return !lazySentencePatterns.some(p => p.test(sentence));
  });

  const cleanPart = cleanSentences.join(' ').replace(/\s{2,}/g, ' ').trim();

  if (cleanPart.length >= 8) {
    console.log(`[VOICE] Kept clean part: "${cleanPart}"`);
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
  
  const mood = detectConversationMood(recentHistory);

  // Check for banned phrases — actually strip them
  const banned = containsBannedPhrases(corrected);
  if (banned.length > 0) {
    issues.push(`Contains banned phrases: ${banned.join(', ')} — STRIPPING`);
    const sentences = splitSentences(corrected);
    const cleaned = sentences.filter(s => {
      const sLower = s.toLowerCase();
      return !banned.some(b => sLower.includes(b.toLowerCase()));
    });
    corrected = cleaned.length > 0 ? cleaned.join(' ').trim() : pickBuddyOpener(mood);
  }
  
  // Check for therapist validation frames — strip those sentences
  {
    const sentences = splitSentences(corrected);
    const cleaned = [];
    let frameCount = 0;
    for (const s of sentences) {
      if (containsTherapistFrame(s)) {
        frameCount++;
        issues.push(`Therapist frame: "${s.trim()}" — STRIPPED`);
      } else {
        cleaned.push(s);
      }
    }
    if (frameCount > 0) {
      corrected = cleaned.length > 0 ? cleaned.join(' ').trim() : pickBuddyOpener(mood);
    }
  }
  
  // Check for dismissive sign-offs — a friend wouldn't just say "enjoy the movie" and peace out
  if (isResponseDismissive(corrected)) {
    issues.push(`Dismissive sign-off detected: "${corrected}" — STRIPPING`);
    console.log(`[VOICE] ⚠️ DISMISSIVE: "${corrected}" — friends don't talk like this`);
    const stripped = stripDismissiveSentences(corrected);
    corrected = stripped || pickBuddyOpener(mood);
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
  
  // HOLLOW RESPONSE CHECK: Detect formulaic patterns that are topic-specific but emotionally dead
  {
    const hollow = detectHollowResponse(corrected);
    if (hollow) {
      const topics = extractRecentTopics(recentHistory);
      issues.push(`Hollow pattern detected: "${hollow}" - rewriting`);
      console.log(`[VOICE] ⚠️ HOLLOW PATTERN: "${hollow}"`);
      corrected = rewriteHollowSentence(corrected, topics);
    }
  }
  
  // REDUNDANCY CHECK: Strip sentences that just restate what the user said
  if (hasConversationContext) {
    const lastUserMsg = recentHistory.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    const lastUserLower = lastUserMsg.toLowerCase().trim();
    
    // Detect echo-back patterns: response that merely repeats user's short agreement
    // Only replace when the response is ONLY the echo (no additional content after it)
    const isUserAgreement = /^(ok|okay|sure|yes|yeah|yep|sounds good|go ahead|mhm|alright)[\s,.!]*$/i.test(lastUserLower);
    const correctedLower = corrected.toLowerCase().trim();
    const isResponseEcho = /^(ok|okay|sure|alright|sounds good)[\s,.!]*$/i.test(correctedLower);
    if (isUserAgreement && isResponseEcho) {
      // Check if there's music context — if user agreed to a song, replace with a play confirmation
      const hasMusicContext = recentHistory.some(m => m.role === 'assistant' && /night swim|ocean breathing|slow tides|euphoria|neon promise|tidal house|undertow|midnight underwater/i.test(m.content || ''));
      const replacement = hasMusicContext ? 'here—' : generateContextualContinuation(corrected, recentHistory);
      issues.push(`Echo-back detected: response echoes user agreement "${lastUserLower}" → replacing with "${replacement}"`);
      console.log(`[VOICE] ⚠️ ECHO-BACK: Response echoes user agreement — replacing (music=${hasMusicContext})`);
      corrected = replacement;
    }
    
    // Detect restating: "so you're feeling X" / "it seems like you" patterns
    const restatePatterns = [
      /^so (?:you(?:'re| are)|it (?:sounds|seems) like)/i,
      /^(?:it )?sounds like you/i,
      /^what (?:i(?:'m| am) hearing|you(?:'re| are) saying)/i,
      /^you(?:'re| are) (?:saying|telling me|expressing)/i,
    ];
    for (const pat of restatePatterns) {
      if (pat.test(corrected.trim())) {
        issues.push(`Restating pattern detected — stripping`);
        console.log(`[VOICE] ⚠️ RESTATE detected: "${corrected.substring(0, 60)}..."`);
        const sentences = corrected.split(/(?<=[.!?])\s+/);
        if (sentences.length > 1) {
          corrected = sentences.slice(1).join(' ');
        } else {
          corrected = generateContextualContinuation(corrected, recentHistory);
        }
        break;
      }
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

  // COHERENCE CHECK: Detect garbled sentences from bad model output
  // Catches broken preposition+verb junctions ("for is", "to are"), dangling fragments,
  // and other incoherent grammar the model sometimes produces
  {
    const GARBLED_JUNCTIONS = /\b(for|about|from|with|at|by|of|into|onto|through|over|under|between|among|after|before|during|until|since|toward|towards|against|upon|within|without|along|across|behind|beyond|beneath|beside|besides|despite|except|near|past|around|above|below)\s+(is|are|was|were|am|does|did)\b/i;
    const DOUBLE_SUBJECT = /\b(he|she|it|they|we|you|i)\s+(he|she|it|they|we|you|i)\b/i;

    const sentences = splitSentences(corrected);
    const coherentSentences = [];
    let hadGarbled = false;

    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;

      if (GARBLED_JUNCTIONS.test(trimmed) || DOUBLE_SUBJECT.test(trimmed)) {
        hadGarbled = true;
        console.log(`[VOICE] ⚠️ GARBLED SENTENCE: "${trimmed}" — stripping`);
        issues.push(`Garbled sentence detected: "${trimmed.slice(0, 60)}..." — STRIPPING`);
        continue;
      }

      coherentSentences.push(trimmed);
    }

    if (hadGarbled) {
      corrected = coherentSentences.length > 0
        ? coherentSentences.join(' ').trim()
        : generateContextualContinuation(response, recentHistory);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    corrected: applyVoiceStyle(corrected, intent, { recentHistory })
  };
}

module.exports = {
  applyVoiceStyle,
  containsTherapistFrame,
  THERAPIST_FRAME_PATTERNS,
  APPROVED_MICRO_ACKS,
  VOICE_PALETTE,
  BUDDY_OPENERS_EMOTIONAL,
  BUDDY_OPENERS_CASUAL,
  buildVoicePromptInjection,
  validateResponse,
  isConversationRestart,
  isResponseDismissive,
  stripDismissiveSentences,
  containsBannedPhrases,
  containsLazyQuestion,
  detectHollowResponse,
  rewriteHollowSentence,
  extractRecentTopics,
  generateContextualContinuation,
  detectConversationMood,
  BANNED_PHRASES,
  LAZY_GENERIC_QUESTIONS,
  HOLLOW_PATTERNS,
  DISMISSIVE_PATTERNS,
  VOICE_MARKERS,
  RESPONSE_TONE_MAP
};
