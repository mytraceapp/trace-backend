/**
 * TRACE Prompt Builder V2 (Phase 2)
 * 
 * Combines stable core identity with dynamic turn directive.
 * The directive is always placed LAST for maximum instruction following.
 * Attunement block (Voice Lock + Posture Rules) is placed FIRST when provided.
 * 
 * Usage:
 *   const systemPrompt = buildTracePromptV2({ attunementBlock, tonePreference, traceIntent, ... });
 */

const { buildTraceCoreV2 } = require('./traceCoreV2');
const { buildTraceDirectiveV2 } = require('./traceDirectiveV2');
const { ATTUNEMENT_MARKER } = require('../traceAttunement');

function buildTracePromptV2({
  attunementBlock,
  tonePreference,
  traceIntent,
  antiRepetitionOpeners,
  sessionSummary,
  activeRun,
  convoStage,
}) {
  const core = buildTraceCoreV2({ tonePreference });
  const directive = buildTraceDirectiveV2({ traceIntent, antiRepetitionOpeners, sessionSummary, activeRun, convoStage });

  let prompt = `${core}\n\n${directive}`;

  if (attunementBlock && !prompt.includes(ATTUNEMENT_MARKER)) {
    prompt = `${attunementBlock}\n\n${prompt}`;
  }

  return prompt;
}

module.exports = { buildTracePromptV2 };
