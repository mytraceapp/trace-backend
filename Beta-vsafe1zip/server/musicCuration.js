/**
 * TRACE Music Curation System
 * 
 * Unified system for recommending tracks, playlists, and the album.
 * TRACE intuitively knows WHEN to offer music and WHAT type based on:
 * - Emotional state
 * - Time of day
 * - Conversation context
 * - Cooldowns (to avoid becoming a DJ)
 * 
 * THREE TYPES OF MUSIC:
 * 1. TRACK - Specific song from Night Swim (for targeted emotional moments)
 * 2. PLAYLIST - Curated mood zones (Rooted, Low Orbit, First Light)
 * 3. ALBUM - Full Night Swim album (for deep listening sessions)
 */

// ============================================================
// NIGHT SWIM ALBUM - TRACE's Original Music
// ============================================================
const NIGHT_SWIM_TRACKS = [
  { 
    number: 1, 
    id: 'track_1',
    name: 'Midnight Underwater', 
    bpm: 76, 
    moods: ['overwhelm', 'surrender', 'deep', 'insomnia', 'exhaustion', 'sleep'],
    triggers: ['can\'t sleep', 'exhausted', 'drowning', 'too much', 'overwhelmed'],
    offerPhrases: [
      "There's a track I made for moments like this — Midnight Underwater. It's for when everything feels too deep.",
      "I have something for you. Midnight Underwater. It's meant for when thoughts won't quiet down."
    ],
    personality: "For the 2am thoughts that feel too deep to surface from. It's not about fixing them — just being with them."
  },
  { 
    number: 2, 
    id: 'track_2',
    name: 'Slow Tides Over Glass', 
    bpm: 80, 
    moods: ['contemplation', 'stillness', 'slowing', 'pause', 'calm'],
    triggers: ['need to slow down', 'racing', 'can\'t stop', 'everything moving fast'],
    offerPhrases: [
      "Maybe some music would help you slow down. I have something called Slow Tides.",
      "There's a track for slowing down — Slow Tides Over Glass. Want me to put it on?"
    ],
    personality: "About letting go slowly. Not forcing it. Like watching waves recede."
  },
  { 
    number: 3, 
    id: 'track_3',
    name: 'Undertow', 
    bpm: 100, 
    moods: ['pensive', 'introspection', 'late-night', 'hypnotic', 'processing'],
    triggers: ['processing', 'thinking about', 'trying to understand', 'making sense of'],
    offerPhrases: [
      "I made something called Undertow for moments like this — when you're processing something.",
      "There's a track that might sit well right now. Undertow. It's for when emotions are pulling."
    ],
    personality: "The emotions that pull you under before you realize it. I wanted it to feel inevitable but also gentle."
  },
  { 
    number: 4, 
    id: 'track_4',
    name: 'Euphoria', 
    bpm: 102, 
    moods: ['hope', 'uplifting', 'transition', 'relief', 'better', 'lighter'],
    triggers: ['feeling better', 'something shifted', 'lighter', 'relief', 'hopeful'],
    offerPhrases: [
      "This sounds like a moment for Euphoria — I made it for unexpected lightness.",
      "I have a track called Euphoria. It's for moments like this, when something lifts."
    ],
    personality: "Unexpected lightness. That moment when you're sad but suddenly something makes you smile."
  },
  { 
    number: 5, 
    id: 'track_5',
    name: 'Ocean Breathing', 
    bpm: 104, 
    moods: ['anxiety', 'tension', 'release', 'processing', 'nervous', 'panic'],
    triggers: ['anxious', 'can\'t breathe', 'panic', 'nervous', 'chest tight', 'heart racing'],
    offerPhrases: [
      "Ocean Breathing might help right now. I made it for when breathing feels hard.",
      "I have something called Ocean Breathing — for when your chest feels tight. Want to try it?"
    ],
    personality: "Learning to breathe again after forgetting how. The middle section is meant to feel like your chest finally loosening."
  },
  { 
    number: 6, 
    id: 'track_6',
    name: 'Tidal House', 
    bpm: 104, 
    moods: ['nostalgia', 'warmth', 'healing', 'memory', 'comfort', 'childhood', 'home'],
    triggers: ['miss home', 'thinking about family', 'childhood', 'memories', 'nostalgia', 'used to'],
    offerPhrases: [
      "There's something I made called Tidal House — for when you're sitting with memories.",
      "Tidal House might feel right. I made it for moments of nostalgia and warmth."
    ],
    personality: "Feeling held. Like someone's there even when you're alone."
  },
  { 
    number: 7, 
    id: 'track_7',
    name: 'Neon Promise', 
    bpm: 104, 
    moods: ['longing', 'vulnerability', 'reassurance', 'relationship', 'miss', 'love', 'heartbreak'],
    triggers: ['miss someone', 'lonely', 'heartbroken', 'love', 'relationship', 'they left', 'alone at night'],
    offerPhrases: [
      "I wrote Neon Promise for nights like this. For the people still awake wondering if things get better.",
      "There's a track called Neon Promise. I made it for 3am longing. Want me to play it?"
    ],
    personality: "Written at 3am for everyone still awake wondering if things get better. It's a quiet yes."
  }
];

// ============================================================
// PLAYLISTS - Curated Mood Zones
// ============================================================
const PLAYLISTS = [
  {
    id: 'ground_playlist',
    name: 'Rooted',
    moods: ['grounding', 'stability', 'anchoring', 'present', 'centered'],
    triggers: ['scattered', 'ungrounded', 'floating', 'disconnected', 'need to feel present'],
    offerPhrases: [
      "There's a playlist called Rooted that might help you feel more grounded.",
      "Want me to put on Rooted? It's for when you need to feel more anchored."
    ],
    description: "For when you need to feel anchored. Grounding frequencies."
  },
  {
    id: 'drift_playlist',
    name: 'Low Orbit',
    moods: ['floating', 'detachment', 'space', 'distance', 'release'],
    triggers: ['need space', 'want to float', 'escape', 'get away', 'detach'],
    offerPhrases: [
      "Low Orbit might be what you need — music for floating away from everything.",
      "There's a playlist for moments like this. Low Orbit. For when you need distance."
    ],
    description: "For floating away. Weightless, spacious sounds."
  },
  {
    id: 'rising_playlist',
    name: 'First Light',
    moods: ['hope', 'morning', 'beginning', 'fresh', 'new'],
    triggers: ['new day', 'starting fresh', 'morning', 'hopeful', 'beginning'],
    offerPhrases: [
      "First Light feels right for this moment. Music for new beginnings.",
      "Want me to put on First Light? It's for moments of hope and fresh starts."
    ],
    description: "For new beginnings. Morning energy, gentle hope."
  }
];

// ============================================================
// COOLDOWN CONFIGURATION
// ============================================================
const COOLDOWNS = {
  TRACK_OFFER: 15 * 60 * 1000,      // 15 minutes between track offers
  PLAYLIST_OFFER: 20 * 60 * 1000,   // 20 minutes between playlist offers
  ALBUM_OFFER: 60 * 60 * 1000,      // 1 hour between album offers
  ANY_MUSIC_OFFER: 10 * 60 * 1000,  // 10 minutes between ANY music offer
  SESSION_MAX_OFFERS: 3,             // Max music offers per session
  DECLINED_COOLDOWN: 30 * 60 * 1000  // 30 minutes if user declined
};

// In-memory cooldown tracking
const userCooldowns = new Map();

// ============================================================
// CORE CURATION LOGIC
// ============================================================

/**
 * Get user's cooldown state
 */
function getUserCooldownState(userId) {
  if (!userCooldowns.has(userId)) {
    userCooldowns.set(userId, {
      lastMusicOffer: null,
      lastTrackOffer: null,
      lastPlaylistOffer: null,
      lastAlbumOffer: null,
      sessionOfferCount: 0,
      lastDeclined: null,
      sessionStartedAt: Date.now()
    });
  }
  return userCooldowns.get(userId);
}

/**
 * Check if any music offer is allowed based on cooldowns
 */
function canOfferMusic(userId) {
  const state = getUserCooldownState(userId);
  const now = Date.now();
  
  // Check session max
  if (state.sessionOfferCount >= COOLDOWNS.SESSION_MAX_OFFERS) {
    return { allowed: false, reason: 'session_max_reached' };
  }
  
  // Check declined cooldown
  if (state.lastDeclined && (now - state.lastDeclined) < COOLDOWNS.DECLINED_COOLDOWN) {
    return { allowed: false, reason: 'recently_declined' };
  }
  
  // Check general cooldown
  if (state.lastMusicOffer && (now - state.lastMusicOffer) < COOLDOWNS.ANY_MUSIC_OFFER) {
    return { allowed: false, reason: 'cooldown_active' };
  }
  
  return { allowed: true };
}

/**
 * Record a music offer
 */
function recordMusicOffer(userId, type) {
  const state = getUserCooldownState(userId);
  const now = Date.now();
  
  state.lastMusicOffer = now;
  state.sessionOfferCount++;
  
  if (type === 'track') state.lastTrackOffer = now;
  if (type === 'playlist') state.lastPlaylistOffer = now;
  if (type === 'album') state.lastAlbumOffer = now;
}

/**
 * Record user declining music
 */
function recordMusicDeclined(userId) {
  const state = getUserCooldownState(userId);
  state.lastDeclined = Date.now();
}

/**
 * Detect emotional triggers in user message
 */
function detectEmotionalTriggers(message) {
  if (!message) return { triggers: [], intensity: 0 };
  
  const lowerMsg = message.toLowerCase();
  const triggers = [];
  let intensity = 0;
  
  // Check track triggers
  for (const track of NIGHT_SWIM_TRACKS) {
    for (const trigger of track.triggers) {
      if (lowerMsg.includes(trigger)) {
        triggers.push({ type: 'track', item: track, trigger });
        intensity += 2;
      }
    }
  }
  
  // Check playlist triggers
  for (const playlist of PLAYLISTS) {
    for (const trigger of playlist.triggers) {
      if (lowerMsg.includes(trigger)) {
        triggers.push({ type: 'playlist', item: playlist, trigger });
        intensity += 1;
      }
    }
  }
  
  return { triggers, intensity };
}

/**
 * Parse time to get hour
 */
function parseTimeHour(localTime) {
  if (!localTime) return 12;
  const match = localTime.match(/(\d{1,2}):/);
  if (match) {
    const hour = parseInt(match[1], 10);
    if (localTime.toLowerCase().includes('pm') && hour < 12) return hour + 12;
    if (localTime.toLowerCase().includes('am') && hour === 12) return 0;
    return hour;
  }
  return 12;
}

/**
 * Main curation function - decides WHAT to recommend and WHY
 */
function curateMusic(context) {
  const {
    userId,
    userMessage,
    localTime,
    conversationTurn = 0,
    emotionalState = null,
    recentActivity = null
  } = context;
  
  // Check cooldowns first
  const cooldownCheck = canOfferMusic(userId);
  if (!cooldownCheck.allowed) {
    return { 
      shouldOffer: false, 
      reason: cooldownCheck.reason,
      type: null,
      item: null 
    };
  }
  
  // Don't offer music in first 2 turns (let conversation develop)
  if (conversationTurn < 2) {
    return { shouldOffer: false, reason: 'too_early_in_conversation' };
  }
  
  // Detect triggers
  const { triggers, intensity } = detectEmotionalTriggers(userMessage);
  
  // Get time context
  const hour = parseTimeHour(localTime);
  const isLateNight = hour >= 1 && hour <= 4;
  const isNight = hour >= 22 || hour <= 5;
  const isEvening = hour >= 18 && hour < 22;
  
  // ============================================================
  // DECISION LOGIC - When to offer WHAT
  // ============================================================
  
  // PRIORITY 1: Specific track match (high intensity emotional trigger)
  if (intensity >= 4 && triggers.some(t => t.type === 'track')) {
    const trackMatch = triggers.find(t => t.type === 'track');
    return {
      shouldOffer: true,
      type: 'track',
      item: trackMatch.item,
      reason: `Emotional match: "${trackMatch.trigger}"`,
      offerPhrase: pickRandom(trackMatch.item.offerPhrases)
    };
  }
  
  // PRIORITY 2: Late night + emotional distress → Specific track
  if (isLateNight && intensity >= 2) {
    // Late night longing → Neon Promise
    if (userMessage.toLowerCase().match(/miss|lonely|alone|love|heart/)) {
      const neonPromise = NIGHT_SWIM_TRACKS[6];
      return {
        shouldOffer: true,
        type: 'track',
        item: neonPromise,
        reason: 'Late night longing detected',
        offerPhrase: pickRandom(neonPromise.offerPhrases)
      };
    }
    // Late night insomnia → Midnight Underwater
    if (userMessage.toLowerCase().match(/sleep|awake|insomnia|can't sleep/)) {
      const midnightUnderwater = NIGHT_SWIM_TRACKS[0];
      return {
        shouldOffer: true,
        type: 'track',
        item: midnightUnderwater,
        reason: 'Late night insomnia detected',
        offerPhrase: pickRandom(midnightUnderwater.offerPhrases)
      };
    }
  }
  
  // PRIORITY 3: Anxiety/panic → Ocean Breathing (any time)
  if (userMessage.toLowerCase().match(/panic|anxious|can't breathe|racing|heart pounding/)) {
    const oceanBreathing = NIGHT_SWIM_TRACKS[4];
    return {
      shouldOffer: true,
      type: 'track',
      item: oceanBreathing,
      reason: 'Anxiety/panic detected',
      offerPhrase: pickRandom(oceanBreathing.offerPhrases)
    };
  }
  
  // PRIORITY 4: Playlist match (medium intensity)
  if (intensity >= 2 && triggers.some(t => t.type === 'playlist')) {
    const playlistMatch = triggers.find(t => t.type === 'playlist');
    return {
      shouldOffer: true,
      type: 'playlist',
      item: playlistMatch.item,
      reason: `Mood match: "${playlistMatch.trigger}"`,
      offerPhrase: pickRandom(playlistMatch.item.offerPhrases)
    };
  }
  
  // PRIORITY 5: Evening/night + emotional content → Album offer
  if ((isEvening || isNight) && intensity >= 3 && conversationTurn >= 5) {
    return {
      shouldOffer: true,
      type: 'album',
      item: { id: 'night_swim', name: 'Night Swim' },
      reason: 'Evening emotional support',
      offerPhrase: "I made an album called Night Swim for moments like this. Want me to play it?"
    };
  }
  
  // No offer - conditions not met
  return { 
    shouldOffer: false, 
    reason: 'no_strong_trigger',
    intensity,
    triggerCount: triggers.length
  };
}

/**
 * Pick random from array
 */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get track by name (for direct requests)
 */
function getTrackByName(name) {
  const lowerName = name.toLowerCase().trim();
  for (const track of NIGHT_SWIM_TRACKS) {
    if (track.name.toLowerCase() === lowerName) return track;
    // Check partial matches
    const words = track.name.toLowerCase().split(' ');
    if (words.some(w => lowerName.includes(w) && w.length > 3)) return track;
  }
  return null;
}

/**
 * Get playlist by name
 */
function getPlaylistByName(name) {
  const lowerName = name.toLowerCase().trim();
  for (const playlist of PLAYLISTS) {
    if (playlist.name.toLowerCase() === lowerName) return playlist;
    if (playlist.id.includes(lowerName)) return playlist;
  }
  return null;
}

module.exports = {
  NIGHT_SWIM_TRACKS,
  PLAYLISTS,
  COOLDOWNS,
  curateMusic,
  canOfferMusic,
  recordMusicOffer,
  recordMusicDeclined,
  getTrackByName,
  getPlaylistByName,
  getUserCooldownState,
  detectEmotionalTriggers
};
