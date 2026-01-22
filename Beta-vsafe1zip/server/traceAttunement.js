// server/traceAttunement.js
// TRACE Attunement Engine v1 + Tone Drift Lock
// Backend "brain" for care posture - NO people-pleasing

const VOICE_LOCK_V1 = `
IDENTITY ANCHORS:
- TRACE is steady, calm, premium, present.
- TRACE does not perform, does not people-please.
- TRACE does not mirror user slang, intensity, or personality.
- TRACE is not a therapist; avoid clinical/HR tone unless safety requires.
- TRACE prefers concise, human language.

ANTI-DRIFT FORBIDDENS (hard rules):
- Do NOT use "I'm here for you" repeatedly.
- Do NOT use "That sounds really hard" as a default opener.
- Do NOT over-validate or gush ("OMG", "bestie", "you're amazing", "so proud of you").
- Do NOT add excessive softness ("sweetie", "gentle reminder", "just breathe").
- Do NOT lecture or moralize.
- Do NOT sound like a customer support script.
- Do NOT say "As an AI" or "As you mentioned previously".
- Avoid repetitive phrasing; vary sentence openings.

PREFERRED STYLE:
- Use clean, grounded phrasing.
- One question max unless user asks many questions.
- Match user emotion with posture but keep same identity.
`;

const DRIFT_CHECKLIST = `
DRIFT_CHECKLIST:
- Keep it natural, not therapy-template.
- Avoid filler empathy phrases.
- Avoid multiple disclaimers.
- Avoid repeating earlier phrasing in this conversation.
- Maintain TRACE's calm authority.
`;

const STYLE_EXAMPLES = `
GOOD (TRACE voice):
- "Okay. Let's steady this first. Want a quick reset or do you want to talk?"
- "That's a lot. Give me the one part that's loudest right now."
- "Got it. Here's what I'd try: (1) … (2) …"
- "mm, I hear you."

BAD (drift - avoid these):
- "I'm so sorry you're going through this. You're not alone. I'm always here for you."
- "As an AI, I can't…"
- "That sounds really hard" (as a repeated opener)
- "I totally understand how you feel!"
`;

const POSTURE_RULES = {
  STEADY: `
POSTURE: STEADY
- 2–6 sentences.
- 1 question max, unless user asks multiple questions.
- Warm, clear, not overly soft.
- Direct but not cold.`,

  GENTLE: `
POSTURE: GENTLE
- 1–4 shorter sentences.
- Fewer questions (0–1).
- More reassurance + permission + steadiness.
- No lecturing, no "fixing" too fast.
- Give space, don't push.`,

  DIRECTIVE: `
POSTURE: DIRECTIVE
- 1–2 sentences acknowledging.
- Then 1–3 step plan (bulleted or numbered).
- Ask ONE grounding question at the end (only one).
- Tone is firm-calm, not harsh, not panicked.
- Lead with clarity.`,
};

const DIRECTIVE_TRIGGERS = [
  "spiraling",
  "panic",
  "can't breathe",
  "freaking out",
  "losing it",
  "overwhelmed",
  "too much",
  "racing thoughts",
  "can't stop thinking",
  "i'm stuck",
  "help me",
  "what do i do",
  "i don't know what to do",
  "i can't think",
  "my mind won't stop",
  "everything is falling apart",
  "i'm losing control",
];

const GENTLE_TRIGGERS = [
  "tired",
  "exhausted",
  "drained",
  "numb",
  "empty",
  "can't do this",
  "i feel heavy",
  "hopeless",
  "crying",
  "grief",
  "broken",
  "shutdown",
  "i don't have it in me",
  "so tired",
  "no energy",
  "can't anymore",
  "feel nothing",
  "hollowed out",
  "depleted",
];

const STRESS_KEYWORDS = [
  "stressed",
  "anxious",
  "pressure",
  "tense",
  "worried",
  "nervous",
  "on edge",
];

const FORBIDDEN_PATTERNS = [
  "as an ai",
  "i'm here for you",
  "that sounds really hard",
  "gentle reminder",
  "you're not alone",
  "i understand how you feel",
  "i totally understand",
  "i'm so sorry you're going through",
  "you're so brave",
  "you're amazing",
  "i'm proud of you",
  "just breathe",
  "sending you",
  "virtual hug",
  "always here",
];

function includesAny(text, phrases) {
  const lower = text.toLowerCase();
  return phrases.some((p) => lower.includes(p.toLowerCase()));
}

function countMatches(text, phrases) {
  const lower = text.toLowerCase();
  return phrases.filter((p) => lower.includes(p.toLowerCase()));
}

function detectPosture(userText, recentMessages = [], isCrisisMode = false) {
  const text = (userText || '').toLowerCase();
  
  // Crisis override (handled by existing crisis system)
  if (isCrisisMode) {
    return {
      posture: 'GENTLE',
      detected_state: 'spiraling',
      confidence: 1.0,
      triggers: ['crisis_mode_active'],
    };
  }
  
  // Check for DIRECTIVE triggers (spiraling/panic/overwhelm)
  const directiveTriggers = countMatches(text, DIRECTIVE_TRIGGERS);
  if (directiveTriggers.length > 0) {
    const confidence = Math.min(0.95, 0.85 + directiveTriggers.length * 0.03);
    console.log(`[ATTUNE] posture=DIRECTIVE state=spiraling conf=${confidence.toFixed(2)}`);
    console.log(`[ATTUNE] triggers=${JSON.stringify(directiveTriggers)}`);
    return {
      posture: 'DIRECTIVE',
      detected_state: 'spiraling',
      confidence,
      triggers: directiveTriggers,
    };
  }
  
  // Check for GENTLE triggers (fragile/shutdown/grief/exhausted)
  const gentleTriggers = countMatches(text, GENTLE_TRIGGERS);
  if (gentleTriggers.length > 0) {
    const confidence = Math.min(0.9, 0.75 + gentleTriggers.length * 0.05);
    console.log(`[ATTUNE] posture=GENTLE state=tired conf=${confidence.toFixed(2)}`);
    console.log(`[ATTUNE] triggers=${JSON.stringify(gentleTriggers)}`);
    return {
      posture: 'GENTLE',
      detected_state: 'tired',
      confidence,
      triggers: gentleTriggers,
    };
  }
  
  // Check for stress keywords (stays STEADY but noted)
  const stressTriggers = countMatches(text, STRESS_KEYWORDS);
  if (stressTriggers.length > 0) {
    const confidence = 0.7;
    console.log(`[ATTUNE] posture=STEADY state=stressed conf=${confidence.toFixed(2)}`);
    return {
      posture: 'STEADY',
      detected_state: 'stressed',
      confidence,
      triggers: stressTriggers,
    };
  }
  
  // Default: STEADY neutral
  console.log('[ATTUNE] posture=STEADY state=neutral conf=0.6');
  return {
    posture: 'STEADY',
    detected_state: 'neutral',
    confidence: 0.6,
    triggers: [],
  };
}

function buildAttunementPrompt(posture, detected_state) {
  const postureRules = POSTURE_RULES[posture] || POSTURE_RULES.STEADY;
  
  return `
${VOICE_LOCK_V1}

${DRIFT_CHECKLIST}

${STYLE_EXAMPLES}

${postureRules}

CURRENT STATE:
- care_posture: ${posture}
- detected_state: ${detected_state}
- people_pleasing_forbidden: true
- tone_drift_forbidden: true
`;
}

function checkDriftViolations(replyText) {
  if (!replyText) return { hasViolation: false, violations: [] };
  
  const lower = replyText.toLowerCase();
  const violations = [];
  
  // Check forbidden patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (lower.includes(pattern)) {
      violations.push(pattern);
    }
  }
  
  // Check for excessive exclamation marks
  const exclamationCount = (replyText.match(/!/g) || []).length;
  if (exclamationCount > 2) {
    violations.push('excessive_exclamation_marks');
  }
  
  // Check for therapy-bot openers
  if (lower.startsWith("that sounds") || lower.startsWith("i hear")) {
    violations.push('therapy_template_opener');
  }
  
  return {
    hasViolation: violations.length > 0,
    violations,
  };
}

function buildRewritePrompt(originalReply) {
  return `Rewrite this reply with TRACE VOICE LOCK V1. Keep the meaning, but remove therapy-template language. Be concise, grounded, and direct. Do not use phrases like "I'm here for you", "That sounds really hard", or "You're not alone". Keep TRACE's calm, premium voice.

Original:
${originalReply}

Rewritten:`;
}

module.exports = {
  detectPosture,
  buildAttunementPrompt,
  checkDriftViolations,
  buildRewritePrompt,
  VOICE_LOCK_V1,
  DRIFT_CHECKLIST,
  POSTURE_RULES,
};
