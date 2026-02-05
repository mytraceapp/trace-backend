/**
 * TRACE Schema Meta — Phase 4.1
 * 
 * Deterministic meta computed SERVER-SIDE from the final response text.
 * Models are never asked to self-report — this is ground truth.
 * 
 * Works identically for T1 (JSON response) and T2 (plain text Step B).
 */

const TRUNCATION_PATTERNS = [
  /\bin short\b/i,
  /\bto keep it brief\b/i,
  /\blong story short\b/i,
  /\betc\.?\s*etc/i,
  /\banyway,?\s/i,
  /\bto summarize\b/i,
  /\bwithout going into detail\b/i,
  /\bi'll keep this short\b/i,
  /\bbriefly\b/i,
];

const ACTIVITY_OFFER_PATTERNS = [
  /\bbreathing exercise\b/i,
  /\bgrounding exercise\b/i,
  /\btry an activity\b/i,
  /\bsuggest an activity\b/i,
  /\bwant to try\b.*\b(exercise|activity|breathing|grounding|maze|walking)\b/i,
  /\bhow about a\b.*\b(breathing|grounding|exercise|activity)\b/i,
  /\blet me suggest\b/i,
  /\bwould you like to try\b/i,
];

function countSentences(text) {
  if (!text || !text.trim()) return 0;

  const ABBREVS = ['dr.', 'mr.', 'mrs.', 'ms.', 'st.', 'jr.', 'sr.', 'e.g.', 'i.e.', 'vs.', 'etc.', 'prof.', 'gen.'];
  let cleaned = text;
  for (const abbr of ABBREVS) {
    cleaned = cleaned.replace(new RegExp(abbr.replace('.', '\\.'), 'gi'), abbr.replace(/\./g, '§'));
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);

  return sentences.length;
}

function countQuestions(text) {
  if (!text) return 0;
  const matches = text.match(/\?/g);
  return matches ? matches.length : 0;
}

function hasTruncationLanguage(text) {
  if (!text) return false;
  return TRUNCATION_PATTERNS.some(p => p.test(text));
}

function hasActivityOffer(text) {
  if (!text) return false;
  return ACTIVITY_OFFER_PATTERNS.some(p => p.test(text));
}

function detectSections(text) {
  if (!text) return [];
  const sections = [];
  if (/\b(ingredients?)\b/i.test(text)) sections.push('ingredients');
  if (/\b(steps?|instructions?|directions?)\b/i.test(text) && /\d[.)]\s/i.test(text)) sections.push('steps');
  if (/\b(verse|chorus|bridge)\b/i.test(text)) sections.push('lyrics');
  return sections;
}

/**
 * Compute deterministic meta from final response text.
 * 
 * @param {string} finalText - The final response text (after all model generation, before post-processing)
 * @param {object} traceIntent - The traceIntent object with mode/constraints
 * @returns {object} meta
 */
function computeMeta(finalText, traceIntent) {
  const mode = traceIntent?.mode || 'micro';
  const sentenceCount = countSentences(finalText);
  const questionCount = countQuestions(finalText);

  return {
    mode_expected: mode,
    sentence_count: sentenceCount,
    question_count: questionCount,
    has_truncation_language: hasTruncationLanguage(finalText),
    activity_offered: hasActivityOffer(finalText),
    sections_present: mode === 'longform' ? detectSections(finalText) : [],
    char_count: finalText ? finalText.length : 0,
  };
}

module.exports = {
  computeMeta,
  countSentences,
  countQuestions,
  hasTruncationLanguage,
  hasActivityOffer,
  detectSections,
};
