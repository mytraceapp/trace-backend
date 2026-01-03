/**
 * TRACE Long-Term Memory System
 * 
 * Manages persistent user memories stored in Supabase.
 * Used to give TRACE contextual awareness of user patterns, goals, and preferences.
 */

/**
 * @typedef {Object} TraceMemorySummary
 * @property {string[]} coreThemes
 * @property {string[]} currentStressors
 * @property {string[]} goals
 * @property {string[]} triggers
 * @property {string[]} preferences
 * @property {string} lastUpdated - ISO timestamp
 */

/**
 * @typedef {Object} TracePatternsSnapshot
 * @property {string[]} highlights - e.g. ["Evening tension spikes past 3 days"]
 * @property {string[]} risks - e.g. ["Short sleep 3 nights in a row"]
 * @property {string[]} supports - e.g. ["Walking helped last Tuesday"]
 */

/**
 * Fetch latest long-term memories for a user and group by kind.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<TraceMemorySummary|null>}
 */
async function loadTraceLongTermMemory(supabase, userId) {
  if (!supabase || !userId) {
    console.log('[TRACE MEMORY] Missing supabase client or userId');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('long_term_memories')
      .select('kind, content, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[TRACE MEMORY] loadTraceLongTermMemory error:', error.message);
      return null;
    }

    const grouped = {
      identity: [],
      themes: [],
      goals: [],
      triggers: [],
      preferences: [],
    };

    let lastUpdated = null;

    for (const row of data || []) {
      if (grouped[row.kind]) {
        grouped[row.kind].push(row.content);
      }
      if (!lastUpdated || new Date(row.updated_at) > new Date(lastUpdated)) {
        lastUpdated = row.updated_at;
      }
    }

    const summary = {
      coreThemes: grouped.themes,
      currentStressors: [],
      goals: grouped.goals,
      triggers: grouped.triggers,
      preferences: grouped.preferences,
      identity: grouped.identity,
      lastUpdated: lastUpdated || new Date().toISOString(),
    };

    console.log('[TRACE MEMORY] Loaded memory summary:', {
      themes: summary.coreThemes.length,
      goals: summary.goals.length,
      triggers: summary.triggers.length,
      preferences: summary.preferences.length,
    });

    return summary;
  } catch (err) {
    console.error('[TRACE MEMORY] loadTraceLongTermMemory exception:', err);
    return null;
  }
}

/**
 * Build a context string from memory + patterns + recent messages.
 * This gets prepended to the system prompt.
 * @param {Object} params
 * @param {TraceMemorySummary|null} params.memorySummary
 * @param {TracePatternsSnapshot|null} params.patternsSnapshot
 * @param {Array<{role: string, content: string}>} params.recentMessages
 * @returns {string}
 */
function buildUserContextSnapshot({ memorySummary, patternsSnapshot, recentMessages }) {
  const lastFewUserTurns = (recentMessages || [])
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => `- "${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}"`)
    .join('\n');

  const lines = [];

  lines.push('USER CONTEXT (use subtly, do not repeat verbatim or reference directly):');

  if (memorySummary) {
    if (memorySummary.identity?.length) {
      lines.push(`- Who they are: ${memorySummary.identity.slice(0, 3).join('; ')}`);
    }
    if (memorySummary.coreThemes?.length) {
      lines.push(`- Core themes: ${memorySummary.coreThemes.slice(0, 4).join('; ')}`);
    }
    if (memorySummary.goals?.length) {
      lines.push(`- Goals: ${memorySummary.goals.slice(0, 3).join('; ')}`);
    }
    if (memorySummary.triggers?.length) {
      lines.push(`- Emotional triggers: ${memorySummary.triggers.slice(0, 3).join('; ')}`);
    }
    if (memorySummary.preferences?.length) {
      lines.push(`- Support preferences: ${memorySummary.preferences.slice(0, 3).join('; ')}`);
    }
  }

  if (patternsSnapshot) {
    if (patternsSnapshot.highlights?.length) {
      lines.push(`- Recent patterns: ${patternsSnapshot.highlights.slice(0, 2).join('; ')}`);
    }
    if (patternsSnapshot.risks?.length) {
      lines.push(`- Watch for: ${patternsSnapshot.risks.slice(0, 2).join('; ')}`);
    }
    if (patternsSnapshot.supports?.length) {
      lines.push(`- What's helped: ${patternsSnapshot.supports.slice(0, 2).join('; ')}`);
    }
  }

  if (lastFewUserTurns) {
    lines.push('\nRecent messages from user:');
    lines.push(lastFewUserTurns);
  }

  if (lines.length <= 1) {
    return '';
  }

  return lines.join('\n');
}

/**
 * Load recent messages from chat history.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array<{role: string, content: string}>>}
 */
async function loadRecentMessages(supabase, userId, limit = 20) {
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[TRACE MEMORY] loadRecentMessages error:', error.message);
      return [];
    }

    return (data || []).reverse();
  } catch (err) {
    console.error('[TRACE MEMORY] loadRecentMessages exception:', err);
    return [];
  }
}

/**
 * Summarize text into long-term memories using AI.
 * Call this after substantial conversations or journal entries.
 * @param {import('openai').OpenAI} openai
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string} text
 */
async function summarizeToLongTermMemory(openai, supabase, userId, text) {
  if (!openai || !supabase || !userId) {
    console.log('[TRACE MEMORY] Missing dependencies for summarization');
    return;
  }

  if (!text || text.length < 200) {
    console.log('[TRACE MEMORY] Text too short for summarization:', text?.length || 0);
    return;
  }

  const prompt = `You are TRACE's background memory system.

Given the user's recent conversation or journal text, extract stable insights that could help support them in future conversations.

Return STRICTLY in this JSON format:
{
  "themes": [],
  "goals": [],
  "triggers": [],
  "preferences": [],
  "identity": []
}

Guidelines:
- themes: recurring topics, interests, life areas they care about
- goals: things they're working toward or want to achieve
- triggers: situations, topics, or patterns that cause stress or emotional reactions
- preferences: how they like to receive support (e.g., "prefers direct feedback", "likes metaphors")
- identity: stable facts about who they are (e.g., "works in design", "has two kids")

Keep each string short (under 50 chars) and concrete.
Only include things that feel stable over weeks/months, not momentary moods.
Do NOT mention "TRACE" or "the app" in outputs.
Return empty arrays if nothing fits a category.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: text.slice(0, 3000) },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.error('[TRACE MEMORY] Failed to parse memory summary JSON:', e);
      return;
    }

    const rows = [];

    const pushRows = (kind, arr) => {
      if (!Array.isArray(arr)) return;
      for (const content of arr) {
        if (!content || typeof content !== 'string') continue;
        if (content.length > 200) continue;
        rows.push({
          user_id: userId,
          kind,
          content: content.trim(),
          is_active: true,
        });
      }
    };

    pushRows('identity', parsed.identity);
    pushRows('themes', parsed.themes);
    pushRows('goals', parsed.goals);
    pushRows('triggers', parsed.triggers);
    pushRows('preferences', parsed.preferences);

    if (!rows.length) {
      console.log('[TRACE MEMORY] No memories extracted from text');
      return;
    }

    console.log('[TRACE MEMORY] Inserting', rows.length, 'memory rows for user:', userId);

    const { error } = await supabase.from('long_term_memories').insert(rows);
    if (error) {
      console.error('[TRACE MEMORY] Error inserting long_term_memories:', error.message);
    } else {
      console.log('[TRACE MEMORY] Successfully saved', rows.length, 'memories');
    }
  } catch (err) {
    console.error('[TRACE MEMORY] summarizeToLongTermMemory exception:', err);
  }
}

/**
 * Build full memory context for chat.
 * Returns a string to append to the system prompt.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {Array<{role: string, content: string}>} currentMessages - messages in current chat session
 * @returns {Promise<string>}
 */
async function buildMemoryContext(supabase, userId, currentMessages = []) {
  if (!supabase || !userId) return '';

  try {
    const [memorySummary, storedMessages] = await Promise.all([
      loadTraceLongTermMemory(supabase, userId),
      loadRecentMessages(supabase, userId, 10),
    ]);

    const contextSnapshot = buildUserContextSnapshot({
      memorySummary,
      patternsSnapshot: null,
      recentMessages: storedMessages.length > 0 ? storedMessages : currentMessages,
    });

    return contextSnapshot;
  } catch (err) {
    console.error('[TRACE MEMORY] buildMemoryContext error:', err);
    return '';
  }
}

module.exports = {
  loadTraceLongTermMemory,
  buildUserContextSnapshot,
  loadRecentMessages,
  summarizeToLongTermMemory,
  buildMemoryContext,
};
