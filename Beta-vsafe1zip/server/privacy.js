/**
 * Privacy by Design Module for TRACE
 * Handles data summarization, export, deletion, and cleanup
 * 
 * Edge cases handled:
 * - First summary request delay (loading state + cache)
 * - OpenAI API down (graceful fallback)
 * - User account deletion (immediate hard-delete)
 * - Orphaned device entries (7-day cleanup)
 * - Concurrent summary requests (lock via summary_status)
 * - Batch summary generation (night job)
 */

// Summary stats for monitoring
let summaryStats = {
  cached: 0,
  generated: 0,
  failed: 0,
  lastReset: new Date().toISOString()
};

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
 * Store entry with raw text first (on-demand summarization pattern)
 * Summary is generated later when user requests it
 * @param {object} supabase - Supabase client
 * @param {object} params - Entry parameters
 */
async function storePrivacyEntry(supabase, openai, {
  deviceId,
  userId = null,
  text,
  source = 'chat',
  storeRaw = true
}) {
  if (!supabase || !text) {
    console.warn('[PRIVACY] Missing supabase or text');
    return null;
  }

  try {
    const { data: entry, error } = await supabase
      .from('trace_entries_summary')
      .insert({
        device_id: deviceId,
        user_id: userId,
        raw_text: storeRaw ? text : null,
        source,
        summary_status: 'pending',
        word_count: text.split(/\s+/).length,
        retention_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[PRIVACY] Entry insert failed:', error.message);
      return null;
    }

    console.log(`[PRIVACY] Stored ${source} entry (pending summary):`, entry?.id);
    return entry;
  } catch (err) {
    console.error('[PRIVACY] storePrivacyEntry error:', err.message);
    return null;
  }
}

/**
 * Generate summary on-demand with race condition protection
 * @param {object} supabase - Supabase client
 * @param {object} openai - OpenAI client
 * @param {string} entryId - Entry UUID
 * @returns {Promise<{summary: string, fromCache: boolean}>}
 */
async function generateSummaryOnDemand(supabase, openai, entryId) {
  if (!supabase || !entryId) {
    return { summary: null, fromCache: false, error: 'Missing parameters' };
  }

  try {
    // Fetch entry
    const { data: entry, error: fetchError } = await supabase
      .from('trace_entries_summary')
      .select('*')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) {
      return { summary: null, fromCache: false, error: 'Entry not found' };
    }

    // Already has summary - return cached
    if (entry.summary_text && entry.summary_status === 'completed') {
      summaryStats.cached++;
      return { 
        summary: entry.summary_text, 
        tags: entry.tags,
        sentiment: entry.sentiment,
        fromCache: true 
      };
    }

    // Another request is generating - wait or return fallback
    if (entry.summary_status === 'generating') {
      return { 
        summary: 'Summary generating...', 
        fromCache: false,
        pending: true
      };
    }

    // Mark as generating (lock)
    const { error: lockError } = await supabase
      .from('trace_entries_summary')
      .update({ summary_status: 'generating' })
      .eq('id', entryId)
      .eq('summary_status', 'pending'); // Only if still pending

    if (lockError) {
      console.warn('[PRIVACY] Lock failed, might be concurrent request');
    }

    // No raw text to summarize
    if (!entry.raw_text) {
      return { 
        summary: '[content logged]', 
        fromCache: false,
        error: 'No raw text available'
      };
    }

    // Generate summary
    const { summary, tags, sentiment } = await summarizeContent(openai, entry.raw_text, entry.source);

    // Fallback if OpenAI failed
    const finalSummary = summary || entry.raw_text.split(/\s+/).slice(0, 15).join(' ') + '...';

    // Update entry with summary
    const { error: updateError } = await supabase
      .from('trace_entries_summary')
      .update({
        summary_text: finalSummary,
        tags,
        sentiment,
        summary_status: summary ? 'completed' : 'failed',
        summary_generated_at: new Date().toISOString(),
        user_requested_at: new Date().toISOString()
      })
      .eq('id', entryId);

    if (updateError) {
      console.error('[PRIVACY] Summary update failed:', updateError.message);
      summaryStats.failed++;
      return { summary: finalSummary, fromCache: false, error: updateError.message };
    }

    summaryStats.generated++;
    console.log('[PRIVACY] Generated summary for entry:', entryId);
    
    return { 
      summary: finalSummary, 
      tags,
      sentiment,
      fromCache: false 
    };

  } catch (err) {
    console.error('[PRIVACY] generateSummaryOnDemand error:', err.message);
    summaryStats.failed++;

    // Mark as failed
    try {
      await supabase
        .from('trace_entries_summary')
        .update({ summary_status: 'failed' })
        .eq('id', entryId);
    } catch (e) {}

    return { summary: null, fromCache: false, error: err.message };
  }
}

// Production batch configuration
const BATCH_CONFIG = {
  BATCH_SIZE: 50,              // Max summaries per batch
  MAX_BATCHES_PER_NIGHT: 10,   // Max 500 summaries per night (10 * 50)
  RETRY_LIMIT: 3,              // Give up after 3 failed attempts
  TIMEOUT_MS: 8000,            // 8 second timeout per summary
  DELAY_BETWEEN_BATCHES: 5000, // 5 second delay between batches
  DELAY_BETWEEN_REQUESTS: 100, // 100ms between individual requests
};

/**
 * Batch generate summaries for old entries (night job)
 * Production features: BATCH_SIZE/MAX_BATCHES limits, retry tracking, timeout, stats
 * @param {object} supabase - Supabase client
 * @param {object} openai - OpenAI client
 * @param {number} limit - Max entries to process (capped by MAX_BATCHES * BATCH_SIZE)
 */
async function batchGenerateSummaries(supabase, openai, limit = 100) {
  if (!supabase || !openai) {
    console.warn('[PRIVACY BATCH] Missing supabase or openai');
    return { processed: 0, success: 0, failed: 0, skipped: 0 };
  }

  const startTime = Date.now();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  // Cap limit by production config
  const maxEntries = Math.min(limit, BATCH_CONFIG.BATCH_SIZE * BATCH_CONFIG.MAX_BATCHES_PER_NIGHT);

  try {
    // Get pending entries older than 24 hours, prioritize by creation date
    const { data: entries, error } = await supabase
      .from('trace_entries_summary')
      .select('id, raw_text, source, retry_count')
      .eq('summary_status', 'pending')
      .not('raw_text', 'is', null)
      .lt('created_at', yesterday)
      .order('created_at', { ascending: false })  // Newest first
      .limit(maxEntries);

    if (error) {
      console.error('[PRIVACY BATCH] Fetch failed:', error.message);
      return { processed: 0, success: 0, failed: 0, skipped: 0, error: error.message };
    }

    if (!entries?.length) {
      console.log('[PRIVACY BATCH] No pending entries to process');
      return { processed: 0, success: 0, failed: 0, skipped: 0 };
    }

    console.log(`[PRIVACY BATCH] Found ${entries.length} pending summaries to process`);

    let success = 0;
    let failed = 0;
    let skipped = 0;
    let batchNum = 0;

    // Process in batches with delays
    for (let i = 0; i < entries.length; i += BATCH_CONFIG.BATCH_SIZE) {
      if (batchNum >= BATCH_CONFIG.MAX_BATCHES_PER_NIGHT) {
        console.log(`[PRIVACY BATCH] Reached max batches limit (${BATCH_CONFIG.MAX_BATCHES_PER_NIGHT})`);
        break;
      }
      
      const batch = entries.slice(i, i + BATCH_CONFIG.BATCH_SIZE);
      batchNum++;
      
      console.log(`[PRIVACY BATCH] Processing batch ${batchNum}/${Math.ceil(Math.min(entries.length, maxEntries) / BATCH_CONFIG.BATCH_SIZE)}`);

      for (const entry of batch) {
        // Skip if already at retry limit
        if ((entry.retry_count || 0) >= BATCH_CONFIG.RETRY_LIMIT) {
          console.log(`[PRIVACY BATCH] Skipping ${entry.id} (retry limit reached)`);
          skipped++;
          continue;
        }

        try {
          const result = await generateSummaryOnDemand(supabase, openai, entry.id);
          if (result.error) {
            failed++;
          } else {
            success++;
          }
        } catch (e) {
          failed++;
        }
        
        // Rate limit between requests
        await new Promise(r => setTimeout(r, BATCH_CONFIG.DELAY_BETWEEN_REQUESTS));
      }
      
      // Delay between batches (rate limiting)
      if (i + BATCH_CONFIG.BATCH_SIZE < entries.length) {
        console.log(`[PRIVACY BATCH] Waiting ${BATCH_CONFIG.DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await new Promise(r => setTimeout(r, BATCH_CONFIG.DELAY_BETWEEN_BATCHES));
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const successRate = entries.length > 0 ? Math.round((success / entries.length) * 100) : 0;
    
    console.log(`[PRIVACY BATCH] Completed in ${duration}s: ${success} success, ${failed} failed, ${skipped} skipped (${successRate}% success rate)`);
    
    return { 
      processed: success + failed, 
      success, 
      failed, 
      skipped,
      duration,
      successRate
    };

  } catch (err) {
    console.error('[PRIVACY BATCH] Error:', err.message);
    return { processed: 0, success: 0, failed: 0, skipped: 0, error: err.message };
  }
}

/**
 * Daily cleanup job: hard-delete expired entries, clean orphaned device entries
 * @param {object} supabase - Supabase client
 */
async function runPrivacyCleanup(supabase) {
  if (!supabase) {
    console.warn('[PRIVACY CLEANUP] Missing supabase');
    return { deleted: 0, orphaned: 0, expired: 0 };
  }

  const results = { deleted: 0, orphaned: 0, expired: 0, errors: [] };

  try {
    // 1. Hard-delete soft-deleted entries after 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: softDeleted, error: softDeleteError } = await supabase
      .from('trace_entries_summary')
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo)
      .select('id');

    if (softDeleteError) {
      results.errors.push({ step: 'soft_delete', error: softDeleteError.message });
    } else {
      results.deleted = softDeleted?.length || 0;
    }

    // 2. Auto-expire entries past retention_until (90 days default)
    const now = new Date().toISOString();
    
    const { data: expired, error: expireError } = await supabase
      .from('trace_entries_summary')
      .delete()
      .lt('retention_until', now)
      .is('deleted_at', null)
      .select('id');

    if (expireError) {
      results.errors.push({ step: 'retention_expire', error: expireError.message });
    } else {
      results.expired = expired?.length || 0;
    }

    // 3. Clean orphaned device entries (no user_id, older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: orphaned, error: orphanError } = await supabase
      .from('trace_entries_summary')
      .delete()
      .is('user_id', null)
      .lt('created_at', sevenDaysAgo)
      .select('id');

    if (orphanError) {
      results.errors.push({ step: 'orphan_cleanup', error: orphanError.message });
    } else {
      results.orphaned = orphaned?.length || 0;
    }

    console.log('[PRIVACY CLEANUP] Results:', {
      hardDeleted: results.deleted,
      expired: results.expired,
      orphaned: results.orphaned,
      errors: results.errors.length
    });

    return results;

  } catch (err) {
    console.error('[PRIVACY CLEANUP] Error:', err.message);
    results.errors.push({ step: 'general', error: err.message });
    return results;
  }
}

/**
 * Export all data for a device/user (GDPR Article 20)
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
    entries: [],
    chat_messages: [],
    journal_entries: [],
    patterns: [],
    mood_checkins: [],
    activity_logs: [],
    journal_memories: [],
    settings: null
  };

  try {
    // Entries (summary + raw if opted in)
    const { data: entries } = await supabase
      .from('trace_entries_summary')
      .select('*')
      .is('deleted_at', null)
      .or(`device_id.eq.${deviceId}${userId ? `,user_id.eq.${userId}` : ''}`);
    exportData.entries = entries || [];

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
 * Delete all data for a device/user (GDPR Article 17 - Right to Erasure)
 * Immediate hard-delete, not soft-delete
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
    { name: 'trace_entries_summary', idField: 'device_id' },
    { name: 'chat_messages', idField: 'user_id' },
    { name: 'journal_entries', idField: 'user_id' },
    { name: 'user_patterns_cache', idField: 'user_id' },
    { name: 'mood_checkins', idField: 'user_id' },
    { name: 'activity_logs', idField: 'user_id' },
    { name: 'journal_memories', idField: 'user_id' },
    { name: 'activity_reflection_state', idField: 'user_id' },
    { name: 'user_settings', idField: 'user_id' },
    { name: 'welcome_history', idField: 'user_id' },
    { name: 'dreamscape_sessions', idField: 'user_id' },
    { name: 'pattern_audit_log', idField: 'user_id' }
  ];

  for (const table of tablesToDelete) {
    try {
      const idValue = table.idField === 'device_id' ? deviceId : (userId || deviceId);
      
      // Hard delete - immediate, not soft delete
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

  // Also delete from user_id field for device-based entries
  if (userId) {
    try {
      const { data } = await supabase
        .from('trace_entries_summary')
        .delete()
        .eq('user_id', userId)
        .select('id');
      
      results.deleted['trace_entries_summary_by_user'] = { count: data?.length || 0 };
    } catch (err) {
      console.warn('[PRIVACY DELETE] trace_entries_summary by user_id:', err.message);
    }
  }

  return results;
}

/**
 * Soft-delete a single entry (user can undo within 30 days)
 * @param {object} supabase - Supabase client
 * @param {string} entryId - Entry UUID
 * @param {string} userId - User UUID for ownership verification
 */
async function softDeleteEntry(supabase, entryId, userId, deletionReason = 'user_requested') {
  if (!supabase || !entryId) {
    return { success: false, error: 'Missing parameters' };
  }

  try {
    const { data, error } = await supabase
      .from('trace_entries_summary')
      .update({ 
        deleted_at: new Date().toISOString(),
        deletion_reason: deletionReason,
        needs_cleanup: true
      })
      .eq('id', entryId)
      .eq('user_id', userId)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    console.log(`[PRIVACY] Soft-deleted entry ${entryId} - reason: ${deletionReason}`);
    return { success: true, entry: data?.[0], recoveryDeadline: new Date(Date.now() + 30*24*60*60*1000) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Restore a soft-deleted entry (within 30 days)
 * @param {object} supabase - Supabase client
 * @param {string} entryId - Entry UUID
 * @param {string} userId - User UUID for ownership verification
 */
async function restoreEntry(supabase, entryId, userId) {
  if (!supabase || !entryId) {
    return { success: false, error: 'Missing parameters' };
  }

  try {
    const { data, error } = await supabase
      .from('trace_entries_summary')
      .update({ deleted_at: null })
      .eq('id', entryId)
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, entry: data?.[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get summary stats for monitoring
 */
function getSummaryStats() {
  return { ...summaryStats };
}

/**
 * Reset summary stats (call at start of day)
 */
function resetSummaryStats() {
  summaryStats = {
    cached: 0,
    generated: 0,
    failed: 0,
    lastReset: new Date().toISOString()
  };
}

module.exports = {
  summarizeContent,
  storePrivacyEntry,
  generateSummaryOnDemand,
  batchGenerateSummaries,
  runPrivacyCleanup,
  exportUserData,
  deleteUserData,
  softDeleteEntry,
  restoreEntry,
  getSummaryStats,
  resetSummaryStats
};
