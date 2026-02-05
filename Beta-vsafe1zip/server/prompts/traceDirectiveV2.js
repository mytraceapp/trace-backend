/**
 * TRACE Turn Directive V2 (Phase 2)
 * 
 * Converts traceIntent into explicit turn instructions.
 * This is the dynamic portion that changes per-request.
 * 
 * Design: Always placed LAST in the system prompt for maximum instruction following.
 */

function buildTraceDirectiveV2({ traceIntent, antiRepetitionOpeners = [] }) {
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

  // Required sections for longform content
  const structure =
    mode === 'longform' && Array.isArray(c.requiredSections) && c.requiredSections.length
      ? `Required sections: ${c.requiredSections.join(', ')}.`
      : '';

  // Questions constraint
  const questionsRule =
    typeof c.allowQuestions === 'number'
      ? `Questions allowed: ${c.allowQuestions}.`
      : '';

  // Activity suggestion constraint
  const activityRule =
    c.allowActivities ? `Activity suggestions: ${c.allowActivities}.` : '';

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

  return `
TURN DIRECTIVE
Intent type: ${intentType}
${modeBlock}
${structure}
${questionsRule}
${activityRule}
Avoid therapy-speak. Avoid banned phrases.
${doorwayHint}

${contextBlock}

${antiRepeat}
Output only the user-facing message.
`.trim();
}

module.exports = { buildTraceDirectiveV2 };
