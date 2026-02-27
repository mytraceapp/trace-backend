/**
 * Phase 7 Step 3 — Lightweight Next-Move Output Contract Assertions
 * 
 * Log-only assertions that verify the final response text
 * conforms to the nextMove contract. No rewrites, no blocking.
 */

const RESET_PHRASES = [
  "i'm trace",
  "trace studios",
  "as an ai",
  "to recap",
  "let's",
  "just to clarify",
  "here's what we'll do",
];

const STUDIOS_LEAK_TERMS = [
  'soundscape',
  'breathing',
  'grounding',
  'exercise',
  'doorway',
  'try this',
  "let's do",
];

const MUSIC_OFFER_TERMS = [
  'spotify',
  'rooted playlist',
  'rooted_playlist',
  'low orbit playlist',
  'low_orbit_playlist',
  'first light playlist',
  'first_light_playlist',
  'on spotify',
  'open spotify',
];

function getFirstSentence(text) {
  if (!text) return '';
  const match = text.match(/^[^.!?\n]+[.!?]?/);
  return match ? match[0].trim() : text.split('\n')[0].trim();
}

function countSentences(text) {
  if (!text) return 0;
  const cleaned = text.replace(/\.\.\./g, '…');
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  return sentences.length;
}

function countQuestions(text) {
  if (!text) return 0;
  return (text.match(/\?/g) || []).length;
}

function assertNextMoveContract({ requestId, useV2, isCrisisMode, isOnboardingActive, traceIntent, finalText }) {
  const result = { ran: false, passed: true, violations: [] };

  if (!useV2) return result;
  if (isCrisisMode) return result;
  if (isOnboardingActive) return result;
  if (!traceIntent?.nextMove) return result;
  if (!finalText) return result;

  result.ran = true;

  const nextMove = traceIntent.nextMove;
  const primaryMode = traceIntent.primaryMode || 'conversation';
  const continuityRequired = traceIntent.continuity?.required === true;
  const firstSentence = getFirstSentence(finalText).toLowerCase();
  const textLower = finalText.toLowerCase();
  const questionCount = countQuestions(finalText);
  const sentenceCount = countSentences(finalText);

  // 1) first_line_reset
  if (continuityRequired) {
    for (const phrase of RESET_PHRASES) {
      if (firstSentence.includes(phrase)) {
        result.violations.push({
          code: 'first_line_reset',
          detail: `First sentence contains banned phrase when continuity required`,
          severity: 'high',
        });
        break;
      }
    }
  }

  // 2) studios_identity_intro
  if (primaryMode === 'studios' && !continuityRequired) {
    if (firstSentence.includes("i'm trace") || firstSentence.includes('trace studios')) {
      result.violations.push({
        code: 'studios_identity_intro',
        detail: 'Studios first turn introduces TRACE identity',
        severity: 'high',
      });
    }
  }

  // 3) move_mix_clarify
  if (nextMove === 'clarify') {
    const hasParagraphBreak = finalText.includes('\n\n');
    if (sentenceCount > 2 || hasParagraphBreak) {
      result.violations.push({
        code: 'move_mix_clarify',
        detail: `clarify move produced ${sentenceCount} sentences or paragraph break`,
        severity: 'medium',
      });
    }
  }

  // 4) move_question_count
  if (nextMove === 'continue' || nextMove === 'deliver_longform') {
    if (questionCount > 1) {
      result.violations.push({
        code: 'move_question_count',
        detail: `${nextMove} move has ${questionCount} questions (expected 0-1)`,
        severity: 'medium',
      });
    }
  }
  if (nextMove === 'clarify' || nextMove === 'reflect_then_question') {
    if (questionCount !== 1) {
      result.violations.push({
        code: 'move_question_count',
        detail: `${nextMove} move has ${questionCount} questions (expected exactly 1)`,
        severity: 'medium',
      });
    }
  }
  if (nextMove === 'offer_music') {
    if (questionCount > 1) {
      result.violations.push({
        code: 'move_question_count',
        detail: `offer_music move has ${questionCount} questions (expected 0-1)`,
        severity: 'medium',
      });
    }
  }

  // 5) studios_activity_leak
  if (primaryMode === 'studios') {
    for (const term of STUDIOS_LEAK_TERMS) {
      if (textLower.includes(term)) {
        result.violations.push({
          code: 'studios_activity_leak',
          detail: 'Studios response contains forbidden activity/therapy term',
          severity: 'high',
        });
        break;
      }
    }
  }

  // 6) conversation_music_offer_leak
  if (primaryMode === 'conversation' && nextMove !== 'offer_music') {
    const userRequestedMusic = traceIntent.intentType === 'music' ||
      traceIntent.signals?.traceBrain?.musicRequest === true;
    if (!userRequestedMusic) {
      for (const term of MUSIC_OFFER_TERMS) {
        if (textLower.includes(term)) {
          result.violations.push({
            code: 'conversation_music_offer_leak',
            detail: 'Conversation response offers music without user request',
            severity: 'high',
          });
          break;
        }
      }
    }
  }

  result.passed = result.violations.length === 0;
  return result;
}

module.exports = { assertNextMoveContract };
