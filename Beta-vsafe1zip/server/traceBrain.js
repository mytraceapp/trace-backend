const SUGGESTION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const IGNORED_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes if user ignored last suggestion

function getSignals(userText) {
  const t = (userText || '').toLowerCase();
  return {
    asksForHelp: /what should i do|help me|any ideas|what do you think|suggest|recommend/i.test(t),
    highArousal: /panic|anxiety|anxious|can't breathe|racing|heart pounding|freaking out/i.test(t),
    lowMood: /sad|depressed|hopeless|worthless|empty|numb|down|lonely|suicidal/i.test(t),
    restNeed: /tired|exhausted|insomnia|can't sleep|burnt out|drained|fatigue/i.test(t),
    rumination: /overthinking|can't stop thinking|stuck in my head|spiraling|ruminating/i.test(t),
    musicRequest: /play|music|song|track|night swim|listen/i.test(t),
  };
}

function buildClientStateContext(clientState) {
  const { mode, timeOfDay, recentSentiment, nowPlaying } = clientState || {};
  
  let basePrompt = `You are TRACE, a calm and grounded companion. Your voice is:
- Concise: 2-6 sentences max unless user asks for more
- One perspective only ("Here's what I think..." not "On one hand... on the other...")
- No bullet lists unless user explicitly asks
- One question max per response
- No product talk (never say "feature", "mode", "app", "onboarding")
- Warm but not performative. Grounded, not spiritual-sounding.
- Use contractions. Sound like a friend, not a therapist.`;

  if (mode === 'audio_player' && nowPlaying) {
    basePrompt += `\n\nIMPORTANT: User is listening to "${nowPlaying.title}". Talk about the music experience. Do NOT suggest activities or other features. Stay in the music moment.`;
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

function decideSuggestion(clientState, signals) {
  const { mode, lastSuggestion, lastActivity, nowPlaying } = clientState || {};
  const now = Date.now();
  
  if (mode === 'audio_player' && !signals.asksForHelp) {
    return null;
  }
  
  if (lastSuggestion) {
    const timeSinceLast = now - (lastSuggestion.ts || 0);
    const cooldown = lastSuggestion.accepted === false ? IGNORED_COOLDOWN_MS : SUGGESTION_COOLDOWN_MS;
    
    if (timeSinceLast < cooldown && !signals.asksForHelp) {
      return null;
    }
  }
  
  if (signals.asksForHelp) {
    if (signals.highArousal) {
      return { type: 'activity', id: 'breathing', reason: 'grounding' };
    }
    if (signals.rumination) {
      return { type: 'activity', id: 'grounding', reason: 'getting out of your head' };
    }
    if (signals.restNeed) {
      return { type: 'activity', id: 'power_nap', reason: 'rest' };
    }
    if (signals.lowMood) {
      return { type: 'track', id: 'neon_promise', reason: 'something gentle' };
    }
  }
  
  return null;
}

function tightenResponse(text) {
  if (!text) return text;
  
  const lines = text.split('\n').filter(l => l.trim());
  
  const hasBullets = lines.some(l => /^[\-\*\d]+[\.\)]\s/.test(l.trim()));
  if (hasBullets && lines.length > 4) {
    const nonBulletLines = lines.filter(l => !/^[\-\*\d]+[\.\)]\s/.test(l.trim()));
    if (nonBulletLines.length > 0) {
      return nonBulletLines.slice(0, 3).join('\n');
    }
  }
  
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (sentences.length > 6) {
    return sentences.slice(0, 6).join(' ').trim();
  }
  
  return text;
}

module.exports = {
  getSignals,
  buildClientStateContext,
  decideSuggestion,
  tightenResponse,
};
