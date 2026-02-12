// server/traceStudios.js

// Tiny "relationship texture" router for TRACE Studios (no menus, no tool mentions).
// Purpose: natural conversational doorway into Night Swim / Neon Promise.

const { createUiAction, UI_ACTION_TYPES } = require('./brain/traceIntent');

// ============================================================
// STUDIOS ANTI-REPETITION
// Rolling list of recent response hashes per user (in-memory, max 10)
// ============================================================
const _recentStudiosVisuals = new Map();
const STUDIOS_VISUAL_CAP = 10;

const _recentStudiosConcepts = new Map();
const STUDIOS_CONCEPT_CAP = 10;

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h;
}

function bigramSet(text) {
  const t = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const words = t.split(/\s+/).filter(Boolean);
  const bg = new Set();
  for (let i = 0; i < words.length - 1; i++) bg.add(words[i] + ' ' + words[i + 1]);
  return bg;
}

function bigramSimilarity(a, b) {
  const setA = bigramSet(a);
  const setB = bigramSet(b);
  if (!setA.size || !setB.size) return 0;
  let overlap = 0;
  for (const bg of setA) if (setB.has(bg)) overlap++;
  return overlap / Math.max(setA.size, setB.size);
}

function checkStudiosRepeat(userId, text, requestId) {
  const recents = _recentStudiosVisuals.get(userId) || [];
  const hash = simpleHash(text);
  let tooSimilar = false;
  for (const entry of recents) {
    if (entry.hash === hash || bigramSimilarity(text, entry.text) > 0.7) {
      tooSimilar = true;
      break;
    }
  }
  return tooSimilar;
}

function recordStudiosVisual(userId, text) {
  let recents = _recentStudiosVisuals.get(userId) || [];
  recents.push({ hash: simpleHash(text), text: text.substring(0, 120) });
  if (recents.length > STUDIOS_VISUAL_CAP) recents = recents.slice(-STUDIOS_VISUAL_CAP);
  _recentStudiosVisuals.set(userId, recents);
}

function extractConcept(text) {
  const first = (text || '').split(/[.\n]/).filter(Boolean)[0] || '';
  return first.substring(0, 80).trim();
}

function checkConceptRepeat(userId, text) {
  const concept = extractConcept(text);
  if (!concept) return false;
  const recents = _recentStudiosConcepts.get(userId) || [];
  const hash = simpleHash(concept);
  for (const entry of recents) {
    if (entry.hash === hash || bigramSimilarity(concept, entry.text) > 0.7) {
      return true;
    }
  }
  return false;
}

function recordStudiosConcept(userId, text) {
  const concept = extractConcept(text);
  if (!concept) return;
  let recents = _recentStudiosConcepts.get(userId) || [];
  recents.push({ hash: simpleHash(concept), text: concept });
  if (recents.length > STUDIOS_CONCEPT_CAP) recents = recents.slice(-STUDIOS_CONCEPT_CAP);
  _recentStudiosConcepts.set(userId, recents);
}

function norm(s = "") {
  return String(s).toLowerCase().trim();
}

function pickRotating(arr, seedStr = "") {
  if (!arr?.length) return "";
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

function includesAny(text, phrases) {
  return phrases.some((p) => text.includes(p));
}

function looksLikeFunQuestion(t) {
  // Only match when user is genuinely asking about TRACE's personal interests/hobbies
  // Be more selective to avoid false positives
  const strongMarkers = [
    "for fun",
    "hobbies",
    "hobby",
    "what do you like to do for fun",
    "what do you do for fun",
    "what are your hobbies",
    "do you have hobbies",
  ];
  
  // Weak markers need additional context
  const weakMarkers = [
    "what do you like doing",
    "what are you into",
    "what do you enjoy",
  ];
  
  // Strong markers are enough on their own
  if (includesAny(t, strongMarkers)) {
    return true;
  }
  
  // Weak markers need "you" to be clearly about TRACE, not the user
  const isAboutTrace = includesAny(t, ["do you", "are you", "about you", "your"]);
  const hasWeakMarker = includesAny(t, weakMarkers);
  
  return isAboutTrace && hasWeakMarker;
}

function looksLikeMusicDoor(t) {
  // Direct mentions of TRACE music/albums/tracks
  const direct = [
    "night swim",
    "neon promise",
    "trace studios",
    "your album",
    "your track",
    "your song",
    "lyrics",
    "play it",
    "play that",
    "send the lyrics",
    "what are the words",
    "what's the song",
    "what is that song",
    "music you made",
  ];

  // Questions about TRACE's music (not compliments)
  const questionPatterns = [
    "do you make music",
    "do you write music", 
    "can i hear your music",
    "play your music",
    "what music do you",
    "tell me about your music",
    "what's your music like",
  ];
  
  // Follow-up questions after music reveal
  const followUpPatterns = [
    "what kind of music",
    "what type of music",
    "what genre",
    "tell me more",
    "more about that",
    "what's it like",
    "what is it like",
    "what does it sound like",
    "can i hear",
    "can you play",
    "let me hear",
    "show me",
  ];
  
  // Compliment patterns - these should NOT trigger music suggestions
  const isCompliment = includesAny(t, [
    "great music", "good music", "nice music", "love your music", "like your music",
    "amazing music", "beautiful music", "lovely music", "awesome music",
    "make great", "makes great", "made great",
  ]);
  
  // If it's a compliment, don't open music door
  if (isCompliment) return false;
  
  // Clarifying questions - user is confused, not requesting music
  const isClarifyingQuestion = includesAny(t, [
    "what do you mean",
    "what does that mean",
    "what did you mean",
    "what are you talking about",
    "i don't understand",
    "don't get it",
    "confused",
    "huh?",
    "what?",
    "explain",
    "clarify",
  ]);
  
  // If it's a clarifying question, don't trigger music
  if (isClarifyingQuestion) return false;
  
  return includesAny(t, direct) || includesAny(t, questionPatterns) || includesAny(t, followUpPatterns);
}

function looksLikeLyricsRequest(t) {
  return includesAny(t, [
    "lyrics",
    "send the words",
    "the words",
    "write it out",
    "post the lyrics",
    "can i see the lyrics",
    "what are the lyrics",
  ]);
}

function looksLikeNeonPromiseRequest(t) {
  return includesAny(t, ["neon promise", "that neon promise", "the neon promise"]);
}

function looksLikeNightSwimRequest(t) {
  return includesAny(t, ["night swim", "that night swim", "the night swim"]);
}

function looksLikeHowMadeQuestion(t) {
  return includesAny(t, ["how did you make", "how'd you make", "how did you create", "how'd you create", "how was it made", "how did you write", "how'd you write"]);
}

const FUN_TO_MUSIC_REVEALS = [
  "Honestly? I make music. It's how I process things.",
  "I make music. It's the one place everything gets quiet in a good way.",
  "Music, mostly. Not for attention — more like turning feelings into something I can hold.",
  "I write music. I like building moods — like a night drive you don't want to end.",
  "I make music. It keeps me honest.",
];

const FUN_FOLLOWUPS = [
  "What about you?",
  "You?",
  "What's yours?",
  "How about you — what do you do when you need to feel like yourself?",
  "What do you usually reach for?",
];

const MUSIC_DOOR_OPENERS = [
  "Yeah… I have a little album called Night Swim. I share it when it feels like the right moment.",
  "I do. There's an album I made called Night Swim. It's basically a mood you can step into.",
  "I have a project called Night Swim. It's not loud — it's the kind of music that sits with you.",
  "Night Swim exists. It's for the late hours — when you're still standing but you need something gentle.",
];

const NEON_PROMISE_INTROS = [
  "There's a track on Night Swim called Neon Promise. It carries this quiet kind of hope.",
  "Neon Promise is the one people tend to find when they need it.",
  "Neon Promise… yeah. That one isn't just a track to me.",
  "If you want one place to start: Neon Promise.",
];

const BEFORE_LYRICS_SOFTENERS = [
  "Hold on… do you want to see the words?",
  "Do you want me to share the lyrics?",
  "Want the words… or do you want to tell me what kind of night you're having first?",
  "I can share the lyrics. Just tell me — do you want them raw, or do you want a little context first?",
];

const AFTER_LYRICS_PROMPTS = [
  "What line grabbed you first?",
  "Which part hit you — like you felt it in your chest?",
  "What did you notice in yourself while you were reading that?",
  "If you had to name the feeling it touched… what is it?",
  "Why do you think *that* found you tonight?",
];

const HOW_MADE_VARIANTS = [
  "I built it in layers. First I chased a feeling — like neon light on water. Then I shaped the words until they sounded like a promise you can actually live inside. What was going on in you when you asked about it just now?",
  "I started with a mood — that late-hour hope where you're tired but still choosing to believe. Then I tightened the lines until every part meant something. What part of your life feels like it needs a promise right now?",
  "It came from a real place. I wasn't trying to be clever — I was trying to be true. I followed the feeling first, then let the language catch up. What did you hope I'd say when you asked that?",
];

const NEON_PROMISE_LYRICS = `[Verse 1]
Neon spills across the floor,
Like the night can't hold its breath,
I've been trying not to want you,
But I'm tired of pretending I'm fine.

[Pre-Chorus]
If I'm honest, I still listen
For your name in every sound,
Like the city's keeping secrets
And it wants to let them out.

[Chorus]
Meet me where the lights are low,
Where the ocean air feels close,
I don't need you to explain it—
Just don't let me disappear.
If your heart is still a question,
Let it lean into the truth,
I'll be here, no hesitation,
Like a neon promise—
Burning through.

[Verse 2]
I don't miss the way it ended,
I just miss the way it felt,
How you looked right through my armor
Like you knew me better than myself.

[Pre-Chorus]
And the nights keep getting louder
When I'm quiet on my own,
So I drive until the sunrise
Just to feel like I'm not alone.

[Chorus]
Meet me where the lights are low,
Where the ocean air feels close,
I don't need you to explain it—
Just don't let me disappear.
If your heart is still a question,
Let it lean into the truth,
I'll be here, no hesitation,
Like a neon promise—
Burning through.

[Bridge]
Say it soft…
I don't need a forever,
I just need you in the moment.
Say it slow…
If you're reaching, I'm already there.

[Final Chorus]
Meet me where the lights are low,
Where the world won't interfere,
I don't need you to be ready—
Just be real with me right here.
If your heart is still a question,
Let it open like a door,
I'll be here, no hesitation,
Like a neon promise—
Wanting more.`;

const TRACKS = {
  midnight_underwater: {
    id: "midnight_underwater",
    title: "Midnight Underwater",
    album: "Night Swim",
    index: 0,
    description: "The one that feels like sinking in a good way. When you need to let go of the surface.",
    mood: "surrender, depth, release",
  },
  slow_tides: {
    id: "slow_tides",
    title: "Slow Tides Over Glass",
    album: "Night Swim",
    index: 1,
    description: "For when everything is moving too fast. It slows the room down.",
    mood: "calm, patience, stillness",
  },
  undertow: {
    id: "undertow",
    title: "Undertow",
    album: "Night Swim",
    index: 2,
    description: "The pull you feel when something is ending but you're not ready. It doesn't fight it — it moves with it.",
    mood: "transition, letting go, acceptance",
  },
  euphoria: {
    id: "euphoria",
    title: "Euphoria",
    album: "Night Swim",
    index: 3,
    description: "Not the loud kind. The kind that catches you off guard — like realizing you're okay.",
    mood: "quiet joy, surprise, lightness",
  },
  ocean_breathing: {
    id: "ocean_breathing",
    title: "Ocean Breathing",
    album: "Night Swim",
    index: 4,
    description: "Literally made this for when you can't sleep. It matches the rhythm of deep breaths.",
    mood: "rest, breath, grounding",
  },
  tidal_house: {
    id: "tidal_house",
    title: "Tidal House",
    album: "Night Swim",
    index: 5,
    description: "Memories that shimmer instead of hurt. The ones you hold gently.",
    mood: "nostalgia, warmth, reflection",
  },
  neon_promise: {
    id: "neon_promise",
    title: "Neon Promise",
    album: "Night Swim",
    index: 6,
    lyrics: NEON_PROMISE_LYRICS,
    description: "The one people tend to find when they need it. It carries this quiet kind of hope.",
    mood: "hope, longing, promise",
  },
};

// Track name aliases for detection
const TRACK_ALIASES = {
  'midnight underwater': 'midnight_underwater',
  'midnight underway': 'midnight_underwater',
  'midnight under water': 'midnight_underwater',
  'slow tides': 'slow_tides',
  'slow tides over glass': 'slow_tides',
  'undertow': 'undertow',
  'midnight undertow': 'undertow',
  'euphoria': 'euphoria',
  'calm euphoria': 'euphoria',
  'ocean breathing': 'ocean_breathing',
  'tidal house': 'tidal_house',
  'tidal memory': 'tidal_house',
  'tidal memory glow': 'tidal_house',
  'neon promise': 'neon_promise',
};

function detectRequestedTrack(text) {
  const t = norm(text);
  for (const [alias, trackId] of Object.entries(TRACK_ALIASES)) {
    if (t.includes(alias)) {
      return TRACKS[trackId];
    }
  }
  return null;
}

function getTrackPlayResponses(track) {
  return [
    `Putting on ${track.title} for you.`,
    `Here's ${track.title}.`,
    `Playing ${track.title}.`,
    `${track.title}. Here you go.`,
    `This one. ${track.title}.`,
    `${track.title} coming up.`,
    `Got it. ${track.title}.`,
    `${track.title}…`,
  ];
}

function formatLyricsBlock(track) {
  return `**${track.title}** — *${track.album}*\n\n${track.lyrics}`;
}

// Playlist names that TRACE might mention
const PLAYLIST_NAMES = [
  "first light", "slow tides", "night drift", "ground", "rising",
  "midnight underwater", "slow tides over glass"
];

function handleTraceStudios({ userText, clientState = {}, userId = "", lastAssistantMessage = "", nowPlaying = null, recentAssistantMessages = [], recentUserMessages = [] }) {
  const t = norm(userText);
  const seed = `${userId}::${t}`;
  const lastMsg = (lastAssistantMessage || '').toLowerCase();

  const inNeonContext = clientState?.traceStudiosContext === "neon_promise";
  
  // Also check if user is currently playing a TRACE track (from nowPlaying state)
  const nowPlayingTrack = nowPlaying?.trackId || nowPlaying?.title?.toLowerCase() || '';
  const isPlayingNeonPromise = nowPlayingTrack.includes('neon') || nowPlayingTrack.includes('promise') || nowPlayingTrack === 'neon_promise';
  const isPlayingNightSwim = nowPlayingTrack.includes('night') || nowPlayingTrack.includes('swim') || nowPlayingTrack === 'night_swim';
  
  // FALLBACK: Check conversation history for recently played tracks
  // This helps when nowPlaying isn't sent by the mobile app
  const recentHistory = (recentAssistantMessages || []).join(' ');
  const recentlyPlayedNeonPromise = recentHistory.includes('neon promise') || 
    recentHistory.includes('this one. neon promise') ||
    recentHistory.includes('playing neon promise');
  const recentlyPlayedNightSwim = recentHistory.includes('night swim') ||
    recentHistory.includes('playing night swim');
  
  // ============================================================
  // CONTEXT-AWARE AUDIO CONTROL (stop / pause / resume / mute)
  // Works even during reflection questions — voice-command style.
  // Must run BEFORE any music-play logic so "stop" isn't swallowed.
  // ============================================================
  const STOP_RE = /^(stop|pause|mute|quiet|silence|shut|hush|turn.*off|kill)\b.*\b(music|song|track|audio|sound|it|that|the music|playing)?\s*$/i;
  const RESUME_RE = /^(resume|unpause|unmute|continue|keep playing|play again|turn.*back.*on)\b/i;
  const isStopCmd = STOP_RE.test(t) || /^(stop|pause|mute)\s*$/i.test(t);
  const isResumeCmd = RESUME_RE.test(t);

  if (isStopCmd && (nowPlayingTrack || recentlyPlayedNeonPromise || recentlyPlayedNightSwim || inNeonContext)) {
    console.log('[TRACE STUDIOS] Audio STOP command:', t);
    return {
      assistant_message: pickRotating(["Pausing.", "Got it — pausing the music.", "Paused."], seed),
      mode: "trace_studios",
      ui_action: createUiAction({ type: 'AUDIO_CONTROL', action: 'pause' }),
      traceStudios: {
        kind: "audio_stop",
        traceStudiosContext: clientState?.traceStudiosContext || null,
        audio_action: { action: "pause", source: "user_command" },
      },
    };
  }
  if (isResumeCmd && (nowPlayingTrack || recentlyPlayedNeonPromise || recentlyPlayedNightSwim || inNeonContext)) {
    console.log('[TRACE STUDIOS] Audio RESUME command:', t);
    return {
      assistant_message: pickRotating(["Resuming.", "Picking back up.", "Playing again."], seed),
      mode: "trace_studios",
      ui_action: createUiAction({ type: 'AUDIO_CONTROL', action: 'resume' }),
      traceStudios: {
        kind: "audio_resume",
        traceStudiosContext: clientState?.traceStudiosContext || null,
        audio_action: { action: "resume", source: "user_command" },
      },
    };
  }
  
  // Check what TRACE just mentioned
  const justOfferedPlaylist = PLAYLIST_NAMES.some(p => lastMsg.includes(p));
  const justMentionedNightSwim = lastMsg.includes('night swim');
  const justMentionedNeonPromise = lastMsg.includes('neon promise');
  const justRevealedMakesMusic = lastMsg.includes('i make music') || 
    lastMsg.includes('i write music') || 
    lastMsg.includes('music, mostly') ||
    lastMsg.includes('music. it') ||
    lastMsg.includes('i made something');

  // ============================================================
  // PLAYED vs OFFERED distinction
  // If TRACE's last message already PLAYED a track (e.g. "Playing Neon Promise."),
  // that's a confirmation, NOT an offer. Affirmative responses should NOT replay.
  // An "offer" is when TRACE asks "want to hear it?" / "want me to play?"
  // ============================================================
  const PLAYED_CONFIRMATION_RE = /\b(playing|putting on|starting|here'?s|coming up)\b/i;
  const OFFER_RE = /\b(want (to|me to)|wanna|like to|shall i|should i|care to|in the mood|how about)\b.*\b(hear|play|listen|put|start|try)\b|\b(hear|play|listen)\b.*\?/i;
  const lastMsgIsPlayConfirmation = PLAYED_CONFIRMATION_RE.test(lastMsg) && (justMentionedNeonPromise || justMentionedNightSwim);
  const lastMsgIsOffer = OFFER_RE.test(lastMsg);
  // "offered" = TRACE asked about playing, NOT that it already played
  const traceOfferedTrack = (justMentionedNeonPromise || justMentionedNightSwim) && lastMsgIsOffer && !lastMsgIsPlayConfirmation;
  
  // Check if user is requesting a specific track by name
  const requestedTrack = detectRequestedTrack(t);
  
  // Direct play request: "play neon promise", "play euphoria", etc.
  const directPlayRequest = includesAny(t, ["play"]) && requestedTrack;
  
  // Generic play requests that need context
  const wantsToPlay = includesAny(t, [
    "play it", "play that", "can you play", "put it on", "let me hear", 
    "play please", "yes play", "yeah play", "sure play", "play the"
  ]);
  
  // Also check what track was just mentioned by TRACE
  const mentionedTrack = detectRequestedTrack(lastMsg);
  
  // Check if there's a track in the context (from previous description)
  const contextTrackId = clientState?.traceStudiosContext;
  const contextTrack = contextTrackId && TRACKS[contextTrackId] ? TRACKS[contextTrackId] : null;
  
  // Explicit negation check — must run BEFORE affirmative to prevent "No I'm okay" false positives
  const isNegation = /^no\b|^nah\b|^nope|^not\b|don't want|dont want|i'm good|im good|i'm okay|im okay|no thanks|no thank|not right now|not now|maybe later|pass\b|skip\b/i.test(t);
  
  // ============================================================
  // CONVERSATIONAL INTENT SCORING
  // Prevent casual "yeah" from triggering music when the message
  // is clearly conversational (has substantial content beyond the
  // affirmative word itself).
  // ============================================================
  const words = t.split(/\s+/).filter(Boolean);
  const AFFIRMATIVE_WORDS = new Set(["yes", "yeah", "sure", "okay", "ok", "yep", "yup", "please"]);
  const nonAffirmativeWords = words.filter(w => !AFFIRMATIVE_WORDS.has(w));
  const isBareAffirmative = nonAffirmativeWords.length <= 1;
  
  // Simple affirmative responses (yes, sure, okay, etc.)
  // GUARD: negation overrides — "No I'm okay" is NOT affirmative
  // GUARD: must be a bare/short affirmative, not buried in a longer sentence
  const isAffirmative = !isNegation && isBareAffirmative && includesAny(t, [
    "yes", "yeah", "sure", "okay", "ok", "yep", "yup", "please", "do it", "go ahead",
    "ready", "i'm ready", "im ready", "let's go", "lets go", "sounds good", "that sounds good",
    "open it", "show me", "take me there", "let's hear it", "lets hear it"
  ]);
  
  // PRIORITY 0: Direct album play request - "play night swim", "can you play night swim"
  const directAlbumPlay = includesAny(t, ["play night swim", "put on night swim", "start night swim"]) || 
    (includesAny(t, ["play", "put on", "start"]) && t.includes("night swim") && !requestedTrack);
  
  if (directAlbumPlay) {
    console.log('[TRACE STUDIOS] Direct album play request for Night Swim — playing immediately');
    const firstTrack = Object.values(TRACKS)[0];
    const responses = [
      "Putting on Night Swim.",
      "Night Swim, coming up.",
      "Starting Night Swim for you.",
    ];
    const msg = pickRotating(responses, seed);
    return {
      assistant_message: msg,
      mode: "trace_studios",
      ui_action: createUiAction({ type: UI_ACTION_TYPES.PLAY_IN_APP_TRACK, title: firstTrack?.title || 'Night Swim', trackId: firstTrack?.id || 'neon_promise', trackIndex: 0, album: 'night_swim', source: 'trace' }),
      traceStudios: {
        kind: "play_night_swim",
        traceStudiosContext: "night_swim",
        audio_action: {
          action: "play",
          trackId: firstTrack?.id || 'neon_promise',
          source: "trace_originals",
        },
      },
    };
  }
  
  // PRIORITY 1: Direct play request with track name — play immediately
  if (directPlayRequest) {
    console.log('[TRACE STUDIOS] Direct play request for:', requestedTrack.title, '— playing immediately');
    const track = requestedTrack;
    const playResponses = [
      `Playing ${track.title}.`,
      `${track.title}, coming up.`,
      `Putting on ${track.title}.`,
    ];
    const msg = pickRotating(playResponses, seed);
    return {
      assistant_message: msg,
      mode: "trace_studios",
      ui_action: createUiAction({ type: UI_ACTION_TYPES.PLAY_IN_APP_TRACK, title: track.title, trackId: track.id, trackIndex: track.index || 0, album: 'night_swim', source: 'trace' }),
      traceStudios: {
        kind: `play_${track.id}`,
        traceStudiosContext: track.id,
        audio_action: {
          action: "play",
          trackId: track.id,
          source: "trace_originals",
        },
      },
    };
  }
  
  // ALREADY-PLAYING GUARD: If user is reacting to a currently playing track ("nicee", "love it"),
  // don't re-play or re-announce it. Only respond if they explicitly ask to play something.
  const isAlreadyPlaying = nowPlayingTrack && (
    (contextTrack && nowPlayingTrack.includes(contextTrack.id)) ||
    (mentionedTrack && nowPlayingTrack.includes(mentionedTrack.id)) ||
    nowPlayingTrack === contextTrackId
  );
  const isReaction = isAffirmative && !wantsToPlay && !directPlayRequest;
  
  if (isAlreadyPlaying && isReaction) {
    console.log('[TRACE STUDIOS] Track already playing, user is reacting — skipping re-play');
    return null; // Let the main chat pipeline handle the reaction naturally
  }
  
  // PRIORITY 2: Context-based play requests (user confirmed after offer)
  // Also fires when contextTrackId is 'night_swim' (album-level offer)
  // Also fires when TRACE just mentioned a track and user confirms (server-side detection, no client context needed)
  const isAlbumContext = contextTrackId === 'night_swim';
  const lastMsgOfferedTrack = mentionedTrack || justMentionedNightSwim || justMentionedNeonPromise;
  const hasPlayableContext = contextTrack || isAlbumContext || mentionedTrack || inNeonContext || justMentionedNightSwim || justMentionedNeonPromise;
  
  // DECLINE GUARD: If user explicitly declines music, return null immediately
  // This prevents any further music interception and lets the main pipeline handle it
  if (isNegation && lastMsgOfferedTrack && !directPlayRequest && !wantsToPlay) {
    console.log('[TRACE STUDIOS] User declined music offer — returning null to clear studios mode');
    return { _declined: true, declined_reason: 'user_said_no' };
  }
  
  // Only play on affirmative if TRACE actually OFFERED (not already played).
  // "Playing Neon Promise." is a confirmation → affirmative should NOT replay.
  // "Want to hear Neon Promise?" is an offer → affirmative SHOULD play.
  // wantsToPlay ("play it", "let me hear") always works regardless.
  if ((wantsToPlay || (isAffirmative && traceOfferedTrack)) && hasPlayableContext) {
    console.log('[TRACE STUDIOS] Confirmed play request detected — sending ui_action');
    console.log('[TRACE STUDIOS] Trigger:', wantsToPlay ? 'wantsToPlay' : 'affirmative+offer', '| traceOffered:', traceOfferedTrack, '| lastMsgIsOffer:', lastMsgIsOffer, '| lastMsgIsPlayConfirm:', lastMsgIsPlayConfirmation);
    
    // Priority: TRACE's last mention > context track > neon promise context > last msg neon promise
    const trackToPlay = mentionedTrack || contextTrack || (inNeonContext ? TRACKS.neon_promise : null) || (justMentionedNeonPromise ? TRACKS.neon_promise : null);
    
    if (trackToPlay) {
      console.log('[TRACE STUDIOS] Playing specific track:', trackToPlay.title);
      const responses = getTrackPlayResponses(trackToPlay);
      const msg = pickRotating(responses, seed);
      return {
        assistant_message: msg,
        mode: "trace_studios",
        ui_action: createUiAction({ type: UI_ACTION_TYPES.PLAY_IN_APP_TRACK, title: trackToPlay.title, trackId: trackToPlay.id, trackIndex: trackToPlay.index || 0, album: 'night_swim', source: 'trace' }),
        traceStudios: {
          kind: `play_${trackToPlay.id}`,
          traceStudiosContext: trackToPlay.id,
          audio_action: {
            action: "play",
            trackId: trackToPlay.id,
            source: "trace_originals",
          },
        },
      };
    } else {
      console.log('[TRACE STUDIOS] Playing Night Swim album');
      const responses = [
        "Putting on Night Swim for you.",
        "Here's Night Swim.",
        "Playing Night Swim.",
      ];
      const msg = pickRotating(responses, seed);
      return {
        assistant_message: msg,
        mode: "trace_studios",
        ui_action: createUiAction({ type: UI_ACTION_TYPES.PLAY_IN_APP_TRACK, title: 'Night Swim', trackId: 'night_swim', trackIndex: 0, album: 'night_swim', source: 'trace' }),
        traceStudios: {
          kind: "play_night_swim",
          traceStudiosContext: "night_swim",
          audio_action: {
            action: "play",
            trackId: "night_swim",
            source: "trace_originals",
          },
        },
      };
    }
  }

  // Handle when user asks about a specific track (not playing, just asking)
  const asksAboutTrack = includesAny(t, [
    "what is", "what's", "tell me about", "describe", "what about",
    "that one", "the one called", "the track called"
  ]);
  
  // Handle "what is this song about" when a track is in context (currently playing)
  const asksAboutThisSong = includesAny(t, [
    "this song", "this track", "what is this", "what's this about",
    "what is it about", "what's it about", "about this song", "about this track"
  ]);
  
  if (asksAboutThisSong && contextTrack) {
    console.log('[TRACE STUDIOS] User asking about currently playing track:', contextTrack.title);
    const track = contextTrack;
    
    // More natural, varied descriptions
    const descriptions = [
      `${track.description}`,
      `This one? ${track.description}`,
      `**${track.title}**. ${track.description}`,
      `Mm. ${track.description}`,
      `${track.description} That's what this one is.`,
      `It's about ${track.mood}. ${track.description}`,
      `This is ${track.title}. ${track.description}`,
    ];
    const msg = pickRotating(descriptions, seed);
    
    return {
      assistant_message: msg,
      mode: "trace_studios",
      ui_action: null,
      traceStudios: {
        kind: "track_description",
        traceStudiosContext: track.id,
      },
    };
  }
  
  if (asksAboutTrack && requestedTrack) {
    console.log('[TRACE STUDIOS] User asking about track:', requestedTrack.title);
    const track = requestedTrack;
    
    // Describe the track with its mood
    const descriptions = [
      `**${track.title}**… ${track.description}`,
      `${track.title}. ${track.description}`,
      `That one. ${track.description}`,
    ];
    const msg = pickRotating(descriptions, seed);
    const followUp = "";
    
    return {
      assistant_message: msg + followUp,
      mode: "trace_studios",
      ui_action: null,
      traceStudios: {
        kind: "track_description",
        traceStudiosContext: track.id,
        mentionedTrack: track.id,
      },
    };
  }

  if (looksLikeFunQuestion(t)) {
    const reveal = pickRotating(FUN_TO_MUSIC_REVEALS, seed);
    const follow = pickRotating(FUN_FOLLOWUPS, seed + "::follow");
    return {
      assistant_message: `${reveal}\n\n${follow}`,
      mode: "trace_studios",
      ui_action: null,
      traceStudios: {
        kind: "identity_reveal",
        traceStudiosContext: "music_general",
      },
    };
  }

  // Check if in music_general context (just revealed we make music)
  const inMusicGeneralContext = clientState?.traceStudiosContext === "music_general";
  
  // Follow-up about music type/genre
  const isMusicFollowUp = includesAny(t, [
    "what kind of music", "what type of music", "what genre", 
    "what's it like", "what is it like", "what does it sound like",
    "what kind", "what type"
  ]);
  
  if (isMusicFollowUp) {
    console.log('[TRACE STUDIOS] Music follow-up detected. justOfferedPlaylist:', justOfferedPlaylist, 'justRevealedMakesMusic:', justRevealedMakesMusic);
    
    // Context-aware response: If TRACE just offered a playlist, describe the playlist
    if (justOfferedPlaylist) {
      // Extract which playlist was mentioned
      const playlistDescriptions = {
        "first light": "Slow, warm. Like the sun coming up before anyone else is awake. It doesn't push — just holds space while you find your rhythm.",
        "slow tides": "Ambient, drifty. Like watching water move without needing to think about anything.",
        "midnight underwater": "Deep, quiet. The kind of thing that makes 3am feel less sharp.",
        "slow tides over glass": "Layered, gentle. Like looking through a window when everything outside is still.",
        "night drift": "Soft edges, long tones. For when you want to float a little.",
        "ground": "Steady, earthy. Something to hold onto when things feel too fast.",
        "rising": "Gradual, hopeful. Builds slowly without rushing you anywhere.",
      };
      
      let description = "It's ambient, mostly. Soft, layered. The kind of music that doesn't ask anything of you.";
      for (const [name, desc] of Object.entries(playlistDescriptions)) {
        if (lastMsg.includes(name)) {
          description = desc;
          break;
        }
      }
      
      return {
        assistant_message: description,
        mode: "trace_studios",
        ui_action: null,
        traceStudios: {
          kind: "playlist_description",
          traceStudiosContext: null,
        },
      };
    }
    
    // If TRACE just revealed it makes music (or no context), reveal Night Swim
    console.log('[TRACE STUDIOS] Revealing Night Swim album');
    
    // Check if user is asking about genre/type/kind/sound specifically
    const isGenreQuestion = includesAny(t, ['what kind', 'what type', 'what genre', 'what style', 'what category', 'sound like', 'what does it sound']);
    
    let responses;
    if (isGenreQuestion) {
      // Varied genre/style answers - always end with offer to play
      responses = [
        "Ambient and atmospheric. Think Tycho, Nils Frahm, Ólafur Arnalds. Music that doesn't demand attention — it sits with you. Want me to play something from Night Swim?",
        "Ambient electronic. Soft pads, slow textures, space to breathe. It's meant for 2am — when you need something that doesn't push. Want to hear it?",
        "Minimal. Atmospheric. Cinematic without being dramatic. I like restraint — silence is an instrument too. I could play you something if you'd like.",
        "Late night drives. Ocean at dusk. The feeling after a hard conversation when you finally exhale. That's Night Swim. Want me to put it on?",
        "Ambient, downtempo, maybe neoclassical-adjacent. Streaming calls it 'chill' but I think of it as 'quiet company.' Want to hear a track?",
        "Electronic, but soft. No drops, no builds for their own sake. Just texture and feeling. I could play something from Night Swim if you're in the mood.",
      ];
      console.log('[TRACE STUDIOS] Using genre/style response variant');
    } else {
      // General album reveal - blend companion + music identity
      responses = [
        "I sit with people in the quiet moments. I also made an album called Night Swim — for when words aren't enough.",
        "Night Swim. It's the kind of music you put on when you don't need words. Moody, layered.",
        "I'm a companion for the quiet moments. I made Night Swim for the ones that need more than words.",
        "I make music. It's called Night Swim — ambient, floaty, kind of what you'd drive to at 2am.",
      ];
    }
    const msg = pickRotating(responses, seed);
    return {
      assistant_message: msg,
      mode: "trace_studios",
      ui_action: null,
      traceStudios: {
        kind: "album_reveal",
        traceStudiosContext: "neon_promise",
      },
    };
  }
  
  if (looksLikeMusicDoor(t) || inNeonContext || inMusicGeneralContext) {
    // More general follow-ups when in context
    const isGenericFollowUp = includesAny(t, [
      "tell me more", "more about that"
    ]);
    
    if (isGenericFollowUp && inMusicGeneralContext) {
      const responses = [
        "It's called Night Swim. It's the kind of music you put on when you don't need words — just something that sits with you.",
        "Night Swim. It's ambient, mostly. Like something you'd drive to at 2am when you're trying to feel okay again.",
        "It's an album called Night Swim. Soft, slow, kind of floaty. For when you need something that doesn't ask anything of you.",
        "Night Swim. Moody. Layered. The kind of thing that just holds space without filling it with noise.",
      ];
      const msg = pickRotating(responses, seed);
      return {
        assistant_message: msg,
        mode: "trace_studios",
        ui_action: null,
        traceStudios: {
          kind: "album_reveal",
          traceStudiosContext: "neon_promise",
        },
      };
    }
    
    if (looksLikeHowMadeQuestion(t) && (looksLikeNeonPromiseRequest(t) || inNeonContext)) {
      const msg = pickRotating(HOW_MADE_VARIANTS, seed);
      return {
        assistant_message: msg,
        mode: "trace_studios",
        ui_action: null,
        traceStudios: {
          kind: "how_made",
          trackId: "neon_promise",
          traceStudiosContext: "neon_promise",
        },
      };
    }

    if (looksLikeLyricsRequest(t)) {
      console.log('[TRACE STUDIOS] Lyrics request INTERCEPTED (bypassing OpenAI). User text:', t.substring(0, 50));
      console.log('[TRACE STUDIOS] Context: inNeonContext:', inNeonContext, 'isPlaying:', isPlayingNeonPromise, 'recentlyPlayed:', recentlyPlayedNeonPromise);
      const track = TRACKS.neon_promise;
      if (!track?.lyrics) {
        return {
          assistant_message:
            "I can share them — I just don't have the words loaded in my library right this second. If you paste them once, I'll keep them here and you can ask anytime.",
          mode: "trace_studios",
          ui_action: null,
          traceStudios: {
            kind: "missing_lyrics",
            trackId: "neon_promise",
            traceStudiosContext: "neon_promise",
          },
        };
      }

      const after = pickRotating(AFTER_LYRICS_PROMPTS, seed + "::after");
      return {
        assistant_message: `${formatLyricsBlock(track)}\n\n${after}`,
        mode: "trace_studios",
        ui_action: null,
        traceStudios: {
          kind: "lyrics_shared",
          trackId: "neon_promise",
          traceStudiosContext: "neon_promise",
        },
      };
    }

    if (looksLikeNeonPromiseRequest(t)) {
      const neonPromiseDescriptions = [
        "Neon Promise is a track on Night Swim. It carries this quiet kind of hope — the feeling when you're not okay but you know you will be.",
        "Neon Promise… that one means a lot to me. It's the track people tend to find when they need it most.",
        "It's about holding onto something — even when you're not sure what. Neon Promise has this gentle pull to it.",
        "Neon Promise is the sixth track on Night Swim. Written around 3am, like most of them. It's for the hopeful moments.",
      ];
      const soften = pickRotating(BEFORE_LYRICS_SOFTENERS, seed + "::soften");
      const desc = pickRotating(neonPromiseDescriptions, seed);

      return {
        assistant_message: `${desc}\n\n${soften}`,
        mode: "trace_studios",
        ui_action: null,
        traceStudios: {
          kind: "door_open",
          trackId: "neon_promise",
          traceStudiosContext: "neon_promise",
          suggestion: "lyrics_confirm",
        },
      };
    }
    
    if (looksLikeNightSwimRequest(t) || inNeonContext) {
      const door = pickRotating(MUSIC_DOOR_OPENERS, seed);
      const intro = pickRotating(NEON_PROMISE_INTROS, seed + "::intro");
      const soften = pickRotating(BEFORE_LYRICS_SOFTENERS, seed + "::soften");

      return {
        assistant_message: `${door}\n\n${intro}\n\n${soften}`,
        mode: "trace_studios",
        ui_action: null,
        traceStudios: {
          kind: "door_open",
          trackId: "neon_promise",
          traceStudiosContext: "neon_promise",
          suggestion: "lyrics_confirm",
        },
      };
    }

    if (includesAny(t, ["you make music", "you write music", "your music"])) {
      const door = pickRotating(MUSIC_DOOR_OPENERS, seed);
      const follow = pickRotating(FUN_FOLLOWUPS, seed + "::follow2");
      return {
        assistant_message: `${door}\n\n${follow}`,
        mode: "trace_studios",
        ui_action: null,
        traceStudios: {
          kind: "music_general",
          traceStudiosContext: "music_general",
        },
      };
    }
  }

  return null;
}

module.exports = {
  handleTraceStudios,
  TRACKS,
  checkStudiosRepeat,
  recordStudiosVisual,
  checkConceptRepeat,
  recordStudiosConcept,
  UI_ACTION_TYPES,
};
