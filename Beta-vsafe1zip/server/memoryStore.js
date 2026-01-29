/**
 * TRACE Core Memory Store
 * In-memory fallback + Supabase persistence layer
 */

const { v4: uuidv4, validate: uuidValidate } = require('uuid');

const mem = {
  conversations: new Map(),
  pendingWrites: new Map(),
  locks: new Map(),
};

const MAX_MESSAGES_IN_MEMORY = 200;
const MAX_SESSION_SUMMARIES = 3;

function getOrCreateConversation(conversationId) {
  if (!mem.conversations.has(conversationId)) {
    const sessionId = uuidv4();
    mem.conversations.set(conversationId, {
      conversation_id: conversationId,
      current_session_id: sessionId,
      session_started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      user_msg_count_since_extraction: 0,
      user_msg_count_since_summary: 0,
      messages: [],
      core_memory: null,
      session_summaries: [],
    });
  }
  return mem.conversations.get(conversationId);
}

function validateOrGenerateConversationId(clientId) {
  if (clientId && uuidValidate(clientId)) {
    return clientId;
  }
  return uuidv4();
}

async function ensureConversation(supabase, conversationId) {
  const validId = validateOrGenerateConversationId(conversationId);
  
  if (!supabase) {
    return { conversation: getOrCreateConversation(validId), conversationId: validId };
  }

  try {
    await flushPendingWrites(supabase, validId);
    
    const { data: existing } = await supabase
      .from('trace_conversations')
      .select('*')
      .eq('conversation_id', validId)
      .single();

    if (existing) {
      return { conversation: existing, conversationId: validId };
    }

    const sessionId = uuidv4();
    const now = new Date().toISOString();

    await supabase.from('trace_sessions').insert({
      session_id: sessionId,
      conversation_id: validId,
      started_at: now,
    });

    const { data: newConv } = await supabase
      .from('trace_conversations')
      .insert({
        conversation_id: validId,
        current_session_id: sessionId,
        session_started_at: now,
        last_activity_at: now,
      })
      .select()
      .single();

    return { conversation: newConv || getOrCreateConversation(validId), conversationId: validId };
  } catch (err) {
    console.error('[MEMORY STORE] ensureConversation error:', err.message);
    return { conversation: getOrCreateConversation(validId), conversationId: validId };
  }
}

async function saveMessage(supabase, conversationId, sessionId, role, content) {
  const msg = {
    conversation_id: conversationId,
    session_id: sessionId,
    role,
    content,
    created_at: new Date().toISOString(),
  };

  const memConv = getOrCreateConversation(conversationId);
  memConv.messages.push(msg);
  if (memConv.messages.length > MAX_MESSAGES_IN_MEMORY) {
    memConv.messages = memConv.messages.slice(-MAX_MESSAGES_IN_MEMORY);
  }
  memConv.last_activity_at = msg.created_at;

  if (role === 'user') {
    memConv.user_msg_count_since_extraction++;
    memConv.user_msg_count_since_summary++;
  }

  if (!supabase) return;

  try {
    const { error } = await supabase.from('trace_messages').insert(msg);
    if (error) throw error;

    await supabase
      .from('trace_conversations')
      .update({
        last_activity_at: msg.created_at,
        user_msg_count_since_extraction: memConv.user_msg_count_since_extraction,
        user_msg_count_since_summary: memConv.user_msg_count_since_summary,
      })
      .eq('conversation_id', conversationId);
  } catch (err) {
    console.error('[MEMORY STORE] saveMessage error:', err.message);
    queuePendingWrite(conversationId, 'message', msg);
  }
}

async function fetchRecentMessages(supabase, conversationId, limit = 30) {
  if (!supabase) {
    const memConv = mem.conversations.get(conversationId);
    return memConv?.messages?.slice(-limit) || [];
  }

  try {
    const { data, error } = await supabase
      .from('trace_messages')
      .select('role, content, created_at, session_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).reverse();
  } catch (err) {
    console.error('[MEMORY STORE] fetchRecentMessages error:', err.message);
    const memConv = mem.conversations.get(conversationId);
    return memConv?.messages?.slice(-limit) || [];
  }
}

async function fetchCoreMemory(supabase, conversationId) {
  if (!supabase) {
    const memConv = mem.conversations.get(conversationId);
    return memConv?.core_memory || null;
  }

  try {
    const { data, error } = await supabase
      .from('trace_memory_core')
      .select('core_memory, updated_at')
      .eq('conversation_id', conversationId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.core_memory || null;
  } catch (err) {
    console.error('[MEMORY STORE] fetchCoreMemory error:', err.message);
    const memConv = mem.conversations.get(conversationId);
    return memConv?.core_memory || null;
  }
}

async function saveCoreMemory(supabase, conversationId, coreMemory) {
  const memConv = getOrCreateConversation(conversationId);
  memConv.core_memory = coreMemory;

  if (!supabase) {
    console.warn('[MEMORY STORE] FALLBACK: skipping core memory persistence (no Supabase)');
    return;
  }

  try {
    const { error } = await supabase
      .from('trace_memory_core')
      .upsert({
        conversation_id: conversationId,
        core_memory: coreMemory,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    await supabase
      .from('trace_conversations')
      .update({
        extraction_pending: false,
        user_msg_count_since_extraction: 0,
      })
      .eq('conversation_id', conversationId);

    memConv.user_msg_count_since_extraction = 0;
  } catch (err) {
    console.error('[MEMORY STORE] saveCoreMemory error:', err.message);
    queuePendingWrite(conversationId, 'core_memory', coreMemory);
  }
}

async function fetchSessionSummaries(supabase, conversationId, limit = 3) {
  if (!supabase) {
    const memConv = mem.conversations.get(conversationId);
    return memConv?.session_summaries?.slice(-limit) || [];
  }

  try {
    const { data, error } = await supabase
      .from('trace_sessions')
      .select('session_id, session_summary, summary_updated_at')
      .eq('conversation_id', conversationId)
      .not('session_summary', 'is', null)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(s => ({
      session_id: s.session_id,
      summary: s.session_summary,
      updated_at: s.summary_updated_at,
    }));
  } catch (err) {
    console.error('[MEMORY STORE] fetchSessionSummaries error:', err.message);
    const memConv = mem.conversations.get(conversationId);
    return memConv?.session_summaries?.slice(-limit) || [];
  }
}

async function saveSessionSummary(supabase, conversationId, sessionId, summary) {
  const memConv = getOrCreateConversation(conversationId);
  const summaryObj = {
    session_id: sessionId,
    summary,
    updated_at: new Date().toISOString(),
  };

  memConv.session_summaries.push(summaryObj);
  if (memConv.session_summaries.length > MAX_SESSION_SUMMARIES) {
    memConv.session_summaries = memConv.session_summaries.slice(-MAX_SESSION_SUMMARIES);
  }

  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('trace_sessions')
      .update({
        session_summary: summary,
        summary_updated_at: summaryObj.updated_at,
      })
      .eq('session_id', sessionId);

    if (error) throw error;

    await supabase
      .from('trace_conversations')
      .update({
        summary_pending: false,
        user_msg_count_since_summary: 0,
      })
      .eq('conversation_id', conversationId);

    memConv.user_msg_count_since_summary = 0;
  } catch (err) {
    console.error('[MEMORY STORE] saveSessionSummary error:', err.message);
    queuePendingWrite(conversationId, 'session_summary', summaryObj);
  }
}

async function setExtractionPending(supabase, conversationId, pending = true) {
  if (!supabase) return;
  try {
    await supabase
      .from('trace_conversations')
      .update({ extraction_pending: pending })
      .eq('conversation_id', conversationId);
  } catch (err) {
    console.error('[MEMORY STORE] setExtractionPending error:', err.message);
  }
}

async function setSummaryPending(supabase, conversationId, pending = true) {
  if (!supabase) return;
  try {
    await supabase
      .from('trace_conversations')
      .update({ summary_pending: pending })
      .eq('conversation_id', conversationId);
  } catch (err) {
    console.error('[MEMORY STORE] setSummaryPending error:', err.message);
  }
}

function acquireLock(conversationId, lockType) {
  const key = `${conversationId}:${lockType}`;
  if (mem.locks.get(key)) return false;
  mem.locks.set(key, true);
  return true;
}

function releaseLock(conversationId, lockType) {
  const key = `${conversationId}:${lockType}`;
  mem.locks.delete(key);
}

function queuePendingWrite(conversationId, type, data) {
  if (!mem.pendingWrites.has(conversationId)) {
    mem.pendingWrites.set(conversationId, {
      messages: [],
      core_memory_upsert: null,
      session_summary_upserts: [],
      last_attempt_at: null,
      attempts: 0,
    });
  }

  const queue = mem.pendingWrites.get(conversationId);
  if (type === 'message') {
    queue.messages.push(data);
  } else if (type === 'core_memory') {
    queue.core_memory_upsert = data;
  } else if (type === 'session_summary') {
    queue.session_summary_upserts.push(data);
  }
}

async function flushPendingWrites(supabase, conversationId) {
  if (!supabase) return;
  const queue = mem.pendingWrites.get(conversationId);
  if (!queue) return;

  try {
    if (queue.messages.length > 0) {
      const { error } = await supabase.from('trace_messages').insert(queue.messages);
      if (!error) queue.messages = [];
    }

    if (queue.core_memory_upsert) {
      const { error } = await supabase
        .from('trace_memory_core')
        .upsert({
          conversation_id: conversationId,
          core_memory: queue.core_memory_upsert,
          updated_at: new Date().toISOString(),
        });
      if (!error) queue.core_memory_upsert = null;
    }

    for (const s of queue.session_summary_upserts) {
      await supabase
        .from('trace_sessions')
        .update({ session_summary: s.summary, summary_updated_at: s.updated_at })
        .eq('session_id', s.session_id);
    }
    queue.session_summary_upserts = [];

    if (!queue.messages.length && !queue.core_memory_upsert && !queue.session_summary_upserts.length) {
      mem.pendingWrites.delete(conversationId);
    }
  } catch (err) {
    console.error('[MEMORY STORE] flushPendingWrites error:', err.message);
    queue.last_attempt_at = new Date().toISOString();
    queue.attempts++;
  }
}

function getInMemoryConversation(conversationId) {
  return mem.conversations.get(conversationId);
}

module.exports = {
  validateOrGenerateConversationId,
  ensureConversation,
  saveMessage,
  fetchRecentMessages,
  fetchCoreMemory,
  saveCoreMemory,
  fetchSessionSummaries,
  saveSessionSummary,
  setExtractionPending,
  setSummaryPending,
  acquireLock,
  releaseLock,
  flushPendingWrites,
  getInMemoryConversation,
};
