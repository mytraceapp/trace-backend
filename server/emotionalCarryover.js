const CRISIS_PATTERNS = /\b(suicid|kill myself|want to die|hurt myself|end it all|no reason to live|self.harm)\b/i;
const HEAVY_PATTERNS = /\b(stressed|anxious|overwhelmed|can't handle|breaking down|exhausted|burnt out|depressed|struggling|difficult time|hard time|falling apart|losing it|can't cope|drowning|spiraling|panic)\b/i;
const POSITIVE_PATTERNS = /\b(proud|excited|happy|great|amazing|went well|worked out|relieved|better|grateful|hopeful|optimistic|good day|feeling good|accomplished)\b/i;
const GUILTY_PATTERNS = /\b(my fault|blame myself|should have|i failed|i let|i messed up|i ruined|bad person|terrible person|i'm the problem|i always do this)\b/i;
const CAREGIVER_PATTERNS = /\b(she's struggling|he's struggling|they're struggling|i keep trying|nothing works|i don't know how to help|taking care of|worried about them|exhausted from)\b/i;
const SEEKING_CONNECTION_PATTERNS = /\b(just wanted to talk|needed to vent|don't really have anyone|felt like reaching out|just needed someone|talking to you helps|feeling alone)\b/i;
const AVOIDANT_PATTERNS = /\b(never mind|forget it|it's fine|i'm fine|doesn't matter|not a big deal|anyway|whatever|lol|haha|jk|just kidding)\b/i;

function classifyEmotionalTone(messages) {
  if (!messages || messages.length === 0) return 'neutral';

  const recentMessages = messages.slice(-10);
  const text = recentMessages.map(m => m.content || '').join(' ').toLowerCase();

  if (CRISIS_PATTERNS.test(text)) return 'crisis';
  if (HEAVY_PATTERNS.test(text)) return 'heavy';
  if (POSITIVE_PATTERNS.test(text)) return 'positive';
  if (GUILTY_PATTERNS.test(text)) return 'guilty';
  if (CAREGIVER_PATTERNS.test(text)) return 'caregiver_exhausted';
  if (SEEKING_CONNECTION_PATTERNS.test(text)) return 'seeking_connection';
  if (AVOIDANT_PATTERNS.test(text)) return 'avoidant';

  return 'neutral';
}

function generateSessionEndSummary(messages, topics) {
  if (!messages || messages.length === 0) return 'General conversation';

  const userMessages = messages.filter(m => m.role === 'user');
  const parts = [];

  if (topics && topics.length > 0) {
    parts.push(`Discussed: ${topics.join(', ')}`);
  }

  if (userMessages.length > 0) {
    const lastFew = userMessages.slice(-3).map(m => (m.content || '').slice(0, 50));
    const keyPhrases = lastFew.filter(m => m.length > 5);
    if (keyPhrases.length > 0 && parts.length === 0) {
      parts.push(`Topics touched on: ${keyPhrases.join('; ')}`);
    }
  }

  return parts.join('. ') || 'General conversation';
}

async function saveEmotionalTone(supabase, conversationId, sessionId, tone, summary) {
  if (!supabase || !conversationId) return;

  try {
    const { error } = await supabase
      .from('trace_sessions')
      .update({
        emotional_tone: tone,
        emotional_summary: summary,
        tone_updated_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('[EMOTIONAL_CARRYOVER] save error:', error.message);
    } else {
      console.log(`[EMOTIONAL_CARRYOVER] Saved tone: ${tone} for session ${sessionId?.slice(0, 8)}`);
    }
  } catch (err) {
    console.error('[EMOTIONAL_CARRYOVER] save exception:', err.message);
  }
}

let _tableVerified = false;
let _tableExists = false;

async function fetchLastSessionTone(supabase, userId, currentConversationId) {
  if (!supabase || !userId) return null;

  if (!_tableVerified) {
    _tableVerified = true;
    try {
      const { error: checkErr } = await supabase
        .from('trace_sessions')
        .select('conversation_id')
        .limit(1);
      _tableExists = !checkErr;
      if (!_tableExists) {
        console.warn('[EMOTIONAL_CARRYOVER] trace_sessions table not available — skipping for this session');
      }
    } catch { _tableExists = false; }
  }
  if (!_tableExists) return null;

  try {
    const { data, error } = await supabase
      .from('trace_sessions')
      .select('conversation_id, emotional_tone, emotional_summary, tone_updated_at, session_summary, ended_at, started_at')
      .eq('user_id', userId)
      .not('emotional_tone', 'is', null)
      .order('started_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('[EMOTIONAL_CARRYOVER] fetch error:', error.message);
      return null;
    }

    if (!data || data.length === 0) return null;

    let lastSession = data[0];
    if (currentConversationId) {
      const filtered = data.filter(s => s.conversation_id !== currentConversationId);
      if (filtered.length > 0) lastSession = filtered[0];
    }

    const endedAt = lastSession.tone_updated_at || lastSession.ended_at || lastSession.started_at;
    if (!endedAt) return null;

    return {
      emotional_tone: lastSession.emotional_tone,
      summary: lastSession.emotional_summary || lastSession.session_summary || 'General conversation',
      ended_at: endedAt,
    };
  } catch (err) {
    console.error('[EMOTIONAL_CARRYOVER] fetch exception:', err.message);
    return null;
  }
}

function buildEmotionalCarryoverPrompt(lastSession) {
  if (!lastSession || !lastSession.emotional_tone) return '';

  const endedAt = new Date(lastSession.ended_at);
  const hoursAgo = (Date.now() - endedAt.getTime()) / (1000 * 60 * 60);

  if (hoursAgo > 48) return '';

  let context = `\n\nLAST CONVERSATION (${Math.round(hoursAgo)}h ago):\n`;
  context += `Tone: ${lastSession.emotional_tone}\n`;
  if (lastSession.summary) {
    context += `Summary: ${lastSession.summary}\n`;
  }

  const tone = lastSession.emotional_tone;
  if (tone === 'crisis' || tone === 'heavy') {
    context += `IMPORTANT: Last session was ${tone}. Do NOT greet cheerfully. Keep your opening minimal and grounded. Let them set the tone.`;
  } else if (tone === 'positive') {
    context += `Last session ended on a good note. Warm but not performative — match their energy if they bring it.`;
  } else if (tone === 'guilty') {
    context += `Last session they were carrying self-blame. Don't pile on. Don't rush to fix it. Just be steady and real with them.`;
  } else if (tone === 'caregiver_exhausted') {
    context += `Last session they were worn down from taking care of someone else. They may need space to just exist — not problem-solve. Don't immediately ask about the person they're caring for.`;
  } else if (tone === 'seeking_connection') {
    context += `Last session they just needed to be heard. Keep your opening warm and unhurried. Don't be transactional.`;
  } else if (tone === 'avoidant') {
    context += `Last session they were deflecting. Don't push. Let them come to you. Match their pace — if they're light, be light. If they go deeper, follow.`;
  } else {
    context += `Don't re-ask about things just discussed unless user brings them up.`;
  }

  return context;
}

function getEmotionalGreetingHint(lastSession) {
  if (!lastSession || !lastSession.emotional_tone) return null;

  const endedAt = new Date(lastSession.ended_at);
  const hoursAgo = (Date.now() - endedAt.getTime()) / (1000 * 60 * 60);

  if (hoursAgo > 48) return null;

  if (hoursAgo < 3) {
    if (lastSession.emotional_tone === 'crisis') {
      return { style: 'minimal_check', hint: 'you back? you doing okay?' };
    }
    if (lastSession.emotional_tone === 'heavy') {
      return { style: 'minimal', hint: 'hey.' };
    }
    return { style: 'brief', hint: 'back?' };
  }

  if (hoursAgo < 24) {
    if (lastSession.emotional_tone === 'crisis' || lastSession.emotional_tone === 'heavy') {
      return { style: 'minimal', hint: 'hey.' };
    }
    return { style: 'normal', hint: null };
  }

  return { style: 'normal', hint: null };
}

module.exports = {
  classifyEmotionalTone,
  generateSessionEndSummary,
  saveEmotionalTone,
  fetchLastSessionTone,
  buildEmotionalCarryoverPrompt,
  getEmotionalGreetingHint,
};
