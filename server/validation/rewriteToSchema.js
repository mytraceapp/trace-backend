/**
 * TRACE Schema Rewrite — Phase 4.3
 * 
 * Single rewrite path that REPLACES Drift Lock for V2 traffic.
 * Never stacked with Drift Lock. Limited to ONE attempt.
 * Never runs in crisis or onboarding.
 * 
 * Rewrite is structure-focused (sentence count, question count, activity removal)
 * not tone-focused (that was Drift Lock's job; V2 prompt handles tone).
 */

/**
 * Build a constrained rewrite prompt from violations and constraints.
 * Non-expansive: "Preserve meaning, don't add new ideas."
 */
function buildSchemaRewritePrompt(text, violations, constraints) {
  const rules = [];

  for (const v of violations) {
    if (v.startsWith('sentence_overflow')) {
      rules.push(`Limit to ${constraints.maxSentences || 2} sentences maximum. Merge or cut sentences to fit.`);
    }
    if (v.startsWith('question_overflow')) {
      rules.push(`Use at most ${constraints.allowQuestions ?? 1} question mark(s). Remove or convert extra questions to statements.`);
    }
    if (v.includes('activity_offered')) {
      rules.push('Remove any suggestion of activities, exercises, or techniques. Do not offer breathing exercises, grounding, or similar.');
    }
    if (v.includes('truncation_language')) {
      rules.push('Remove phrases like "in short", "to keep it brief", "long story short", "anyway". Deliver the full content naturally.');
    }
    if (v.includes('missing_section')) {
      const section = v.split(': ')[1];
      rules.push(`Include a "${section}" section.`);
    }
  }

  return `Rewrite the following message to comply with these constraints. Do NOT add new ideas or information. Preserve the original meaning and emotional tone exactly.

CONSTRAINTS:
${rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

ORIGINAL MESSAGE:
${text}

REWRITTEN MESSAGE (text only, no quotes, no explanation):`;
}

/**
 * Attempt a single schema-compliant rewrite.
 * 
 * @param {object} openai - OpenAI client instance
 * @param {string} text - The original response text
 * @param {object} schemaResult - Result from validateTraceResponseSchema
 * @param {object} traceIntent - The traceIntent with constraints
 * @param {object} ctx - { requestId, tier, model }
 * @returns {{ rewritten: string|null, success: boolean, latencyMs: number, error?: string }}
 */
async function rewriteToSchema(openai, text, schemaResult, traceIntent, ctx = {}) {
  if (!openai) {
    return { rewritten: null, success: false, latencyMs: 0, error: 'no_openai_client' };
  }

  if (schemaResult.ok || schemaResult.skipped) {
    return { rewritten: null, success: false, latencyMs: 0, error: 'no_rewrite_needed' };
  }

  const constraints = traceIntent?.constraints || {};
  const prompt = buildSchemaRewritePrompt(text, schemaResult.violations, constraints);

  const start = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a text editor. Rewrite the message to comply with the given constraints. Keep the same voice, tone, and meaning. Do not add new content.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    const rewritten = response.choices?.[0]?.message?.content?.trim();
    const latencyMs = Date.now() - start;

    if (rewritten && rewritten.length > 5) {
      return { rewritten, success: true, latencyMs };
    }

    return { rewritten: null, success: false, latencyMs, error: 'empty_rewrite' };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return { rewritten: null, success: false, latencyMs, error: err.message };
  }
}

module.exports = { rewriteToSchema, buildSchemaRewritePrompt };
