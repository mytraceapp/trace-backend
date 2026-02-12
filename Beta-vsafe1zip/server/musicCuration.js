/**
 * TRACE Music Curation System (v2)
 * 
 * Unified system for recommending tracks, playlists, and the album.
 * Features advanced anti-DJ logic to feel natural, not pushy.
 * 
 * PLAYBACK MODES:
 * - TRACK/ALBUM → plays in app's native audio player
 * - PLAYLIST → opens Spotify link via journal modal play button
 * 
 * OFFER LADDER (escalation rules):
 * - Level 0 (SEED): No title, just hints ("I have something for this mood")
 * - Level 1 (GENTLE): Default. Ask first ("Want a track?"), reveal only on yes
 * - Level 2 (DIRECT): Named offer. Only for late night distress or explicit ask
 * 
 * ANTI-DJ PHILOSOPHY:
 * The relationship is the product, not the music.
 */

// ============================================================
// NIGHT SWIM ALBUM - TRACE's Original Music (plays in audio player)
// ============================================================
const NIGHT_SWIM_TRACKS = [
  { 
    number: 1, 
    id: 'track_1',
    name: 'Midnight Underwater', 
    bpm: 76, 
    playbackMode: 'audio_player',
    moods: ['overwhelm', 'surrender', 'deep', 'insomnia', 'exhaustion', 'sleep'],
    triggers: ['can\'t sleep', 'exhausted', 'drowning', 'too much', 'overwhelmed'],
    seedPhrase: "I have something for moments when thoughts won't quiet.",
    gentlePhrase: "Want me to put something on? I made it for this.",
    directPhrase: "There's a track called Midnight Underwater — it's for when everything feels too deep.",
    personality: "For the 2am thoughts that feel too deep to surface from."
  },
  { 
    number: 2, 
    id: 'track_2',
    name: 'Slow Tides Over Glass', 
    bpm: 80, 
    playbackMode: 'audio_player',
    moods: ['contemplation', 'stillness', 'slowing', 'pause', 'calm'],
    triggers: ['need to slow down', 'racing', 'can\'t stop', 'everything moving fast'],
    seedPhrase: "I have something that might help you slow down.",
    gentlePhrase: "Want some music for slowing down?",
    directPhrase: "There's a track for this — Slow Tides Over Glass. Want me to put it on?",
    personality: "About letting go slowly. Not forcing it."
  },
  { 
    number: 3, 
    id: 'track_3',
    name: 'Undertow', 
    bpm: 100, 
    playbackMode: 'audio_player',
    moods: ['pensive', 'introspection', 'late-night', 'hypnotic', 'processing'],
    triggers: ['processing', 'thinking about', 'trying to understand', 'making sense of'],
    seedPhrase: "Music might help with processing. If you want it.",
    gentlePhrase: "Want something in the background while you sit with this?",
    directPhrase: "I made something called Undertow — it's for when emotions are pulling.",
    personality: "The emotions that pull you under before you realize it."
  },
  { 
    number: 4, 
    id: 'track_4',
    name: 'Euphoria', 
    bpm: 102, 
    playbackMode: 'audio_player',
    moods: ['hope', 'uplifting', 'transition', 'relief', 'better', 'lighter'],
    triggers: ['feeling better', 'something shifted', 'lighter', 'relief', 'hopeful'],
    seedPhrase: "I have something for moments like this — when something lifts.",
    gentlePhrase: "Want me to put something hopeful on?",
    directPhrase: "This sounds like a moment for Euphoria. I made it for unexpected lightness.",
    personality: "Unexpected lightness. That moment when you're sad but suddenly something makes you smile."
  },
  { 
    number: 5, 
    id: 'track_5',
    name: 'Ocean Breathing', 
    bpm: 104, 
    playbackMode: 'audio_player',
    moods: ['anxiety', 'tension', 'release', 'processing', 'nervous', 'panic'],
    triggers: ['anxious', 'can\'t breathe', 'panic', 'nervous', 'chest tight', 'heart racing'],
    seedPhrase: "I have something for when breathing feels hard. No pressure.",
    gentlePhrase: "Want me to put something calming on?",
    directPhrase: "Ocean Breathing might help right now — it's for when your chest feels tight.",
    personality: "Learning to breathe again after forgetting how."
  },
  { 
    number: 6, 
    id: 'track_6',
    name: 'Tidal House', 
    bpm: 104, 
    playbackMode: 'audio_player',
    moods: ['nostalgia', 'warmth', 'healing', 'memory', 'comfort', 'childhood', 'home'],
    triggers: ['miss home', 'thinking about family', 'childhood', 'memories', 'nostalgia', 'used to'],
    seedPhrase: "I have something for sitting with memories, if you want.",
    gentlePhrase: "Want something for nostalgia? I have just the thing.",
    directPhrase: "There's something called Tidal House — for when you're sitting with memories.",
    personality: "Feeling held. Like someone's there even when you're alone."
  },
  { 
    number: 7, 
    id: 'track_7',
    name: 'Neon Promise', 
    bpm: 104, 
    playbackMode: 'audio_player',
    moods: ['longing', 'vulnerability', 'reassurance', 'relationship', 'miss', 'love', 'heartbreak'],
    triggers: ['miss someone', 'lonely', 'heartbroken', 'love', 'relationship', 'they left', 'alone at night'],
    seedPhrase: "I have something for nights like this. If it would help.",
    gentlePhrase: "Want me to put something on? For the longing.",
    directPhrase: "I wrote Neon Promise for nights like this — for people still awake wondering if things get better.",
    personality: "Written at 3am for everyone still awake wondering if things get better. It's a quiet yes."
  }
];

// ============================================================
// PLAYLISTS - Curated Mood Zones (opens Spotify via journal modal)
// ============================================================
const PLAYLISTS = [
  {
    id: 'rooted_playlist',
    name: 'Rooted',
    playbackMode: 'spotify_journal',
    moods: ['grounding', 'stability', 'anchoring', 'present', 'centered'],
    triggers: ['scattered', 'ungrounded', 'floating', 'disconnected', 'need to feel present'],
    seedPhrase: "There's a playlist for this if you want something grounding.",
    gentlePhrase: "Want something for feeling more anchored?",
    directPhrase: "There's a playlist called Rooted — it's for when you need to feel more grounded.",
    description: "For when you need to feel anchored. Grounding frequencies."
  },
  {
    id: 'low_orbit_playlist',
    name: 'Low Orbit',
    playbackMode: 'spotify_journal',
    moods: ['floating', 'detachment', 'space', 'distance', 'release'],
    triggers: ['need space', 'want to float', 'escape', 'get away', 'detach'],
    seedPhrase: "I have a playlist for floating away. Just an option.",
    gentlePhrase: "Want something spacious? For distance.",
    directPhrase: "Low Orbit might be what you need — music for floating away from everything.",
    description: "For floating away. Weightless, spacious sounds."
  },
  {
    id: 'first_light_playlist',
    name: 'First Light',
    playbackMode: 'spotify_journal',
    moods: ['hope', 'morning', 'beginning', 'fresh', 'new'],
    triggers: ['new day', 'starting fresh', 'morning', 'hopeful', 'beginning'],
    seedPhrase: "There's music for new beginnings, if that sounds right.",
    gentlePhrase: "Want something hopeful? I have a playlist for that.",
    directPhrase: "First Light feels right for this moment — music for fresh starts.",
    description: "For new beginnings. Morning energy, gentle hope."
  }
];

// ============================================================
// OFFER LADDER LEVELS
// ============================================================
const OFFER_LEVEL = {
  SEED: 0,      // Hint only, no title
  GENTLE: 1,    // Ask first, reveal on yes (DEFAULT)
  DIRECT: 2     // Name the track/playlist (rare)
};

// ============================================================
// COOLDOWN CONFIGURATION (v2 - smarter by type)
// ============================================================
const COOLDOWNS = {
  ANY_MUSIC_OFFER: 12 * 60 * 1000,        // 12 min between ANY offer
  TRACK_OFFER: 20 * 60 * 1000,            // 20 min between track offers
  PLAYLIST_OFFER: 25 * 60 * 1000,         // 25 min between playlist offers
  ALBUM_OFFER: 90 * 60 * 1000,            // 90 min between album offers
  
  // Decline-specific cooldowns (sticky by type)
  DECLINED_TRACK: 60 * 60 * 1000,         // 60 min after declining track
  DECLINED_PLAYLIST: 90 * 60 * 1000,      // 90 min after declining playlist
  DECLINED_ALBUM: 24 * 60 * 60 * 1000,    // 24 hours after declining album
  
  // Session limits (unified with index.js MAX_SESSION_MUSIC_OFFERS)
  SESSION_MAX_OFFERS_NORMAL: 3,           // Stable/reflective user (matches unified governor)
  SESSION_MAX_OFFERS_CRISIS: 1,           // High distress user
  SESSION_DOUBLE_DECLINE_BLOCK: true,     // Stop all offers after 2 declines
  
  // No-repeat memory
  TURN_MEMORY_WINDOW: 10,                 // Don't re-offer in last N turns
  ITEM_REPEAT_DAYS: 7                     // Don't offer same track/playlist for 7 days
};

// In-memory state tracking
const userMusicState = new Map();

// ============================================================
// HUMAN MICROCOPY (relationship > content)
// ============================================================
const OFFER_SUFFIXES = [
  "No pressure — just an option.",
  "If it would help.",
  "We can also just stay here and talk.",
  "Only if you want.",
  "Just something I made."
];

const AFTER_DECLINE_ACKNOWLEDGMENTS = [
  "Okay. I'm here either way.",
  "That's fine. We can just talk.",
  "Got it. No music needed.",
  "Understood. Just being here with you."
];

// ============================================================
// PERMISSION & RESISTANCE SIGNALS
// ============================================================
const PERMISSION_SIGNALS = [
  'music', 'song', 'playlist', 'headphones', 'listening',
  'what should i do', 'help me calm', 'what can help',
  'something for this', 'anything that helps'
];

const RESISTANCE_SIGNALS = [
  'no', 'not now', 'don\'t want', 'stop', 'enough',
  'just need to talk', 'just listen', 'vent',
  'what do i do about', 'how do i', 'should i'  // Logistics mode
];

// ============================================================
// CORE STATE MANAGEMENT
// ============================================================

function getUserMusicState(userId) {
  if (!userMusicState.has(userId)) {
    userMusicState.set(userId, {
      // Timing
      lastMusicOffer: null,
      lastTrackOffer: null,
      lastPlaylistOffer: null,
      lastAlbumOffer: null,
      sessionStartedAt: Date.now(),
      
      // Counts
      sessionOfferCount: 0,
      sessionDeclineCount: 0,
      
      // Decline tracking (by type)
      lastDeclinedTrack: null,
      lastDeclinedPlaylist: null,
      lastDeclinedAlbum: null,
      
      // Acceptance history (for escalation)
      hasAcceptedThisSession: false,
      lastAcceptedType: null,
      
      // Turn-based memory
      recentOfferTurns: [],     // Track which turns had offers
      lastOfferedItemId: null,
      
      // No-repeat memory (item_id → timestamp)
      offeredItems: new Map(),
      
      // Crisis detection
      isInCrisis: false
    });
  }
  return userMusicState.get(userId);
}

// ============================================================
// INTENT WEIGHT SCORING
// ============================================================

function calculateIntentScore(message, state) {
  let score = 0;
  const lowerMsg = message.toLowerCase();
  
  // Permission signals (+points)
  for (const signal of PERMISSION_SIGNALS) {
    if (lowerMsg.includes(signal)) {
      score += 3;
    }
  }
  
  // Prior acceptance in session (+points)
  if (state.hasAcceptedThisSession) {
    score += 4;
  }
  
  // Resistance signals (-points)
  for (const signal of RESISTANCE_SIGNALS) {
    if (lowerMsg.includes(signal)) {
      score -= 3;
    }
  }
  
  // Previous declines this session (-points)
  score -= state.sessionDeclineCount * 3;
  
  // Fast-paced conversation detection (short messages)
  if (message.length < 20) {
    score -= 1;  // Likely rapid back-and-forth
  }
  
  return score;
}

// ============================================================
// COOLDOWN CHECKS
// ============================================================

function canOfferMusic(userId, type, conversationTurn, externalSessionCount) {
  const state = getUserMusicState(userId);
  const now = Date.now();
  
  // Double-decline block
  if (COOLDOWNS.SESSION_DOUBLE_DECLINE_BLOCK && state.sessionDeclineCount >= 2) {
    return { allowed: false, reason: 'double_decline_block' };
  }
  
  // Session max (adjust by crisis state)
  // Use higher of internal count vs external (conversationState) count for true unification
  const maxOffers = state.isInCrisis 
    ? COOLDOWNS.SESSION_MAX_OFFERS_CRISIS 
    : COOLDOWNS.SESSION_MAX_OFFERS_NORMAL;
  
  const effectiveCount = Math.max(state.sessionOfferCount, externalSessionCount || 0);
  if (effectiveCount >= maxOffers) {
    return { allowed: false, reason: 'session_max_reached', effectiveCount, maxOffers };
  }
  
  // Turn memory window (no offer in last N turns)
  const recentTurns = state.recentOfferTurns.filter(t => conversationTurn - t < COOLDOWNS.TURN_MEMORY_WINDOW);
  if (recentTurns.length > 0) {
    return { allowed: false, reason: 'too_recent_turn' };
  }
  
  // General cooldown
  if (state.lastMusicOffer && (now - state.lastMusicOffer) < COOLDOWNS.ANY_MUSIC_OFFER) {
    return { allowed: false, reason: 'general_cooldown' };
  }
  
  // Type-specific decline cooldowns
  if (type === 'track' && state.lastDeclinedTrack && (now - state.lastDeclinedTrack) < COOLDOWNS.DECLINED_TRACK) {
    return { allowed: false, reason: 'declined_track_cooldown' };
  }
  if (type === 'playlist' && state.lastDeclinedPlaylist && (now - state.lastDeclinedPlaylist) < COOLDOWNS.DECLINED_PLAYLIST) {
    return { allowed: false, reason: 'declined_playlist_cooldown' };
  }
  if (type === 'album' && state.lastDeclinedAlbum && (now - state.lastDeclinedAlbum) < COOLDOWNS.DECLINED_ALBUM) {
    return { allowed: false, reason: 'declined_album_cooldown' };
  }
  
  // Type-specific offer cooldowns
  if (type === 'track' && state.lastTrackOffer && (now - state.lastTrackOffer) < COOLDOWNS.TRACK_OFFER) {
    return { allowed: false, reason: 'track_offer_cooldown' };
  }
  if (type === 'playlist' && state.lastPlaylistOffer && (now - state.lastPlaylistOffer) < COOLDOWNS.PLAYLIST_OFFER) {
    return { allowed: false, reason: 'playlist_offer_cooldown' };
  }
  if (type === 'album' && state.lastAlbumOffer && (now - state.lastAlbumOffer) < COOLDOWNS.ALBUM_OFFER) {
    return { allowed: false, reason: 'album_offer_cooldown' };
  }
  
  return { allowed: true };
}

function canOfferSpecificItem(userId, itemId) {
  const state = getUserMusicState(userId);
  const lastOffered = state.offeredItems.get(itemId);
  
  if (lastOffered) {
    const daysSince = (Date.now() - lastOffered) / (24 * 60 * 60 * 1000);
    if (daysSince < COOLDOWNS.ITEM_REPEAT_DAYS) {
      return { allowed: false, reason: 'item_recently_offered', daysSince: Math.round(daysSince) };
    }
  }
  
  return { allowed: true };
}

// ============================================================
// RECORD ACTIONS
// ============================================================

function recordMusicOffer(userId, type, itemId, conversationTurn) {
  const state = getUserMusicState(userId);
  const now = Date.now();
  
  state.lastMusicOffer = now;
  state.sessionOfferCount++;
  state.lastOfferedItemId = itemId;
  state.recentOfferTurns.push(conversationTurn);
  state.offeredItems.set(itemId, now);
  
  if (type === 'track') state.lastTrackOffer = now;
  if (type === 'playlist') state.lastPlaylistOffer = now;
  if (type === 'album') state.lastAlbumOffer = now;
}

function recordMusicAccepted(userId, type) {
  const state = getUserMusicState(userId);
  state.hasAcceptedThisSession = true;
  state.lastAcceptedType = type;
}

function recordMusicDeclined(userId, type) {
  const state = getUserMusicState(userId);
  const now = Date.now();
  
  state.sessionDeclineCount++;
  
  if (type === 'track') state.lastDeclinedTrack = now;
  if (type === 'playlist') state.lastDeclinedPlaylist = now;
  if (type === 'album') state.lastDeclinedAlbum = now;
}

function setCrisisMode(userId, isCrisis) {
  const state = getUserMusicState(userId);
  state.isInCrisis = isCrisis;
}

// ============================================================
// OFFER LEVEL DETERMINATION
// ============================================================

function determineOfferLevel(context) {
  const { localTime, userMessage, hasAcceptedThisSession, isExplicitRequest } = context;
  
  // Level 2 (DIRECT) conditions
  const hour = parseTimeHour(localTime);
  const isLateNight = hour >= 1 && hour <= 4;
  const hasDistressSignals = /panic|can't sleep|alone|lonely|miss|heartbroken|overwhelmed/i.test(userMessage);
  
  if (isExplicitRequest) return OFFER_LEVEL.DIRECT;
  if (isLateNight && hasDistressSignals) return OFFER_LEVEL.DIRECT;
  if (hasAcceptedThisSession) return OFFER_LEVEL.DIRECT;
  
  // Default to GENTLE
  return OFFER_LEVEL.GENTLE;
}

function getOfferPhrase(item, level) {
  if (level === OFFER_LEVEL.SEED) return item.seedPhrase;
  if (level === OFFER_LEVEL.GENTLE) return item.gentlePhrase;
  return item.directPhrase;
}

// ============================================================
// EMOTIONAL TRIGGER DETECTION
// ============================================================

function detectEmotionalTriggers(message) {
  if (!message) return { triggers: [], intensity: 0 };
  
  const lowerMsg = message.toLowerCase();
  const triggers = [];
  let intensity = 0;
  
  for (const track of NIGHT_SWIM_TRACKS) {
    for (const trigger of track.triggers) {
      if (lowerMsg.includes(trigger)) {
        triggers.push({ type: 'track', item: track, trigger });
        intensity += 2;
      }
    }
  }
  
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

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// MAIN CURATION FUNCTION
// ============================================================

function curateMusic(context) {
  const {
    userId,
    userMessage,
    localTime,
    conversationTurn = 0,
    isExplicitMusicRequest = false,
    externalSessionCount = 0
  } = context;
  
  const state = getUserMusicState(userId);
  
  if (conversationTurn < 5 && !isExplicitMusicRequest) {
    return { shouldOffer: false, reason: 'too_early_in_conversation' };
  }
  
  const intentScore = calculateIntentScore(userMessage, state);
  const INTENT_THRESHOLD = 3;
  
  if (intentScore < INTENT_THRESHOLD && !isExplicitMusicRequest) {
    return { shouldOffer: false, reason: 'intent_score_too_low', intentScore };
  }
  
  // Detect triggers
  const { triggers, intensity } = detectEmotionalTriggers(userMessage);
  
  if (triggers.length === 0 && !isExplicitMusicRequest) {
    return { shouldOffer: false, reason: 'no_triggers_detected' };
  }
  
  // Get time context
  const hour = parseTimeHour(localTime);
  const isLateNight = hour >= 1 && hour <= 4;
  const isNight = hour >= 22 || hour <= 5;
  
  // Find best match
  let bestMatch = null;
  
  // Priority 1: Specific track match
  if (triggers.some(t => t.type === 'track')) {
    const trackMatch = triggers.find(t => t.type === 'track');
    
    // Check cooldowns
    const cooldownCheck = canOfferMusic(userId, 'track', conversationTurn, externalSessionCount);
    const itemCheck = canOfferSpecificItem(userId, trackMatch.item.id);
    
    if (cooldownCheck.allowed && itemCheck.allowed) {
      bestMatch = {
        type: 'track',
        item: trackMatch.item,
        reason: `Emotional match: "${trackMatch.trigger}"`
      };
    }
  }
  
  // Priority 2: Playlist match (if no track match)
  if (!bestMatch && triggers.some(t => t.type === 'playlist')) {
    const playlistMatch = triggers.find(t => t.type === 'playlist');
    
    const cooldownCheck = canOfferMusic(userId, 'playlist', conversationTurn, externalSessionCount);
    const itemCheck = canOfferSpecificItem(userId, playlistMatch.item.id);
    
    if (cooldownCheck.allowed && itemCheck.allowed) {
      bestMatch = {
        type: 'playlist',
        item: playlistMatch.item,
        reason: `Mood match: "${playlistMatch.trigger}"`
      };
    }
  }
  
  // Priority 3: Album (late night + high intensity)
  if (!bestMatch && isNight && intensity >= 3 && conversationTurn >= 5) {
    const cooldownCheck = canOfferMusic(userId, 'album', conversationTurn, externalSessionCount);
    
    if (cooldownCheck.allowed) {
      bestMatch = {
        type: 'album',
        item: { 
          id: 'night_swim', 
          name: 'Night Swim',
          playbackMode: 'audio_player',
          seedPhrase: "I made an album for moments like this, if you want.",
          gentlePhrase: "Want me to put something on? I have a whole album for this.",
          directPhrase: "I made an album called Night Swim for nights like this."
        },
        reason: 'Evening emotional support'
      };
    }
  }
  
  if (!bestMatch) {
    return { shouldOffer: false, reason: 'no_suitable_match_after_cooldowns' };
  }
  
  // Determine offer level
  const offerLevel = determineOfferLevel({
    localTime,
    userMessage,
    hasAcceptedThisSession: state.hasAcceptedThisSession,
    isExplicitRequest: isExplicitMusicRequest
  });
  
  // Build offer phrase
  const offerPhrase = getOfferPhrase(bestMatch.item, offerLevel);
  const suffix = offerLevel !== OFFER_LEVEL.DIRECT ? ` ${pickRandom(OFFER_SUFFIXES)}` : '';
  
  return {
    shouldOffer: true,
    type: bestMatch.type,
    item: bestMatch.item,
    reason: bestMatch.reason,
    offerLevel,
    offerLevelName: Object.keys(OFFER_LEVEL).find(k => OFFER_LEVEL[k] === offerLevel),
    offerPhrase: offerPhrase + suffix,
    playbackMode: bestMatch.item.playbackMode,
    revealName: offerLevel === OFFER_LEVEL.DIRECT
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getTrackByName(name) {
  const lowerName = name.toLowerCase().trim();
  for (const track of NIGHT_SWIM_TRACKS) {
    if (track.name.toLowerCase() === lowerName) return track;
    const words = track.name.toLowerCase().split(' ');
    if (words.some(w => lowerName.includes(w) && w.length > 3)) return track;
  }
  return null;
}

function getPlaylistByName(name) {
  const lowerName = name.toLowerCase().trim();
  for (const playlist of PLAYLISTS) {
    if (playlist.name.toLowerCase() === lowerName) return playlist;
    if (playlist.id.includes(lowerName.replace(' ', '_'))) return playlist;
  }
  return null;
}

function getDeclineAcknowledgment() {
  return pickRandom(AFTER_DECLINE_ACKNOWLEDGMENTS);
}

function resetUserSession(userId) {
  const state = getUserMusicState(userId);
  state.sessionStartedAt = Date.now();
  state.sessionOfferCount = 0;
  state.sessionDeclineCount = 0;
  state.hasAcceptedThisSession = false;
  state.recentOfferTurns = [];
  state.isInCrisis = false;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  NIGHT_SWIM_TRACKS,
  PLAYLISTS,
  COOLDOWNS,
  OFFER_LEVEL,
  curateMusic,
  canOfferMusic,
  canOfferSpecificItem,
  recordMusicOffer,
  recordMusicAccepted,
  recordMusicDeclined,
  setCrisisMode,
  getTrackByName,
  getPlaylistByName,
  getDeclineAcknowledgment,
  getUserMusicState,
  resetUserSession,
  detectEmotionalTriggers,
  calculateIntentScore,
  determineOfferLevel
};
