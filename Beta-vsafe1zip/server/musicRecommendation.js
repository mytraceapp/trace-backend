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
  { number: 1, name: 'Midnight Underwater', bpm: 76, moods: ['overwhelm', 'surrender', 'deep', 'insomnia', 'exhaustion', 'sleep'] },
  { number: 2, name: 'Slow Tides Over Glass', bpm: 80, moods: ['contemplation', 'stillness', 'slowing', 'pause', 'calm'] },
  { number: 3, name: 'Undertow', bpm: 100, moods: ['pensive', 'introspection', 'late-night', 'hypnotic', 'processing'] },
  { number: 4, name: 'Euphoria', bpm: 102, moods: ['hope', 'uplifting', 'transition', 'relief', 'better'] },
  { number: 5, name: 'Ocean Breathing', bpm: 104, moods: ['anxiety', 'tension', 'release', 'processing', 'nervous', 'panic'] },
  { number: 6, name: 'Tidal House', bpm: 104, moods: ['nostalgia', 'warmth', 'healing', 'memory', 'comfort', 'childhood'] },
  { number: 7, name: 'Neon Promise', bpm: 104, moods: ['longing', 'vulnerability', 'reassurance', 'relationship', 'miss', 'love'] }
];

const TRACK_NAME_ALIASES = {
  'midnight underwater': 1,
  'slow tides over glass': 2,
  'slow tides': 2,
  'undertow': 3,
  'midnight undertow': 3,
  'euphoria': 4,
  'calm euphoria': 4,
  'ocean breathing': 5,
  'tidal house': 6,
  'tidal memory glow': 6,
  'tidal memory': 6,
  'neon promise': 7
};

const sessionRecommendationHistory = new Map();

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
 * 
 * PLAYBACK MODES (v2):
 * - 'audio_player' → Night Swim tracks play in native app audio player
 * - 'spotify_journal' → Playlists open Spotify via journal modal play button
 * 
 * Legacy 'source' field is maintained for backwards compatibility
 */
function buildAudioAction(type, options = {}) {
  const {
    source = 'originals',
    playbackMode = 'audio_player',  // NEW: 'audio_player' | 'spotify_journal'
    album = 'night_swim',
    track = 0,
    trackName = null,
    playlistId = null,
    autoplay = true,
    message = null,
    offerLevel = null,              // NEW: 'SEED' | 'GENTLE' | 'DIRECT'
    revealName = true,              // NEW: whether to show track/playlist name
    action = null                   // 'pause' | 'resume' | null
  } = options;
  
  return {
    type,
    source,                         // Legacy field for backwards compat
    playbackMode,                   // NEW: preferred playback mode
    album,
    track,
    ...(trackName && { trackName }),
    ...(playlistId && { playlistId }),
    autoplay: type === 'open' ? autoplay : false,
    ...(message && { message }),
    ...(offerLevel && { offerLevel }),
    ...(revealName !== undefined && { revealName }),
    ...(action && { action })       // Include action for stop/resume
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

/**
 * Detect if user is requesting a specific track by name
 * @param {string} message - User's message
 * @returns {Object|null} Track info or null
 */
function detectSpecificTrackRequest(message) {
  if (!message) return null;
  
  const lowerMsg = message.toLowerCase();
  
  // CRITICAL: Require explicit PLAY INTENT before matching track names
  // This prevents "I felt euphoria today" from triggering audio playback
  const PLAY_INTENT_PATTERNS = [
    /^play\s/,                    // "play euphoria"
    /^put on\s/,                  // "put on neon promise"  
    /^can you play\s/,            // "can you play slow tides"
    /^play me\s/,                 // "play me undertow"
    /^start\s/,                   // "start tidal house"
    /^let me hear\s/,             // "let me hear ocean breathing"
    /^i want to hear\s/,          // "i want to hear midnight underwater"
    /^i want\s.*\splaying/,       // "i want euphoria playing"
    /play\s.*(?:track|song)/,     // "play that track" or "play the song"
  ];
  
  const hasPlayIntent = PLAY_INTENT_PATTERNS.some(pattern => pattern.test(lowerMsg));
  
  // If no play intent, don't match track names (prevents false positives)
  if (!hasPlayIntent) {
    return null;
  }
  
  // Check for direct track name mentions
  for (const [alias, trackNumber] of Object.entries(TRACK_NAME_ALIASES)) {
    if (lowerMsg.includes(alias)) {
      const track = NIGHT_SWIM_TRACKS.find(t => t.number === trackNumber);
      console.log(`[TRACK DETECT] Found specific track request: "${alias}" → Track ${trackNumber} (${track?.name})`);
      return {
        trackNumber,
        trackName: track?.name || alias,
        matchedAlias: alias
      };
    }
  }
  
  return null;
}

/**
 * Get recommended track based on emotional state, avoiding already-recommended tracks
 * @param {string} mood - Detected mood/emotion
 * @param {string} userId - User ID for session tracking
 * @param {number[]} excludeTracks - Tracks to exclude from recommendations
 * @returns {number} Track number (1-7)
 */
function getTrackForMood(mood, userId = null, excludeTracks = []) {
  const moodLower = (mood || '').toLowerCase();
  
  // Get session history if userId provided
  let sessionExcludes = [...excludeTracks];
  if (userId && sessionRecommendationHistory.has(userId)) {
    const history = sessionRecommendationHistory.get(userId);
    sessionExcludes = [...new Set([...sessionExcludes, ...history.tracks])];
  }
  
  // Score tracks by mood match
  const matches = [];
  for (const track of NIGHT_SWIM_TRACKS) {
    if (sessionExcludes.includes(track.number)) continue;
    
    let score = 0;
    for (const trackMood of track.moods) {
      if (moodLower.includes(trackMood) || trackMood.includes(moodLower)) {
        score += 2;
      }
    }
    
    if (score > 0) {
      matches.push({ track: track.number, score, name: track.name });
    }
  }
  
  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    console.log(`[TRACK SELECT] Mood "${mood}" matched: ${matches.map(m => `${m.name}(${m.score})`).join(', ')}`);
    return matches[0].track;
  }
  
  // Fallback: pick random from available
  const available = NIGHT_SWIM_TRACKS
    .map(t => t.number)
    .filter(n => !sessionExcludes.includes(n));
  
  if (available.length === 0) {
    // All tracks used, reset history
    console.log('[TRACK SELECT] All tracks recommended, resetting session history');
    if (userId) clearSessionHistory(userId);
    return Math.floor(Math.random() * 7) + 1;
  }
  
  const picked = available[Math.floor(Math.random() * available.length)];
  console.log(`[TRACK SELECT] No mood match, random pick: Track ${picked}`);
  return picked;
}

/**
 * Add a track to session recommendation history
 * @param {string} userId - User ID
 * @param {number} trackNumber - Track number that was recommended
 */
function addToSessionHistory(userId, trackNumber) {
  if (!userId) return;
  
  const now = Date.now();
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  
  if (!sessionRecommendationHistory.has(userId)) {
    sessionRecommendationHistory.set(userId, {
      tracks: [],
      startTime: now
    });
  }
  
  const history = sessionRecommendationHistory.get(userId);
  
  // Check if session expired
  if (now - history.startTime > SESSION_TIMEOUT_MS) {
    console.log(`[SESSION] Session expired for ${userId.substring(0, 8)}..., resetting history`);
    history.tracks = [];
    history.startTime = now;
  }
  
  if (!history.tracks.includes(trackNumber)) {
    history.tracks.push(trackNumber);
    console.log(`[SESSION] Added track ${trackNumber} to history for ${userId.substring(0, 8)}...: [${history.tracks.join(', ')}]`);
  }
}

/**
 * Get session recommendation history for a user
 * @param {string} userId - User ID
 * @returns {number[]} Array of recommended track numbers
 */
function getSessionHistory(userId) {
  if (!userId || !sessionRecommendationHistory.has(userId)) return [];
  
  const history = sessionRecommendationHistory.get(userId);
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  
  // Check if session expired
  if (Date.now() - history.startTime > SESSION_TIMEOUT_MS) {
    clearSessionHistory(userId);
    return [];
  }
  
  return history.tracks || [];
}

/**
 * Clear session recommendation history for a user
 * @param {string} userId - User ID
 */
function clearSessionHistory(userId) {
  if (userId) {
    sessionRecommendationHistory.delete(userId);
    console.log(`[SESSION] Cleared history for ${userId.substring(0, 8)}...`);
  }
}

/**
 * Get track info by number
 * @param {number} trackNumber - Track number (1-7)
 * @returns {Object|null} Track info
 */
function getTrackInfo(trackNumber) {
  return NIGHT_SWIM_TRACKS.find(t => t.number === trackNumber) || null;
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
  TRACK_NAME_ALIASES,
  parseTimeHour,
  detectSpecificTrackRequest,
  getTrackForMood,
  addToSessionHistory,
  getSessionHistory,
  clearSessionHistory,
  getTrackInfo
};
