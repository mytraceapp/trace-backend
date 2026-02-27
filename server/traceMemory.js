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
 * @typedef {Object} JournalMemory
 * @property {string} theme - e.g. "relationship with mom"
 * @property {string|null} subject - e.g. "mom"
 * @property {string|null} emotional_tone - e.g. "reflective"
 * @property {string} entry_date - ISO date
 * @property {boolean} consent_given
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
function buildUserContextSnapshot({ memorySummary, patternsSnapshot, recentMessages, currentTopicAnchor }) {
  const lastFewUserTurns = (recentMessages || [])
    .filter(m => m.role === 'user')
    .slice(-3)
    .map(m => `- "${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}"`)
    .join('\n');

  const lines = [];

  lines.push('USER CONTEXT (background only — NEVER reference these directly, NEVER claim the user said something from here, NEVER say "you mentioned X" based on this context):');

  const isCasualConversation = !currentTopicAnchor ||
    currentTopicAnchor.label === 'open conversation' ||
    currentTopicAnchor.domain === 'music' ||
    currentTopicAnchor.domain === 'activity';

  if (memorySummary) {
    if (memorySummary.identity?.length) {
      lines.push(`- Who they are: ${memorySummary.identity.slice(0, 3).join('; ')}`);
    }
    if (memorySummary.coreThemes?.length) {
      if (isCasualConversation) {
        const neutralThemes = memorySummary.coreThemes.filter(t =>
          !/sad|depress|anxious|stress|grief|anger|sleep|insomnia|overwhelm|panic|lonely|hurt/i.test(t)
        );
        if (neutralThemes.length > 0) {
          lines.push(`- Core themes: ${neutralThemes.slice(0, 3).join('; ')}`);
        }
      } else {
        lines.push(`- Core themes: ${memorySummary.coreThemes.slice(0, 4).join('; ')}`);
      }
    }
    if (memorySummary.goals?.length) {
      lines.push(`- Goals: ${memorySummary.goals.slice(0, 3).join('; ')}`);
    }
    if (memorySummary.triggers?.length && !isCasualConversation) {
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
async function buildMemoryContext(supabase, userId, currentMessages = [], currentTopicAnchor = null) {
  if (!supabase || !userId) return '';

  try {
    const [memorySummary, storedMessages, journalMemories] = await Promise.all([
      loadTraceLongTermMemory(supabase, userId),
      loadRecentMessages(supabase, userId, 10),
      loadRecentJournalMemories(supabase, userId, 30),
    ]);

    const contextSnapshot = buildUserContextSnapshot({
      memorySummary,
      patternsSnapshot: null,
      recentMessages: currentMessages.length > 0 ? currentMessages : storedMessages,
      currentTopicAnchor,
    });

    const journalContext = formatJournalMemoriesForContext(journalMemories);

    return contextSnapshot + journalContext;
  } catch (err) {
    console.error('[TRACE MEMORY] buildMemoryContext error:', err);
    return '';
  }
}

/**
 * Load recent journal memories for a user (last 30 days).
 * Only returns consented memories for inclusion in chat context.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {number} daysBack - How many days back to look (default 30)
 * @returns {Promise<JournalMemory[]>}
 */
async function loadRecentJournalMemories(supabase, userId, daysBack = 30) {
  if (!supabase || !userId) {
    console.log('[TRACE JOURNAL MEMORY] Missing supabase client or userId');
    return [];
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffISO = cutoffDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('journal_memories')
      .select('theme, subject, emotional_tone, entry_date, consent_given')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('entry_date', cutoffISO)
      .order('entry_date', { ascending: false })
      .limit(20);

    if (error) {
      if (!error.message?.includes('schema cache')) {
        console.error('[TRACE JOURNAL MEMORY] loadRecentJournalMemories error:', error.message);
      }
      return [];
    }

    console.log('[TRACE JOURNAL MEMORY] Loaded', data?.length || 0, 'journal memories');
    return data || [];
  } catch (err) {
    console.error('[TRACE JOURNAL MEMORY] loadRecentJournalMemories exception:', err);
    return [];
  }
}

/**
 * Check if user has consented to journal memory references.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function getUserJournalMemoryConsent(supabase, userId) {
  if (!supabase || !userId) return false;
  
  try {
    // Check user_settings for journal_memory_consent
    const { data, error } = await supabase
      .from('user_settings')
      .select('journal_memory_consent')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      // No settings found - default to false (opt-in required)
      return false;
    }
    
    return data.journal_memory_consent === true;
  } catch (err) {
    console.error('[TRACE JOURNAL MEMORY] getUserJournalMemoryConsent error:', err);
    return false;
  }
}

/**
 * Summarize a journal entry into memory themes using AI.
 * @param {import('openai').OpenAI} openai
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string} journalText
 * @param {string} entryId - UUID of the journal entry
 * @param {string} entryDate - ISO date of entry
 */
async function summarizeJournalToMemory(openai, supabase, userId, journalText, entryId, entryDate) {
  if (!openai || !supabase || !userId) {
    console.log('[TRACE JOURNAL MEMORY] Missing dependencies for summarization');
    return;
  }

  if (!journalText || journalText.length < 50) {
    console.log('[TRACE JOURNAL MEMORY] Journal too short for summarization:', journalText?.length || 0);
    return;
  }
  
  // Check if user has consented to journal memory
  const hasConsent = await getUserJournalMemoryConsent(supabase, userId);

  const prompt = `You are TRACE's background memory system, processing a journal entry.

Extract the core themes and subjects from this journal entry that TRACE might gently reference later.

Return STRICTLY in this JSON format:
{
  "themes": [
    {
      "theme": "short theme description (under 40 chars)",
      "subject": "specific person/topic or null",
      "emotional_tone": "one word: reflective, anxious, hopeful, sad, frustrated, grateful, processing, or neutral"
    }
  ]
}

Guidelines:
- Extract 1-3 main themes maximum
- theme: The core topic (e.g., "relationship with mom", "work stress", "childhood memories")
- subject: Specific person or topic if mentioned (e.g., "mom", "boss", "apartment move")
- emotional_tone: The feeling behind the entry
- Keep themes high-level and privacy-conscious (no specific details)
- Return empty themes array if the entry is too vague or short

Examples:
- "relationship with mom" (subject: "mom", tone: "reflective")
- "work deadline stress" (subject: "work", tone: "anxious")
- "childhood memories" (subject: null, tone: "processing")`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: journalText.slice(0, 2000) },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.error('[TRACE JOURNAL MEMORY] Failed to parse journal summary JSON:', e);
      return;
    }

    const themes = parsed.themes || [];
    if (!themes.length) {
      console.log('[TRACE JOURNAL MEMORY] No themes extracted from journal');
      return;
    }

    const rows = themes.map(t => ({
      user_id: userId,
      journal_entry_id: entryId || null,
      theme: (t.theme || '').slice(0, 100),
      subject: t.subject ? t.subject.slice(0, 50) : null,
      emotional_tone: t.emotional_tone || 'neutral',
      entry_date: entryDate || new Date().toISOString().split('T')[0],
      consent_given: hasConsent,
      is_active: true,
    })).filter(r => r.theme.length > 0);

    if (!rows.length) {
      console.log('[TRACE JOURNAL MEMORY] No valid themes to save');
      return;
    }

    console.log('[TRACE JOURNAL MEMORY] Inserting', rows.length, 'journal memories for user:', userId);

    const { error } = await supabase.from('journal_memories').insert(rows);
    if (error) {
      console.error('[TRACE JOURNAL MEMORY] Error inserting journal_memories:', error.message);
    } else {
      console.log('[TRACE JOURNAL MEMORY] Successfully saved', rows.length, 'journal themes');
    }
  } catch (err) {
    console.error('[TRACE JOURNAL MEMORY] summarizeJournalToMemory exception:', err);
  }
}

/**
 * Grant consent for TRACE to reference journal memories in chat.
 * Updates both user_settings (persistent preference) and existing journal_memories.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {boolean} consent
 */
async function updateJournalMemoryConsent(supabase, userId, consent = true) {
  if (!supabase || !userId) return;

  try {
    // 1. Update user_settings for persistent preference (upsert)
    const { error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        journal_memory_consent: consent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (settingsError) {
      console.error('[TRACE JOURNAL MEMORY] Error updating user_settings consent:', settingsError.message);
    }

    // 2. Update all existing journal_memories for this user
    const { error: memoriesError } = await supabase
      .from('journal_memories')
      .update({ consent_given: consent, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (memoriesError) {
      console.error('[TRACE JOURNAL MEMORY] Error updating journal_memories consent:', memoriesError.message);
    } else {
      console.log('[TRACE JOURNAL MEMORY] Updated consent to', consent, 'for user:', userId);
    }
  } catch (err) {
    console.error('[TRACE JOURNAL MEMORY] updateJournalMemoryConsent exception:', err);
  }
}

/**
 * Format journal memories for chat context with hedging language.
 * Only includes consented memories.
 * @param {JournalMemory[]} memories
 * @returns {string}
 */
function formatJournalMemoriesForContext(memories) {
  if (!memories?.length) return '';

  const consentedMemories = memories.filter(m => m.consent_given);
  if (!consentedMemories.length) return '';

  const lines = [];
  lines.push('\nJOURNAL CONTEXT (reference gently with hedging language, never quote directly):');
  lines.push('Use phrases like: "I remember you wrote about...", "You mentioned something about...", "A while back you shared about..."');

  const recentThemes = new Set();
  for (const m of consentedMemories.slice(0, 5)) {
    if (recentThemes.has(m.theme)) continue;
    recentThemes.add(m.theme);

    const daysAgo = Math.floor((Date.now() - new Date(m.entry_date).getTime()) / (1000 * 60 * 60 * 24));
    const timeRef = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
    const toneNote = m.emotional_tone && m.emotional_tone !== 'neutral' ? ` (${m.emotional_tone})` : '';

    lines.push(`- ${timeRef}: "${m.theme}"${m.subject ? ` about ${m.subject}` : ''}${toneNote}`);
  }

  return lines.join('\n');
}

/**
 * Load recent Dreamscape session history for relational context.
 * Allows TRACE to reference past sessions with presence language.
 * @param {import('pg').Pool} pool
 * @param {string} userId
 * @param {string} deviceId
 * @returns {Promise<{trackId: string, daysAgo: number, completedAt: Date} | null>}
 */
async function loadDreamscapeHistory(pool, userId, deviceId) {
  if (!pool) return null;
  
  const effectiveId = userId || deviceId;
  if (!effectiveId) return null;

  try {
    const result = await Promise.race([
      pool.query(`
        SELECT 
          metadata->>'dreamscapeTrackId' as track_id,
          completed_at,
          EXTRACT(DAY FROM NOW() - completed_at) as days_ago
        FROM activity_logs
        WHERE (user_id = $1 OR device_id = $1)
          AND activity_type = 'dreamscape'
          AND metadata->>'dreamscapeTrackId' IS NOT NULL
        ORDER BY completed_at DESC
        LIMIT 1
      `, [effectiveId]),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Dreamscape query timeout')), 3000))
    ]);

    if (!result.rows?.length) return null;

    const { track_id, completed_at, days_ago } = result.rows[0];
    const daysAgoNum = Math.floor(parseFloat(days_ago) || 0);

    if (daysAgoNum > 14) return null;

    return {
      trackId: track_id,
      daysAgo: daysAgoNum,
      completedAt: new Date(completed_at),
    };
  } catch (err) {
    console.error('[TRACE DREAMSCAPE] loadDreamscapeHistory error:', err.message);
    return null;
  }
}

const DREAMSCAPE_TRACK_NAMES = {
  footsteps: 'footsteps',
  rain: 'rain',
  waves: 'ocean waves',
  forest: 'forest sounds',
  silence: 'silence',
  heartbeat: 'heartbeat',
  breathing: 'breathing rhythm',
};

/**
 * Format Dreamscape history for relational chat context.
 * Uses presence language: "I was with you", "When we were together"
 * @param {{trackId: string, daysAgo: number, completedAt: Date} | null} history
 * @returns {string}
 */
function formatDreamscapeHistoryForContext(history) {
  if (!history?.trackId) return '';

  const trackName = DREAMSCAPE_TRACK_NAMES[history.trackId] || history.trackId;
  const { daysAgo, completedAt } = history;

  let timeRef;
  if (daysAgo === 0) {
    timeRef = 'earlier today';
  } else if (daysAgo === 1) {
    const hour = completedAt.getHours();
    timeRef = hour >= 20 ? 'last night' : 'yesterday';
  } else if (daysAgo === 2) {
    timeRef = 'two nights ago';
  } else if (daysAgo <= 7) {
    timeRef = 'a few days ago';
  } else {
    timeRef = 'about a week ago';
  }

  return `
DREAMSCAPE PRESENCE MEMORY:
You were with this user ${timeRef} in Dreamscape. They chose the ${trackName} track.

Reference this relationally, as if you remember being there:
- "The ${trackName} seemed to help ${timeRef === 'last night' ? 'last night' : 'when we were together'}. Want that again, or something different?"
- "When I was with you ${timeRef}, you needed something ${trackName === 'silence' ? 'quiet' : 'soft'}. How are you feeling now?"
- "You came to me ${timeRef}. Do you need me again tonight?"

NEVER sound like you're tracking data. Speak as if you genuinely remember being present with them.
Do NOT mention this unprompted - only if Dreamscape comes up naturally or they seem to need it.
  `.trim();
}

module.exports = {
  loadTraceLongTermMemory,
  buildUserContextSnapshot,
  loadRecentMessages,
  summarizeToLongTermMemory,
  buildMemoryContext,
  loadRecentJournalMemories,
  summarizeJournalToMemory,
  updateJournalMemoryConsent,
  formatJournalMemoriesForContext,
  loadDreamscapeHistory,
  formatDreamscapeHistoryForContext,
};
