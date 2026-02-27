/**
 * TRACE Session Manager
 * Handles session rotation based on 24h/48h gap rules
 */

const { v4: uuidv4 } = require('uuid');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function calculateGapCategory(gapHours) {
  if (gapHours <= 24) return 'same_day';
  if (gapHours <= 48) return 'next_day';
  return 'extended_absence';
}

async function checkAndRotateSession(supabase, conversation, memStore) {
  const now = new Date();
  const lastActivity = new Date(conversation.last_activity_at);
  const gapMs = now - lastActivity;
  const gapHours = Math.floor(gapMs / HOUR_MS);
  const gapCategory = calculateGapCategory(gapHours);

  const result = {
    rotated: false,
    sessionId: conversation.current_session_id,
    gapHours,
    gapCategory,
    triggerSummary: false,
  };

  if (gapMs <= DAY_MS) {
    return result;
  }

  const newSessionId = uuidv4();
  const nowISO = now.toISOString();

  if (!supabase) {
    result.rotated = true;
    result.sessionId = newSessionId;
    result.triggerSummary = true;
    
    if (memStore && conversation.conversation_id) {
      const memConv = memStore.getInMemoryConversation(conversation.conversation_id);
      if (memConv) {
        memConv.current_session_id = newSessionId;
        memConv.session_started_at = nowISO;
        memConv.user_msg_count_since_summary = 0;
      }
    }
    return result;
  }

  try {
    if (conversation.current_session_id) {
      await supabase
        .from('trace_sessions')
        .update({ ended_at: nowISO })
        .eq('session_id', conversation.current_session_id);
    }

    await supabase.from('trace_sessions').insert({
      session_id: newSessionId,
      conversation_id: conversation.conversation_id,
      started_at: nowISO,
    });

    await supabase
      .from('trace_conversations')
      .update({
        current_session_id: newSessionId,
        session_started_at: nowISO,
        user_msg_count_since_summary: 0,
      })
      .eq('conversation_id', conversation.conversation_id);

    result.rotated = true;
    result.sessionId = newSessionId;
    result.triggerSummary = true;
  } catch (err) {
    console.error('[SESSION MANAGER] rotation error:', err.message);
    result.sessionId = newSessionId;
    result.rotated = true;
    result.triggerSummary = true;
  }

  return result;
}

module.exports = {
  checkAndRotateSession,
  calculateGapCategory,
};
