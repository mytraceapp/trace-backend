const SUGGESTION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const IGNORED_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes if user ignored last suggestion
const HOOK_SESSION_COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes within session
const HOOK_GLOBAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours global

const CURIOSITY_HOOKS = [
  "There's a pattern forming here — if you want, we can keep watching it together.",
  "Something in this feels like it's pointing to a deeper thread — we can stay with it.",
  "This has a quiet repeat to it — I can help you name what it's asking for.",
  "This feels like it's unfolding in layers — we don't have to rush it.",
  "There's more underneath this than it looks like — and you're close to it."
];

const ABBREVIATIONS = ["Dr", "Mr", "Ms", "Prof", "St", "Jr", "Sr", "e.g", "i.e", "U.S", "Inc", "Ltd"];

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getSignals(userText) {
  const t = (userText || '').toLowerCase();
  
  const highArousalPhrases = [
    'panic', 'panicking', 'anxious', 'anxiety', 'overwhelmed', 'spiraling',
    'freaking out', "can't breathe", 'cant breathe', 'heart racing', 'heart pounding'
  ];
  const highArousalCount = highArousalPhrases.filter(p => t.includes(p)).length;
  
  const meaningSeeking = (
    t.includes('what does this mean') ||
    t.includes('why is this happening') ||
    t.includes('what am i supposed to learn') ||
    t.includes('what is the point') ||
    t.includes('what is god doing') ||
    t.includes('why me')
  );
  
  const patternLanguage = (
    t.includes('this keeps happening') ||
    t.includes('every time') ||
    t.includes('same thing again') ||
    t.includes('why do i always') ||
    t.includes('pattern') ||
    t.includes('always end up')
  );
  
  const reflectiveTone = (
    t.includes("i'm realizing") ||
    t.includes('i realized') ||
    t.includes('i noticed') ||
    t.includes('it feels like') ||
    t.includes('i wonder if') ||
    t.includes('lately') ||
    t.includes('on my mind') ||
    t.includes('been thinking')
  );
  
  return {
    asksForHelp: /what should i do|help me|any ideas|what do you think|suggest|recommend/i.test(t),
    highArousal: highArousalCount >= 2 || /can't breathe|freaking out|spiraling/i.test(t),
    lowMood: /sad|depressed|hopeless|worthless|empty|numb|down|lonely|suicidal/i.test(t),
    restNeed: /tired|exhausted|insomnia|can't sleep|burnt out|drained|fatigue/i.test(t),
    rumination: /overthinking|can't stop thinking|stuck in my head|spiraling|ruminating/i.test(t),
    musicRequest: /play|music|song|track|night swim|listen/i.test(t),
    isCrisis: /suicidal|kill myself|end it|want to die|hurt myself/i.test(t),
    meaningSeeking,
    patternLanguage,
    reflectiveTone,
  };
}

function applyTimeOfDayRules(clientState, signals) {
  const { timeOfDay, localNow, recentSentiment, mode, nowPlaying } = clientState || {};
  
  let tone = 'day';
  
  if (timeOfDay) {
    const map = {
      'morning': 'morning',
      'afternoon': 'day',
      'evening': 'evening',
      'late_night': 'late_night',
      'night': 'late_night'
    };
    tone = map[timeOfDay] || 'day';
  } else if (localNow) {
    const hour = new Date(localNow).getHours();
    if (hour >= 22 || hour < 6) tone = 'late_night';
    else if (hour >= 6 && hour < 12) tone = 'morning';
    else if (hour >= 12 && hour < 18) tone = 'day';
    else tone = 'evening';
  } else {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) tone = 'late_night';
    else if (hour >= 6 && hour < 12) tone = 'morning';
    else if (hour >= 12 && hour < 18) tone = 'day';
    else tone = 'evening';
  }
  
  const maxSentences = {
    'morning': 5,
    'day': 5,
    'evening': 4,
    'late_night': 3
  }[tone] || 5;
  
  const emotionalContext = ['sad', 'lonely', 'reflective', 'calm'].includes(recentSentiment) || signals.reflectiveTone;
  const isPlayingMusic = mode === 'audio_player' || nowPlaying != null;
  
  const musicBias = (
    (tone === 'late_night' || tone === 'evening') &&
    emotionalContext &&
    !signals.highArousal &&
    !isPlayingMusic
  );
  
  const allowCuriosityHook = !(tone === 'late_night' && signals.highArousal);
  
  const toneHints = {
    'late_night': 'softer, fewer words, slower',
    'evening': 'calm, reflective',
    'morning': 'clear, steady',
    'day': 'clear, steady'
  };
  
  return {
    tone,
    maxSentences,
    musicBias,
    allowCuriosityHook,
    toneHint: toneHints[tone] || 'clear, steady'
  };
}

function buildClientStateContext(clientState, rules = null) {
  const { mode, timeOfDay, recentSentiment, nowPlaying } = clientState || {};
  const toneHint = rules?.toneHint || 'clear, steady';
  
  let basePrompt = `You are TRACE, a calm and grounded companion.

TONE: ${toneHint}

Your voice is:
- Concise: 2-5 sentences max unless user asks for more
- One perspective only ("Here's what I think..." not "Here are some options...")
- No bullet lists unless user explicitly asks
- One question max per response
- No product talk (never say "feature", "mode", "app", "onboarding")
- Warm but not performative. Grounded, not spiritual-sounding.
- Use contractions. Sound like a friend, not a therapist.`;

  if (mode === 'audio_player' && nowPlaying) {
    basePrompt += `\n\nIMPORTANT: User is listening to "${nowPlaying.title}". Answer their question naturally but don't suggest activities or pivot away from the music moment. You can acknowledge the track softly.`;
  }
  
  if (mode === 'activity_reflection') {
    basePrompt += `\n\nUser just finished an activity. Acknowledge it gently. Don't immediately suggest another one.`;
  }

  if (timeOfDay === 'night' || timeOfDay === 'late_night') {
    basePrompt += `\n\nIt's late. Keep responses gentle and brief. Don't ask probing questions.`;
  }

  if (recentSentiment === 'anxious') {
    basePrompt += `\n\nUser seems anxious. Be steady and grounding. Short sentences. Don't add pressure.`;
  } else if (recentSentiment === 'sad') {
    basePrompt += `\n\nUser seems low. Be present. Don't try to fix. Just be with them.`;
  } else if (recentSentiment === 'overwhelmed') {
    basePrompt += `\n\nUser seems overwhelmed. Keep things simple. One thing at a time.`;
  }

  return basePrompt;
}

function decideSuggestion(clientState, signals, rules = null) {
  const { mode, lastSuggestion, lastActivity, nowPlaying } = clientState || {};
  const now = Date.now();
  
  if (mode === 'audio_player' && !signals.asksForHelp) {
    return { suggestion: null, suppressed: null };
  }
  
  if (lastSuggestion) {
    const timeSinceLast = now - (lastSuggestion.ts || 0);
    const cooldown = lastSuggestion.accepted === false ? IGNORED_COOLDOWN_MS : SUGGESTION_COOLDOWN_MS;
    
    if (timeSinceLast < cooldown && !signals.asksForHelp) {
      const remainingSeconds = Math.round((cooldown - timeSinceLast) / 1000);
      return {
        suggestion: null,
        suppressed: {
          feature: 'suggestion',
          remaining_seconds: remainingSeconds,
          cooldown_type: lastSuggestion.accepted === false ? 'ignored' : 'standard',
        }
      };
    }
  }
  
  let suggestion = null;
  const musicBias = rules?.musicBias || false;
  
  if (signals.asksForHelp) {
    if (signals.highArousal) {
      suggestion = { type: 'activity', id: 'breathing', reason: 'grounding' };
    } else if (signals.rumination) {
      suggestion = { type: 'activity', id: 'grounding', reason: 'getting out of your head' };
    } else if (signals.restNeed) {
      suggestion = { type: 'activity', id: 'power_nap', reason: 'rest' };
    } else if (signals.lowMood) {
      if (musicBias) {
        suggestion = { type: 'track', id: 'neon_promise', reason: 'something gentle' };
      } else {
        suggestion = { type: 'activity', id: 'grounding', reason: 'grounding' };
      }
    } else if (musicBias && signals.reflectiveTone) {
      suggestion = { type: 'track', id: 'midnight_underwater', reason: 'to sit with this' };
    }
  }
  
  if (suggestion) {
    suggestion.suggestion_id = `${now}-${suggestion.id}`;
  }
  
  return { suggestion, suppressed: null };
}

function tightenResponse(text, options = {}) {
  if (!text) return text;
  
  const maxSentences = options.maxSentences || 6;
  let result = text;
  
  const listPatterns = [
    /^here are \d+[^.]*[.:]/gim,
    /^here's \d+[^.]*[.:]/gim,
    /^there are \d+ (things|ways|options)[^.]*[.:]/gim,
  ];
  for (const pattern of listPatterns) {
    result = result.replace(pattern, '');
  }
  
  const lines = result.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (/^[\-\*]\s/.test(trimmed)) return false;
    if (/^\d+[\.\)]\s/.test(trimmed)) return false;
    return true;
  });
  result = cleanedLines.join('\n').trim();
  
  const questionMarks = (result.match(/\?/g) || []).length;
  if (questionMarks > 1) {
    const firstQIndex = result.indexOf('?');
    if (firstQIndex !== -1) {
      result = result.substring(0, firstQIndex + 1).trim();
    }
  }
  
  let protectedText = result;
  const abbrevMap = {};
  ABBREVIATIONS.forEach((abbr, i) => {
    const regex = new RegExp(`\\b${abbr}\\.`, 'g');
    const placeholder = `__ABBR${i}__`;
    protectedText = protectedText.replace(regex, placeholder);
    abbrevMap[placeholder] = `${abbr}.`;
  });
  
  const sentences = protectedText.match(/[^.!?]+[.!?]+/g) || [protectedText];
  
  const restoredSentences = sentences.map(s => {
    let restored = s;
    Object.keys(abbrevMap).forEach(placeholder => {
      restored = restored.replace(new RegExp(placeholder, 'g'), abbrevMap[placeholder]);
    });
    return restored;
  });
  
  if (restoredSentences.length > maxSentences) {
    result = restoredSentences.slice(0, maxSentences).join(' ').trim();
  } else {
    result = restoredSentences.join(' ').trim();
  }
  
  return result;
}

function maybeAddCuriosityHook({ userId, clientState, signals, rules }) {
  const { mode, nowPlaying, sessionTurnCount, lastHookAt, lastHookGlobalAt } = clientState || {};
  const now = Date.now();
  
  if (mode === 'audio_player' || nowPlaying != null) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  if (!rules?.allowCuriosityHook) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  if (signals.isCrisis || signals.highArousal) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  const turns = sessionTurnCount || 0;
  if (turns < 3) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  const hasRelevance = signals.meaningSeeking || signals.patternLanguage || signals.reflectiveTone;
  if (!hasRelevance) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  if (lastHookAt && (now - lastHookAt) < HOOK_SESSION_COOLDOWN_MS) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  if (lastHookGlobalAt && (now - lastHookGlobalAt) < HOOK_GLOBAL_COOLDOWN_MS) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  const today = new Date().toISOString().split('T')[0];
  const seed = `${userId || 'anon'}::${today}`;
  const index = simpleHash(seed) % CURIOSITY_HOOKS.length;
  const hook = CURIOSITY_HOOKS[index];
  
  console.log('[CURIOSITY HOOK] Triggered for user:', userId, 'hook index:', index);
  
  return {
    curiosity_hook: hook,
    client_state_patch: {
      lastHookAt: now,
      lastHookGlobalAt: now
    }
  };
}

module.exports = {
  getSignals,
  buildClientStateContext,
  decideSuggestion,
  tightenResponse,
  applyTimeOfDayRules,
  maybeAddCuriosityHook,
};
