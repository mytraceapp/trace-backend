/**
 * TRACE Core Memory System
 * Extraction, validation, and context assembly
 */

const memoryStore = require('./memoryStore');

const EXTRACTION_THRESHOLD = 10;
const SUMMARY_THRESHOLD = 25;

const CORE_MEMORY_CAPS = {
  user_facts: 12,
  goals: 10,
  constraints: 10,
  commitments: 10,
  themes: 5,
  emotion_timeline: 5,
  contradictions: 10,
};

const TRIMMED_CAPS = {
  user_facts: 5,
  goals: 3,
  constraints: 3,
  commitments: 3,
  themes: 3,
  emotion_timeline: 3,
};

function validateCoreMemory(raw) {
  const validated = {
    user_facts: [],
    goals: [],
    constraints: [],
    commitments: [],
    themes: [],
    emotion_timeline: [],
    contradictions: [],
    updated_at: new Date().toISOString(),
  };

  if (Array.isArray(raw.user_facts)) {
    validated.user_facts = raw.user_facts
      .filter(f => typeof f === 'string')
      .slice(0, CORE_MEMORY_CAPS.user_facts);
  }

  if (Array.isArray(raw.goals)) {
    validated.goals = raw.goals
      .filter(g => g?.text)
      .slice(0, CORE_MEMORY_CAPS.goals)
      .map(g => ({ text: g.text, started_at: g.started_at || new Date().toISOString() }));
  }

  if (Array.isArray(raw.constraints)) {
    validated.constraints = raw.constraints
      .filter(c => c?.description)
      .slice(0, CORE_MEMORY_CAPS.constraints)
      .map(c => ({
        type: ['time', 'money', 'health', 'family', 'work', 'other'].includes(c.type) ? c.type : 'other',
        description: c.description,
      }));
  }

  if (Array.isArray(raw.commitments)) {
    validated.commitments = raw.commitments
      .filter(c => c?.text)
      .slice(0, CORE_MEMORY_CAPS.commitments)
      .map(c => ({ text: c.text, date: c.date || null }));
  }

  if (Array.isArray(raw.themes)) {
    validated.themes = raw.themes
      .filter(t => typeof t === 'string')
      .slice(0, CORE_MEMORY_CAPS.themes);
  }

  if (Array.isArray(raw.emotion_timeline)) {
    validated.emotion_timeline = raw.emotion_timeline
      .filter(e => e?.emotion)
      .slice(-CORE_MEMORY_CAPS.emotion_timeline)
      .map(e => ({
        emotion: e.emotion,
        context: e.context || '',
        timestamp: e.timestamp || new Date().toISOString(),
      }));
  }

  if (Array.isArray(raw.contradictions)) {
    validated.contradictions = raw.contradictions
      .slice(0, CORE_MEMORY_CAPS.contradictions);
  }

  return validated;
}

function mergeCoreMemory(existing, extracted) {
  if (!existing) return validateCoreMemory(extracted);

  const merged = { ...existing };

  if (extracted.user_facts?.length) {
    const newFacts = extracted.user_facts.filter(
      f => !existing.user_facts?.includes(f)
    );
    merged.user_facts = [...(existing.user_facts || []), ...newFacts]
      .slice(-CORE_MEMORY_CAPS.user_facts);
  }

  if (extracted.goals?.length) {
    merged.goals = [...(existing.goals || []), ...extracted.goals]
      .slice(-CORE_MEMORY_CAPS.goals);
  }

  if (extracted.themes?.length) {
    const newThemes = extracted.themes.filter(
      t => !existing.themes?.includes(t)
    );
    merged.themes = [...(existing.themes || []), ...newThemes]
      .slice(-CORE_MEMORY_CAPS.themes);
  }

  if (extracted.emotion_timeline?.length) {
    merged.emotion_timeline = [
      ...(existing.emotion_timeline || []),
      ...extracted.emotion_timeline,
    ].slice(-CORE_MEMORY_CAPS.emotion_timeline);
  }

  merged.updated_at = new Date().toISOString();
  return validateCoreMemory(merged);
}

async function runExtraction(openai, supabase, conversationId, messages) {
  if (!openai) {
    console.warn('[CORE MEMORY] No OpenAI client for extraction');
    return;
  }

  if (!memoryStore.acquireLock(conversationId, 'extraction')) {
    console.log('[CORE MEMORY] Extraction already running for:', conversationId);
    return;
  }

  try {
    await memoryStore.setExtractionPending(supabase, conversationId, true);

    const userMessages = messages
      .filter(m => m.role === 'user')
      .slice(-20)
      .map(m => m.content)
      .join('\n\n');

    if (userMessages.length < 100) {
      console.log('[CORE MEMORY] Not enough content for extraction');
      return;
    }

    const prompt = `Extract stable user information from these messages. Return JSON:
{
  "user_facts": ["string facts about user, max 12"],
  "goals": [{"text": "goal", "started_at": "ISO date"}],
  "constraints": [{"type": "time|money|health|family|work|other", "description": "..."}],
  "themes": ["recurring topics, max 5"],
  "emotion_timeline": [{"emotion": "word", "context": "brief", "timestamp": "ISO"}]
}

Only include what's clearly stated. Keep facts concise.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userMessages },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const extracted = JSON.parse(rawContent);

    const existingMemory = await memoryStore.fetchCoreMemory(supabase, conversationId);
    const merged = mergeCoreMemory(existingMemory, extracted);

    await memoryStore.saveCoreMemory(supabase, conversationId, merged);
    console.log('[CORE MEMORY] Extraction complete for:', conversationId);
  } catch (err) {
    console.error('[CORE MEMORY] Extraction error:', err.message);
  } finally {
    memoryStore.releaseLock(conversationId, 'extraction');
  }
}

async function runSessionSummary(openai, supabase, conversationId, sessionId, messages) {
  if (!openai) return;

  if (!memoryStore.acquireLock(conversationId, 'summary')) {
    console.log('[CORE MEMORY] Summary already running for:', conversationId);
    return;
  }

  try {
    await memoryStore.setSummaryPending(supabase, conversationId, true);

    const sessionMessages = messages
      .filter(m => m.session_id === sessionId)
      .slice(-50)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    if (sessionMessages.length < 100) {
      return;
    }

    const prompt = `Summarize this conversation session in 2-3 sentences. Focus on key topics discussed, user's emotional state, and any decisions or realizations. Keep it warm but concise.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: sessionMessages },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (summary) {
      await memoryStore.saveSessionSummary(supabase, conversationId, sessionId, summary);
      console.log('[CORE MEMORY] Session summary saved for:', sessionId);
    }
  } catch (err) {
    console.error('[CORE MEMORY] Session summary error:', err.message);
  } finally {
    memoryStore.releaseLock(conversationId, 'summary');
  }
}

function computeContinuityVector(coreMemory, recentUserMessages) {
  const themes = coreMemory?.themes || [];
  const last10 = recentUserMessages.slice(-10);

  let primaryTheme = 'general';

  if (themes.length > 0) {
    const counts = themes.map(t => ({
      theme: t,
      count: last10.filter(m =>
        m.content?.toLowerCase().includes(t.toLowerCase())
      ).length,
    }));

    const best = counts.sort((a, b) => b.count - a.count)[0];
    if (best && best.count > 0) {
      primaryTheme = best.theme;
    }
  }

  const recentEmotion = coreMemory?.emotion_timeline?.at(-1)?.emotion || null;

  return { primaryTheme, recentEmotion };
}

function buildMemoryContext(coreMemory, sessionSummaries, recentMessages, trimLevel = 0) {
  const lines = [];

  const caps = trimLevel > 0 ? TRIMMED_CAPS : CORE_MEMORY_CAPS;
  const summaryLimit = trimLevel > 1 ? 1 : 3;
  const messageLimit = trimLevel > 1 ? 12 : trimLevel > 0 ? 20 : 30;

  if (coreMemory) {
    lines.push('USER MEMORY (use implicitly, never quote):');

    if (coreMemory.user_facts?.length) {
      lines.push(`- Facts: ${coreMemory.user_facts.slice(0, caps.user_facts).join('; ')}`);
    }
    if (coreMemory.themes?.length) {
      lines.push(`- Themes: ${coreMemory.themes.slice(0, caps.themes).join(', ')}`);
    }
    if (coreMemory.goals?.length) {
      const goalTexts = coreMemory.goals.slice(0, caps.goals).map(g => g.text);
      lines.push(`- Goals: ${goalTexts.join('; ')}`);
    }
    if (coreMemory.emotion_timeline?.length) {
      const recent = coreMemory.emotion_timeline.slice(-caps.emotion_timeline);
      const emotions = recent.map(e => e.emotion).join(' → ');
      lines.push(`- Recent emotions: ${emotions}`);
    }
  }

  if (sessionSummaries?.length) {
    lines.push('\nPRIOR SESSIONS:');
    sessionSummaries.slice(0, summaryLimit).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.summary}`);
    });
  }

  if (recentMessages?.length) {
    const trimmed = recentMessages.slice(-messageLimit);
    const userMsgs = trimmed.filter(m => m.role === 'user').slice(-5);
    if (userMsgs.length) {
      lines.push('\nRECENT USER MESSAGES:');
      userMsgs.forEach(m => {
        const truncated = m.content.length > 80
          ? m.content.slice(0, 80) + '...'
          : m.content;
        lines.push(`- "${truncated}"`);
      });
    }
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

function buildGreetingResponse(gapHours, recentEmotion) {
  if (gapHours <= 24) {
    if (recentEmotion) {
      return `Hey. Still feeling ${recentEmotion}, or has it shifted?`;
    }
    return "Hey. I'm here.";
  }
  return "Hey. I'm here. Where do you want to start today?";
}

function shouldExtract(conversation) {
  return (conversation.user_msg_count_since_extraction || 0) >= EXTRACTION_THRESHOLD;
}

function shouldSummarize(conversation, rotated) {
  if (rotated) return true;
  return (conversation.user_msg_count_since_summary || 0) >= SUMMARY_THRESHOLD;
}

module.exports = {
  validateCoreMemory,
  mergeCoreMemory,
  runExtraction,
  runSessionSummary,
  computeContinuityVector,
  buildMemoryContext,
  buildGreetingResponse,
  shouldExtract,
  shouldSummarize,
  EXTRACTION_THRESHOLD,
  SUMMARY_THRESHOLD,
};
