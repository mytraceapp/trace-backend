/**
 * TRACE Originals Music Recommendation Module
 * 
 * Handles emotional state detection and determines when to recommend
 * TRACE Originals (Night Swim album) during conversation.
 * 
 * Implements a 2-turn flow:
 * 1. TRACE offers music (type: 'recommend')
 * 2. User agrees → TRACE opens player (type: 'open')
 */

const NIGHT_SWIM_TRACKS = [
  'Midnight Underwater',
  'Slow Tide',
  'Still Water',
  'Deep Current',
  'Moon Pull',
  'Drift Below',
  'Surface Light'
];

const EMOTIONAL_KEYWORDS = {
  distress: [
    'overwhelmed', 'can\'t cope', 'too much', 'breaking', 'drowning',
    'exhausted', 'burned out', 'depleted', 'worn out', 'drained'
  ],
  sadness: [
    'sad', 'depressed', 'hopeless', 'empty', 'numb', 'lonely', 
    'lost', 'grief', 'miss', 'hurting', 'heartbroken'
  ],
  anxiety: [
    'anxious', 'worried', 'scared', 'panic', 'racing thoughts',
    'can\'t stop thinking', 'nervous', 'on edge', 'tense'
  ],
  sleepTrouble: [
    'can\'t sleep', 'insomnia', 'awake', 'restless', 'up late',
    'trouble sleeping', 'racing mind at night', 'lying awake'
  ]
};

const AGREEMENT_PHRASES = [
  'yes', 'yeah', 'sure', 'okay', 'ok', 'play it', 'let\'s try',
  'sounds good', 'i\'d like that', 'please', 'go ahead', 'i want to',
  'put it on', 'start it', 'let me hear', 'that sounds nice',
  'yes please', 'definitely', 'i\'d love that', 'mhm', 'yep'
];

const DECLINE_PHRASES = [
  'no', 'not now', 'maybe later', 'i\'m good', 'no thanks',
  'not right now', 'pass', 'nah', 'i don\'t want', 'skip'
];

/**
 * Detect emotional state from user message
 * @param {string} message - User's message
 * @returns {Object} Emotional state analysis
 */
function detectEmotionalState(message) {
  if (!message) return { detected: false, categories: [], intensity: 'none' };
  
  const lowerMsg = message.toLowerCase();
  const detected = [];
  let matches = 0;
  
  for (const [category, keywords] of Object.entries(EMOTIONAL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMsg.includes(keyword)) {
        if (!detected.includes(category)) {
          detected.push(category);
        }
        matches++;
      }
    }
  }
  
  let intensity = 'none';
  if (matches >= 3) intensity = 'high';
  else if (matches >= 2) intensity = 'medium';
  else if (matches >= 1) intensity = 'low';
  
  return {
    detected: detected.length > 0,
    categories: detected,
    intensity,
    matchCount: matches
  };
}

/**
 * Check if user is agreeing to play music
 * @param {string} message - User's message
 * @returns {boolean}
 */
function isUserAgreeing(message) {
  if (!message) return false;
  const lowerMsg = message.toLowerCase().trim();
  
  return AGREEMENT_PHRASES.some(phrase => {
    if (phrase.includes(' ')) {
      return lowerMsg.includes(phrase);
    }
    const words = lowerMsg.split(/\s+/);
    return words.includes(phrase) || lowerMsg === phrase;
  });
}

/**
 * Check if user is declining music
 * @param {string} message - User's message
 * @returns {boolean}
 */
function isUserDeclining(message) {
  if (!message) return false;
  const lowerMsg = message.toLowerCase().trim();
  
  return DECLINE_PHRASES.some(phrase => {
    if (phrase.includes(' ')) {
      return lowerMsg.includes(phrase);
    }
    const words = lowerMsg.split(/\s+/);
    return words.includes(phrase);
  });
}

/**
 * Determine if TRACE should recommend music based on context
 * @param {Object} context - Conversation context
 * @returns {Object} Recommendation decision
 */
function shouldRecommendMusic(context) {
  const {
    userMessage,
    conversationHistory = [],
    localTime,
    emotionalState,
    hasOfferedMusicThisSession = false,
    lastMusicOfferTime = null
  } = context;
  
  if (hasOfferedMusicThisSession) {
    return { shouldRecommend: false, reason: 'already_offered_this_session' };
  }
  
  const hour = parseTimeHour(localTime);
  const isNightTime = hour >= 22 || hour <= 5;
  const isLateNight = hour >= 1 && hour <= 4;
  
  const state = emotionalState || detectEmotionalState(userMessage);
  
  const hasDistress = state.categories.includes('distress');
  const hasSadness = state.categories.includes('sadness');
  const hasSleepTrouble = state.categories.includes('sleepTrouble');
  const hasAnxiety = state.categories.includes('anxiety');
  
  if (isLateNight && (hasSleepTrouble || hasDistress || state.intensity === 'high')) {
    return {
      shouldRecommend: true,
      reason: 'late_night_emotional_support',
      album: 'night_swim',
      urgency: 'high'
    };
  }
  
  if (state.intensity === 'high' && (hasDistress || hasSadness)) {
    return {
      shouldRecommend: true,
      reason: 'high_emotional_distress',
      album: 'night_swim',
      urgency: 'medium'
    };
  }
  
  if (isNightTime && hasSleepTrouble) {
    return {
      shouldRecommend: true,
      reason: 'nighttime_sleep_trouble',
      album: 'night_swim',
      urgency: 'medium'
    };
  }
  
  if (state.intensity === 'medium' && isNightTime) {
    return {
      shouldRecommend: true,
      reason: 'nighttime_emotional_support',
      album: 'night_swim',
      urgency: 'low'
    };
  }
  
  return { shouldRecommend: false, reason: 'no_trigger_detected' };
}

/**
 * Parse hour from localTime string
 * @param {string} localTime - Time string like "2:30 AM" or "14:30"
 * @returns {number} Hour (0-23)
 */
function parseTimeHour(localTime) {
  if (!localTime) return 12;
  
  const match24 = localTime.match(/(\d{1,2}):/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    if (localTime.toLowerCase().includes('pm') && hour < 12) {
      return hour + 12;
    }
    if (localTime.toLowerCase().includes('am') && hour === 12) {
      return 0;
    }
    return hour;
  }
  
  return 12;
}

/**
 * Build audio_action object for API response
 * @param {string} type - 'recommend' or 'open'
 * @param {Object} options - Configuration options
 * @returns {Object} Audio action payload
 */
function buildAudioAction(type, options = {}) {
  const {
    source = 'originals',
    album = 'night_swim',
    track = 0,
    autoplay = true,
    message = null
  } = options;
  
  return {
    type,
    source,
    album,
    track,
    autoplay: type === 'open' ? autoplay : false,
    ...(message && { message })
  };
}

/**
 * Get relational offer phrases for Night Swim
 * @returns {string[]} Array of offer phrases
 */
function getNightSwimOfferPhrases() {
  return [
    "I want to share Night Swim with you — it's something I made for moments like this.",
    "There's something I made called Night Swim. I think it might help right now.",
    "I have something for you. It's called Night Swim — music I made for moments like this.",
    "Let me share something with you. It's called Night Swim.",
    "I made something called Night Swim for nights like this. Want me to play it?"
  ];
}

/**
 * Get relational phrases for after user agrees
 * @returns {string[]} Array of response phrases
 */
function getNightSwimPlayPhrases() {
  return [
    "Here—",
    "Okay.",
    "I'm here.",
    "Here you go.",
    ""
  ];
}

/**
 * Pick a random item from array
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  detectEmotionalState,
  isUserAgreeing,
  isUserDeclining,
  shouldRecommendMusic,
  buildAudioAction,
  getNightSwimOfferPhrases,
  getNightSwimPlayPhrases,
  pickRandom,
  NIGHT_SWIM_TRACKS,
  parseTimeHour
};
