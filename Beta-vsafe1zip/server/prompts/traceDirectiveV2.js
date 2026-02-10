/**
 * TRACE Turn Directive V2 (Phase 2)
 * 
 * Converts traceIntent into explicit turn instructions.
 * This is the dynamic portion that changes per-request.
 * 
 * Design: Always placed LAST in the system prompt for maximum instruction following.
 */

function buildTraceDirectiveV2({ traceIntent, antiRepetitionOpeners = [], sessionSummary = null }) {
  const c = traceIntent?.constraints || {};
  const mode = traceIntent?.mode || 'micro';
  const intentType = traceIntent?.intentType || 'other';

  // Mode instruction block
  const modeBlock =
    mode === 'micro'
      ? `MODE: MICRO. Keep it to ${c.maxSentences || 2} sentences max.`
      : mode === 'longform'
      ? `MODE: LONGFORM. Be complete. Do NOT truncate.`
      : mode === 'crisis'
      ? `MODE: CRISIS. Use safety-first guidance.`
      : `MODE: NORMAL. Be appropriately concise but complete.`;

  // Longform structure contract — semantic presence, not formatting headers
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

  // Questions constraint — unmistakable language to eliminate question_overflow
  const questionsRule =
    typeof c.allowQuestions === 'number'
      ? c.allowQuestions === 0
        ? 'Ask zero questions. Do not include any question marks.'
        : `Ask exactly one question at the end. Do not ask any other questions.`
      : '';

  // Activity suggestion constraint
  const activityRule =
    c.allowActivities === 'never'
      ? (c.suppressSoundscapes
          ? 'Do not suggest activities. Do not mention soundscapes; only discuss album/tracks/playlists.'
          : 'Do not suggest activities.')
      : c.allowActivities ? `Activity suggestions: ${c.allowActivities}.` : '';

  // Doorway hint (optional therapeutic realm)
  const doorwayHint = traceIntent?.selectedContext?.doorwayHint
    ? `Doorway hint (optional): ${traceIntent.selectedContext.doorwayHint}.`
    : '';

  // Context bullets from memory, patterns, activities
  const contextBullets = [
    ...(traceIntent?.selectedContext?.memoryBullets || []),
    ...(traceIntent?.selectedContext?.patternBullets || []),
    ...(traceIntent?.selectedContext?.activityBullets || []),
  ].slice(0, 10);

  const contextBlock = contextBullets.length
    ? `Use these context bullets if relevant:\n- ${contextBullets.join('\n- ')}`
    : `No extra context needed.`;

  // Anti-repetition openers
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

  return `
TURN DIRECTIVE
Intent type: ${intentType}
${summaryLine}
${modeBlock}
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

module.exports = { buildTraceDirectiveV2 };
