/**
 * TRACE Prompt Builder V2 (Phase 2)
 * 
 * Combines stable core identity with dynamic turn directive.
 * The directive is always placed LAST for maximum instruction following.
 * 
 * Usage:
 *   const systemPrompt = buildTracePromptV2({ tonePreference, traceIntent, antiRepetitionOpeners });
 */

const { buildTraceCoreV2 } = require('./traceCoreV2');
const { buildTraceDirectiveV2 } = require('./traceDirectiveV2');

function buildTracePromptV2({
  tonePreference,
  traceIntent,
  antiRepetitionOpeners,
  sessionSummary,
}) {
  const core = buildTraceCoreV2({ tonePreference });
  const directive = buildTraceDirectiveV2({ traceIntent, antiRepetitionOpeners, sessionSummary });

  // IMPORTANT: directive must be last for maximum instruction following
  return `${core}\n\n${directive}`;
}

module.exports = { buildTracePromptV2 };
