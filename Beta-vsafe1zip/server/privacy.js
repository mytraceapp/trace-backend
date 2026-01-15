/**
 * Privacy by Design Module for TRACE
 * Handles data summarization, export, and deletion
 */

/**
 * Generate a short summary of user content using OpenAI
 * @param {object} openai - OpenAI client
 * @param {string} text - Raw text to summarize
 * @param {string} source - 'chat' | 'journal' | 'activity'
 * @returns {Promise<{summary: string, tags: string[], sentiment: string}>}
 */
async function summarizeContent(openai, text, source = 'chat') {
  if (!openai || !text) {
    return {
      summary: '[content logged]',
      tags: [],
      sentiment: 'neutral'
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a privacy-preserving summarizer. Create a brief, non-identifying summary of user content.
          
Rules:
- Maximum 15 words
- Remove all names, places, specific details
- Focus on emotional theme only (e.g., "discussed work stress", "reflected on relationship")
- Never include quotes or specific content
- Return JSON: {"summary": "...", "tags": ["emotion1", "emotion2"], "sentiment": "positive|negative|neutral|mixed"}`
        },
        {
          role: 'user',
          content: `Summarize this ${source} content in a privacy-preserving way:\n\n${text.slice(0, 500)}`
        }
      ],
      max_tokens: 100,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      summary: result.summary || '[content logged]',
      tags: result.tags || [],
      sentiment: result.sentiment || 'neutral'
    };
  } catch (err) {
    console.error('[PRIVACY] Summarization failed:', err.message);
    return {
      summary: `[${source} entry logged]`,
      tags: [],
      sentiment: 'neutral'
    };
  }
}

/**
 * Store entry with privacy-first defaults
 * @param {object} supabase - Supabase client
 * @param {object} openai - OpenAI client (for summarization)
 * @param {object} params - Entry parameters
 */
async function storePrivacyEntry(supabase, openai, {
  deviceId,
  userId = null,
  text,
  source = 'chat',
  storeRaw = false
}) {
  if (!supabase || !text) {
    console.warn('[PRIVACY] Missing supabase or text');
    return null;
  }

  try {
    const { summary, tags, sentiment } = await summarizeContent(openai, text, source);

    const { data: summaryEntry, error: summaryError } = await supabase
      .from('trace_entries_summary')
      .insert({
        device_id: deviceId,
        user_id: userId,
        summary_text: summary,
        source,
        tags,
        sentiment,
        word_count: text.split(/\s+/).length
      })
      .select()
      .single();

    if (summaryError) {
      console.error('[PRIVACY] Summary insert failed:', summaryError.message);
      return null;
    }

    if (storeRaw && summaryEntry) {
      const { error: rawError } = await supabase
        .from('trace_entries_raw')
        .insert({
          device_id: deviceId,
          user_id: userId,
          raw_text: text,
          source,
          summary_id: summaryEntry.id
        });

      if (rawError) {
        console.error('[PRIVACY] Raw insert failed:', rawError.message);
      }
    }

    console.log(`[PRIVACY] Stored ${source} entry (storeRaw=${storeRaw}):`, summaryEntry?.id);
    return summaryEntry;
  } catch (err) {
    console.error('[PRIVACY] storePrivacyEntry error:', err.message);
    return null;
  }
}

/**
 * Export all data for a device/user
 * @param {object} supabase - Supabase client
 * @param {string} deviceId - Device UUID
 * @param {string} userId - Optional user UUID
 * @returns {Promise<object>} - All user data
 */
async function exportUserData(supabase, deviceId, userId = null) {
  if (!supabase) {
    return { error: 'Database not configured' };
  }

  const effectiveId = userId || deviceId;
  
  const exportData = {
    exported_at: new Date().toISOString(),
    device_id: deviceId,
    user_id: userId,
    summaries: [],
    raw_entries: [],
    chat_messages: [],
    journal_entries: [],
    patterns: [],
    mood_checkins: [],
    activity_logs: [],
    journal_memories: [],
    settings: null
  };

  try {
    const { data: summaries } = await supabase
      .from('trace_entries_summary')
      .select('*')
      .or(`device_id.eq.${deviceId}${userId ? `,user_id.eq.${userId}` : ''}`);
    exportData.summaries = summaries || [];

    const { data: rawEntries } = await supabase
      .from('trace_entries_raw')
      .select('*')
      .or(`device_id.eq.${deviceId}${userId ? `,user_id.eq.${userId}` : ''}`);
    exportData.raw_entries = rawEntries || [];

    const { data: chatMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', effectiveId);
    exportData.chat_messages = chatMessages || [];

    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', effectiveId);
    exportData.journal_entries = journalEntries || [];

    const { data: patterns } = await supabase
      .from('user_patterns_cache')
      .select('*')
      .eq('user_id', effectiveId);
    exportData.patterns = patterns || [];

    const { data: moods } = await supabase
      .from('mood_checkins')
      .select('*')
      .eq('user_id', effectiveId);
    exportData.mood_checkins = moods || [];

    const { data: activities } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', effectiveId);
    exportData.activity_logs = activities || [];

    const { data: memories } = await supabase
      .from('journal_memories')
      .select('*')
      .eq('user_id', effectiveId);
    exportData.journal_memories = memories || [];

    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', effectiveId)
      .single();
    exportData.settings = settings || null;

  } catch (err) {
    console.error('[PRIVACY] Export error:', err.message);
  }

  return exportData;
}

/**
 * Delete all data for a device/user
 * @param {object} supabase - Supabase client
 * @param {string} deviceId - Device UUID
 * @param {string} userId - Optional user UUID
 * @returns {Promise<object>} - Deletion results
 */
async function deleteUserData(supabase, deviceId, userId = null) {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  const results = {
    success: true,
    deleted: {}
  };

  const tablesToDelete = [
    { name: 'trace_entries_raw', idField: 'device_id' },
    { name: 'trace_entries_summary', idField: 'device_id' },
    { name: 'chat_messages', idField: 'user_id' },
    { name: 'journal_entries', idField: 'user_id' },
    { name: 'user_patterns_cache', idField: 'user_id' },
    { name: 'mood_checkins', idField: 'user_id' },
    { name: 'activity_logs', idField: 'user_id' },
    { name: 'journal_memories', idField: 'user_id' },
    { name: 'activity_reflection_state', idField: 'user_id' },
    { name: 'user_settings', idField: 'user_id' },
    { name: 'welcome_history', idField: 'user_id' }
  ];

  for (const table of tablesToDelete) {
    try {
      const idValue = table.idField === 'device_id' ? deviceId : (userId || deviceId);
      
      const { data, error } = await supabase
        .from(table.name)
        .delete()
        .eq(table.idField, idValue)
        .select('id');

      if (error && !error.message.includes('does not exist')) {
        console.warn(`[PRIVACY DELETE] ${table.name}:`, error.message);
        results.deleted[table.name] = { error: error.message };
      } else {
        results.deleted[table.name] = { count: data?.length || 0 };
        console.log(`[PRIVACY DELETE] ${table.name}: ${data?.length || 0} rows`);
      }
    } catch (err) {
      console.warn(`[PRIVACY DELETE] ${table.name} skipped:`, err.message);
      results.deleted[table.name] = { skipped: true };
    }
  }

  return results;
}

module.exports = {
  summarizeContent,
  storePrivacyEntry,
  exportUserData,
  deleteUserData
};
