/**
 * TRACE Turn Directive V2 (Phase 2 + Phase 7 Steps 1-3)
 * 
 * Converts traceIntent into explicit turn instructions.
 * Dynamic per-request. Placed LAST in system prompt.
 * 
 * Slimmed: voice/tone handled by Core V2 identity. 
 * This directive only adds structural constraints + feature hooks.
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
      ? `LENGTH: ${c.maxSentences || 2} sentences max.`
      : mode === 'longform'
      ? `LENGTH: Be complete. Do NOT truncate.`
      : mode === 'crisis'
      ? `MODE: CRISIS. Safety-first.`
      : `LENGTH: Concise but complete.`;

  const qg = traceIntent?.questionGuard || {};
  const modeHint = traceIntent?.trace_mode_hint || 'reflect';

  if (qg.questionCooldown) {
    c.allowQuestions = 0;
  }

  const qGuardBlock = qg.questionCooldown
    ? `QUESTION GUARD: Your last response had a question. Do NOT include any question marks in this reply.`
    : '';

  const feelGuardBlock = qg.feelingCooldown
    ? `FEELING BAN: No "how do you feel" variants for several turns. Use body/needs/fork prompts instead.`
    : '';

  const approachBlock = modeHint === 'regulate'
    ? `APPROACH: Ground them. 1-3 sentences. Name what you see, one micro-step (breathe, feel feet), one anchor.${qg.questionCooldown ? ' Zero questions.' : ''}`
    : '';

  const structure =
    mode === 'longform'
      ? `STRUCTURE: Beginning → Middle → End. Natural narrative flow. No section headers. No questions.`
      : '';

  const questionsRule =
    typeof c.allowQuestions === 'number'
      ? c.allowQuestions === 0
        ? 'Zero questions. No question marks.'
        : `Max one question.`
      : '';

  const activityRule =
    c.allowActivities === 'never'
      ? (c.suppressSoundscapes
          ? 'No activities. No soundscape mentions — only album/tracks/playlists.'
          : 'No activities.')
      : c.allowActivities ? `Activity suggestions: ${c.allowActivities}.` : '';

  const doorwayHint = traceIntent?.selectedContext?.doorwayHint
    ? `Doorway hint: ${traceIntent.selectedContext.doorwayHint}.`
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
    ? `Context:\n- ${contextBullets.join('\n- ')}`
    : '';

  const antiRepeat =
    antiRepetitionOpeners.length
      ? `Avoid these openers:\n- ${antiRepetitionOpeners.slice(0, 8).join('\n- ')}`
      : '';

  const anchor = traceIntent?.topicAnchor;
  const anchorLine = anchor?.label
    ? `TOPIC: "${anchor.label}"${anchor.entities?.length ? ` (${anchor.entities.join(', ')})` : ''}. ${anchor.carried ? `Continued from turn ${anchor.turnAge}.` : 'New.'} Stay here unless user shifts.`
    : '';

  const summaryLine = sessionSummary
    ? `SESSION: ${sessionSummary}`
    : '';

  const continuityLine = traceIntent?.continuity?.required
    ? 'CONTINUITY: Continue current thread. No reset.'
    : '';

  const confidence = isCrisisOrOnboarding ? null : deriveConfidence(traceIntent, activeRun, convoStage);
  const anchorChanged = traceIntent?.continuity?.anchorChanged === true;
  const continuityRequired = traceIntent?.continuity?.required === true;

  let firstSentenceRule = '';
  if (confidence && !isCrisisOrOnboarding) {
    if (continuityRequired) {
      firstSentenceRule = `FIRST LINE: Direct continuation (6-14 words). No re-introductions, no "To recap", no "As an AI".`;
    } else if (anchorChanged) {
      firstSentenceRule = `FIRST LINE: Clean pivot acknowledging the shift. One line.`;
    }
  }

  const NEXT_MOVE_CONTRACTS = {
    continue: 'Continue content only. No questions unless missing-slot requires it.',
    clarify: 'Ask ONE question. Stop after.',
    offer_music: 'Offer ONE track OR ask ONE preference question. No soundscapes or activities.',
    offer_activity_if_asked: 'Offer activity only if user asked. Otherwise respond normally.',
    reflect_then_question: 'Brief reflection (1-2 lines) then ONE warm question.',
    deliver_longform: 'Long output. No questions. No truncating.',
  };

  const nextMove = traceIntent?.nextMove || null;
  const nextMoveContract = (nextMove && !isCrisisOrOnboarding && NEXT_MOVE_CONTRACTS[nextMove])
    ? `MOVE: ${nextMove}. ${NEXT_MOVE_CONTRACTS[nextMove]}`
    : '';

  let outputContractBlock = '';
  if (!isCrisisOrOnboarding) {
    const contractRules = [];

    if (continuityRequired) {
      contractRules.push(`FIRST-LINE LOCK: First sentence = direct continuation, 6-14 words. Forbidden: "I'm TRACE", "TRACE Studios", "As an AI", "To recap", "Let's", "Just to clarify".`);
    }

    if (primaryMode === 'studios' && !continuityRequired) {
      contractRules.push(`STUDIOS ENTRY: Jump straight into creative output. Never explain what Studios is.`);
    }

    if (primaryMode === 'studios') {
      contractRules.push(`STUDIOS MODE: No activities, soundscapes, grounding, exercises, breathing, therapy cadence. Only music/creative content.`);
    } else if (primaryMode === 'conversation') {
      contractRules.push(`CONVERSATION MODE: Never mention Spotify playlists (Rooted, Low Orbit, First Light) unless Night Swim tracks have already been suggested AND user wants more music, OR user is ending the session. Always lead with Night Swim tracks first. Night Swim = in-app playback. Spotify playlists = last resort.`);
    }

    if (contractRules.length > 0) {
      outputContractBlock = contractRules.join('\n');
    }
  }

  let musicFamiliarityBlock = '';
  if (musicFamiliarity !== 'new' && !isCrisisOrOnboarding) {
    musicFamiliarityBlock = `MUSIC: User knows Night Swim. Don't re-introduce it. Only offer when asked or music-intent is clear.`;
  }

  return `
TURN DIRECTIVE
Intent: ${intentType}
${summaryLine}
${continuityLine}
${firstSentenceRule}
${nextMoveContract}
${outputContractBlock}
${musicFamiliarityBlock}
${modeBlock}
${approachBlock}
${qGuardBlock}
${feelGuardBlock}
${structure}
${questionsRule}
${activityRule}
${anchorLine}
${doorwayHint}

${contextBlock}

${antiRepeat}
RESPONSE TEXTURE CHECK:
If your last 3 responses were each under 5 words, add more substance to this one.
If this response would be a single flat phrase ("Got it." / "I see." / "Okay." / "Sure." / "Noted." / "Mm, yeah." / "Nice." / "That's awesome." / "Cool."), rewrite it — what would a friend who's been listening say here?
If the user added "lol" or "haha" to something real, respond to the feeling, not the laughter.
Humor is allowed when the moment is light — brief, dry, never forced.
Warmth doesn't require length — it requires specificity.

Output only the user-facing message.
`.trim();
}

module.exports = { buildTraceDirectiveV2, deriveConfidence };
