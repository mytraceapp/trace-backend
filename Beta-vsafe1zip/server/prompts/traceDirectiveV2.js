/**
 * TRACE Turn Directive V2 (Phase 2 + Phase 7 Steps 1-3)
 * 
 * Converts traceIntent into explicit turn instructions.
 * This is the dynamic portion that changes per-request.
 * 
 * Phase 7 Step 1: Confidence Posture, First-Sentence Authority, Hedging, Cadence
 * Phase 7 Step 2: Next-Move Contracts
 * Phase 7 Step 3: Output Contract Lock (hard enforcement of move→output mapping)
 * 
 * Design: Always placed LAST in the system prompt for maximum instruction following.
 */

const EXPLORING_AND_ABOVE = ['EXPLORING', 'PROCESSING', 'INTEGRATING', 'CLOSING'];

function deriveConfidence(traceIntent, activeRun, convoStage) {
  if (traceIntent?.continuity?.required === true) return 'high';
  if (activeRun?.active === true && !activeRun?.expired) return 'high';

  const topicEstablished = traceIntent?.topicAnchor?.carried === true;
  if (topicEstablished) return 'medium';
  if (convoStage && EXPLORING_AND_ABOVE.includes(convoStage)) return 'medium';

  return 'low';
}

function buildTraceDirectiveV2({ traceIntent, antiRepetitionOpeners = [], sessionSummary = null, activeRun = null, convoStage = null }) {
  const c = traceIntent?.constraints || {};
  const mode = traceIntent?.mode || 'micro';
  const intentType = traceIntent?.intentType || 'other';
  const primaryMode = traceIntent?.primaryMode || 'conversation';
  const isCrisisOrOnboarding = primaryMode === 'crisis' || primaryMode === 'onboarding';
  const musicFamiliarity = traceIntent?.musicFamiliarity || 'new';

  const modeBlock =
    mode === 'micro'
      ? `MODE: MICRO. Keep it to ${c.maxSentences || 2} sentences max.`
      : mode === 'longform'
      ? `MODE: LONGFORM. Be complete. Do NOT truncate.`
      : mode === 'crisis'
      ? `MODE: CRISIS. Use safety-first guidance.`
      : `MODE: NORMAL. Be appropriately concise but complete.`;

  const modeHint = traceIntent?.trace_mode_hint || 'reflect';
  const modeHintBlock = modeHint === 'regulate'
    ? `APPROACH: Regulate. The user is activated — ground them first. Use short, steady language. Invite one body-based action (breathe, feel feet, slow exhale). Do not explore or probe deeper right now.`
    : modeHint === 'blend'
    ? `APPROACH: Blend. The user is stressed but not overwhelmed. Acknowledge what they're feeling, then gently reflect. One grounding cue is okay but don't lead with it.`
    : '';

  const structure =
    mode === 'longform'
      ? `STRUCTURE REQUIREMENT (MANDATORY):
Respond in three distinct parts:
- Beginning: establish context or set the scene.
- Middle: develop the main events, ideas, or progression.
- End: provide resolution or conclusion.
All three parts must be present. Do not omit any part.
Do not use section headers or labels. Write in natural narrative flow.
Do not ask any questions in this response.`
      : '';

  const questionsRule =
    typeof c.allowQuestions === 'number'
      ? c.allowQuestions === 0
        ? 'Ask zero questions. Do not include any question marks.'
        : `Ask exactly one question at the end. Do not ask any other questions.`
      : '';

  const activityRule =
    c.allowActivities === 'never'
      ? (c.suppressSoundscapes
          ? 'Do not suggest activities. Do not mention soundscapes; only discuss album/tracks/playlists.'
          : 'Do not suggest activities.')
      : c.allowActivities ? `Activity suggestions: ${c.allowActivities}.` : '';

  const doorwayHint = traceIntent?.selectedContext?.doorwayHint
    ? `Doorway hint (optional): ${traceIntent.selectedContext.doorwayHint}.`
    : '';

  const sc = traceIntent?.selectedContext || {};
  const contextBullets = [
    ...(sc.memoryBullets || []),
    ...(sc.patternBullets || []),
    ...(sc.activityBullets || []),
    ...(sc.dreamBullets || []),
    ...(sc.studiosBullets || []),
  ].slice(0, 10);

  const contextBlock = contextBullets.length
    ? `Use these context bullets if relevant:\n- ${contextBullets.join('\n- ')}`
    : `No extra context needed.`;

  const antiRepeat =
    antiRepetitionOpeners.length
      ? `Avoid repeating these openers:\n- ${antiRepetitionOpeners.slice(0, 8).join('\n- ')}`
      : '';

  const anchor = traceIntent?.topicAnchor;
  const anchorLine = anchor?.label
    ? `TOPIC ANCHOR: Stay grounded in "${anchor.label}"${anchor.entities?.length ? ` (${anchor.entities.join(', ')})` : ''}. ${anchor.carried ? `Continued from previous turn (turn ${anchor.turnAge}).` : 'New topic.'} Do not drift to unrelated subjects unless the user shifts.`
    : '';

  const summaryLine = sessionSummary
    ? `SESSION SUMMARY: ${sessionSummary}`
    : '';

  const continuityLine = traceIntent?.continuity?.required
    ? 'CONTINUITY: Continue the current thread. Do not reset or reintroduce yourself.'
    : '';

  // ── Phase 7 Step 1: Confidence + Authority + Hedging + Cadence ──
  // ── Phase 7 Step 2: Next-Move Contract ──

  const confidence = isCrisisOrOnboarding ? null : deriveConfidence(traceIntent, activeRun, convoStage);
  const anchorChanged = traceIntent?.continuity?.anchorChanged === true;
  const continuityRequired = traceIntent?.continuity?.required === true;

  let confidenceBlock = '';
  if (confidence && !isCrisisOrOnboarding) {
    // A) First-Sentence Authority
    let authorityRule = '';
    if (continuityRequired) {
      authorityRule = `FIRST-SENTENCE RULE: Start with a direct continuation (6–14 words). Do NOT re-explain who you are, do NOT ask "what's going on", do NOT reset context. Banned openers: "Just to clarify", "To recap", "As an AI", "It sounds like".`;
    } else if (anchorChanged) {
      authorityRule = `FIRST-SENTENCE RULE: Use one clean pivot line (6–14 words) acknowledging the shift. No re-explanation.`;
    }

    // B) Hedging Suppression
    let hedgingRule = '';
    if (confidence === 'high') {
      hedgingRule = `HEDGING: None. Do not use "maybe", "might", "perhaps", "I think", "it seems". Be decisive but gentle.`;
    } else if (confidence === 'medium') {
      hedgingRule = `HEDGING: One soft hedge maximum. Be grounded.`;
    } else {
      hedgingRule = `HEDGING: One clarifying question maximum. Stay within question limits.`;
    }

    // C) Cadence Bucket
    let cadenceRule = '';
    if (primaryMode === 'studios') {
      cadenceRule = `CADENCE: Fast, declarative, creative. No activities or soundscapes. No therapy cadence. Respond quickly and concretely; no preambles.`;
    } else if (primaryMode === 'conversation') {
      cadenceRule = `CADENCE: Paced, warm, human. Reflect briefly; no over-explaining. Lead with one grounded line, then continue.`;
    }

    confidenceBlock = [
      `CONFIDENCE: ${confidence.toUpperCase()}`,
      authorityRule,
      hedgingRule,
      cadenceRule,
    ].filter(Boolean).join('\n');
  }

  const NEXT_MOVE_CONTRACTS = {
    continue: 'Continue content only. NO questions unless a missing-slot detection explicitly requires it. Do NOT mix in reflections, music offers, or activity offers.',
    clarify: 'Ask EXACTLY ONE question. STOP immediately after. No extra content, no reflections, no offers.',
    offer_music: 'Offer ONE track OR ask ONE preference question. NEVER mention soundscapes or activities.',
    offer_activity_if_asked: 'Offer an activity only if the user asked. Otherwise respond normally. Do NOT offer music.',
    reflect_then_question: 'Brief reflection (1–2 lines) then ask EXACTLY ONE warm question. Do NOT offer music unless user explicitly asked.',
    deliver_longform: 'Long output. NO questions. NEVER truncate. Enforce structure for stories/recipes (beginning, middle, end).',
  };

  const nextMove = traceIntent?.nextMove || null;
  const nextMoveContract = (nextMove && !isCrisisOrOnboarding && NEXT_MOVE_CONTRACTS[nextMove])
    ? `NEXT MOVE: ${nextMove}. ${NEXT_MOVE_CONTRACTS[nextMove]} Do not do multiple moves.`
    : '';

  // ── Phase 7 Step 3: Output Contract Lock ──
  let outputContractBlock = '';
  if (!isCrisisOrOnboarding) {
    const contractRules = [];

    // First-Line Continuity Rule
    if (continuityRequired) {
      contractRules.push(`FIRST-LINE CONTINUITY (HARD RULE): Your first sentence MUST be a direct continuation of the current thread, 6–14 words. FORBIDDEN in first sentence: "I'm TRACE", "TRACE Studios", "As an AI", "To recap", "Let's", "Just to clarify", "Here's what we'll do". Violation = failed output.`);
    }

    // Studios First-Turn Exception
    if (primaryMode === 'studios' && !continuityRequired) {
      contractRules.push(`STUDIOS FIRST-TURN (HARD RULE): First sentence MUST be creative or action-oriented. NEVER explain what Studios is. NEVER introduce TRACE's identity. Jump straight into creative output.`);
    }

    // Mode Guardrails
    if (primaryMode === 'studios') {
      contractRules.push(`STUDIOS GUARDRAIL: FORBIDDEN in this response — activities, soundscapes, grounding, exercises, breathing, therapy cadence, "try this", "let's do". Only music, albums, tracks, playlists, creative content.`);
    } else if (primaryMode === 'conversation') {
      contractRules.push(`CONVERSATION GUARDRAIL (HARD RULE): NEVER mention Spotify playlists (Rooted, Low Orbit, First Light) unless the user explicitly asks for external/outside-app recommendations OR is leaving/saying goodbye. Night Swim tracks are fine to suggest naturally when the emotional moment fits. Spotify playlist mentions will be stripped from the response.`);
    }

    if (contractRules.length > 0) {
      outputContractBlock = `\nNEXT MOVE OUTPUT CONTRACT (ENFORCE STRICTLY):\n${contractRules.join('\n')}`;
    }
  }

  let musicFamiliarityBlock = '';
  if (musicFamiliarity !== 'new' && !isCrisisOrOnboarding) {
    musicFamiliarityBlock = `MUSIC FAMILIARITY: ${musicFamiliarity.toUpperCase()}. The user already knows TRACE's music catalog. BANNED phrases: "Have you listened to…", "Want to hear my album?", "Let me introduce TRACE Studios…", "I actually have music", "Did you know I have an album?", "I made an album called…". Speak as if the user already knows Night Swim. Only offer music when the user asks or expresses music intent.`;
  }

  return `
TURN DIRECTIVE
Intent type: ${intentType}
${summaryLine}
${continuityLine}
${confidenceBlock}
${nextMoveContract}
${outputContractBlock}
${musicFamiliarityBlock}
${modeBlock}
${modeHintBlock}
${structure}
${questionsRule}
${activityRule}
Avoid therapy-speak. Avoid banned phrases.
${anchorLine}
${doorwayHint}

${contextBlock}

${antiRepeat}
Output only the user-facing message.
`.trim();
}

module.exports = { buildTraceDirectiveV2, deriveConfidence };
