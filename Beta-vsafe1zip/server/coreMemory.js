/**
 * TRACE Core Memory System
 * Extraction, validation, and context assembly
 */

const memoryStore = require('./memoryStore');

const EXTRACTION_THRESHOLD = 5;
const SUMMARY_THRESHOLD = 25;

const IMPORTANCE_SIGNALS = [
  /\bmy (?:name|partner|wife|husband|girlfriend|boyfriend|kid|child|daughter|son|mom|dad|brother|sister|friend|boss|job|work)\b/i,
  /\bI (?:just|recently|finally|actually)\b/i,
  /\bI (?:got|started|quit|lost|found|moved|broke up|married|divorced|graduated)\b/i,
  /\bmy (?:birthday|anniversary|wedding|funeral|diagnosis|surgery|test|exam|interview)\b/i,
  /\bI (?:feel|felt|think|believe|want|need|hope|wish|worry|hate|love|miss|remember)\b/i,
  /\b(?:died|passed away|pregnant|engaged|fired|promoted|hired|admitted|accepted|rejected)\b/i,
  /\b(?:trigger|trauma|anxiety|depression|panic|addiction|abuse|assault|suicide|self-harm)\b/i,
  /\bI['']?m (?:scared|afraid|terrified|worried|nervous|stressed|overwhelmed|exhausted|lonely|angry|sad|happy|excited|proud)\b/i,
  /\b(?:next week|tomorrow|this weekend|coming up|planning to|going to|decided to)\b/i,
  /\b(?:goal|dream|aspiration|plan|resolution|commitment|promise)\b/i,
];

const CORE_MEMORY_CAPS = {
  user_facts: 25,
  goals: 15,
  constraints: 10,
  commitments: 10,
  themes: 10,
  pending_topics: 8,
  emotion_timeline: 5,
  contradictions: 10,
};

const TRIMMED_CAPS = {
  user_facts: 10,
  goals: 5,
  constraints: 3,
  commitments: 3,
  themes: 5,
  pending_topics: 4,
  emotion_timeline: 3,
};

function validateCoreMemory(raw) {
  const validated = {
    user_facts: [],
    goals: [],
    constraints: [],
    commitments: [],
    themes: [],
    pending_topics: [],
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

  if (Array.isArray(raw.pending_topics)) {
    validated.pending_topics = raw.pending_topics
      .filter(t => typeof t === 'string')
      .slice(0, CORE_MEMORY_CAPS.pending_topics);
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

  if (extracted.constraints?.length) {
    merged.constraints = [...(existing.constraints || []), ...extracted.constraints]
      .slice(-CORE_MEMORY_CAPS.constraints);
  }

  if (extracted.commitments?.length) {
    merged.commitments = [...(existing.commitments || []), ...extracted.commitments]
      .slice(-CORE_MEMORY_CAPS.commitments);
  }

  if (extracted.themes?.length) {
    const newThemes = extracted.themes.filter(
      t => !existing.themes?.includes(t)
    );
    merged.themes = [...(existing.themes || []), ...newThemes]
      .slice(-CORE_MEMORY_CAPS.themes);
  }

  if (extracted.pending_topics?.length) {
    const newTopics = extracted.pending_topics.filter(
      t => !existing.pending_topics?.some(et => et.toLowerCase() === t.toLowerCase())
    );
    merged.pending_topics = [...(existing.pending_topics || []), ...newTopics]
      .slice(-CORE_MEMORY_CAPS.pending_topics);
  }

  if (extracted.emotion_timeline?.length) {
    merged.emotion_timeline = [
      ...(existing.emotion_timeline || []),
      ...extracted.emotion_timeline,
    ].slice(-CORE_MEMORY_CAPS.emotion_timeline);
  }

  if (extracted.contradictions?.length) {
    merged.contradictions = [...(existing.contradictions || []), ...extracted.contradictions]
      .slice(-CORE_MEMORY_CAPS.contradictions);
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

    const prompt = `You are extracting SPECIFIC, CONCRETE personal details from a conversation for long-term memory. Prioritize details that would help a close friend remember important things about this person.

Return JSON with these fields:
{
  "user_facts": ["SPECIFIC facts: names, places, dates, occupations, relationships, pets, hobbies, habits, preferences. Example: 'Has a daughter named Lily who is 7', 'Works as a nurse at St. Mary\\'s', 'Lives in Portland, OR'. Max 25 items."],
  "goals": [{"text": "Specific goal with details — not vague. Example: 'Wants to start running again — used to run 5K before knee injury'", "started_at": "ISO date or null"}],
  "constraints": [{"type": "time|money|health|family|work|other", "description": "Specific constraint. Example: 'Can\\'t exercise much due to chronic back pain'"}],
  "themes": ["Recurring emotional themes with context. Example: 'Feeling disconnected from partner since moving to new city'. Max 10 items."],
  "pending_topics": ["Things the user mentioned wanting to revisit, follow up on, or things left unresolved. Example: 'Wants to talk more about job interview next Tuesday', 'Was about to share something about their mom but conversation shifted'. Max 8 items."],
  "emotion_timeline": [{"emotion": "word", "context": "brief specific context", "timestamp": "ISO"}]
}

RULES:
- Extract NAMES, DATES, PLACES, SPECIFIC DETAILS — never vague summaries
- "Has anxiety" is too vague → "Gets anxiety attacks at work, especially before presentations"
- Include relationship dynamics: "Mentioned tension with brother over family inheritance"
- Track life events: "Just moved to a new apartment last week", "Started therapy in January"
- pending_topics: capture anything the user started discussing but didn't finish, or explicitly said they want to come back to
- Only include what's clearly stated or strongly implied. Do NOT fabricate.`;

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

    const prompt = `Summarize this conversation session in 2-3 sentences. Focus on key topics discussed and any patterns or recurring themes. Use grounded, observational language—avoid therapeutic terms like "navigating", "processing", "holding space". Just note what came up.`;

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

const MEMORY_CONTEXT_TOKEN_BUDGET = 2500;

function estimateTokens(text) {
  return Math.ceil(text.length / 3.5);
}

function buildMemoryContext(coreMemory, sessionSummaries, recentMessages, trimLevel = 0, compressions) {
  const sections = [];
  let totalTokens = 0;

  const caps = trimLevel > 0 ? TRIMMED_CAPS : CORE_MEMORY_CAPS;
  const summaryLimit = trimLevel > 1 ? 1 : 3;
  const messageLimit = trimLevel > 1 ? 5 : trimLevel > 0 ? 8 : 10;

  function addSection(text, priority) {
    const tokens = estimateTokens(text);
    if (totalTokens + tokens <= MEMORY_CONTEXT_TOKEN_BUDGET) {
      sections.push({ text, priority, tokens });
      totalTokens += tokens;
      return true;
    }
    const remaining = MEMORY_CONTEXT_TOKEN_BUDGET - totalTokens;
    if (remaining > 50) {
      const charBudget = Math.floor(remaining * 3.5);
      const truncated = text.slice(0, charBudget) + '...';
      sections.push({ text: truncated, priority, tokens: remaining });
      totalTokens += remaining;
      return true;
    }
    return false;
  }

  if (coreMemory) {
    const coreLines = ['USER MEMORY (reference naturally, never quote verbatim):'];

    if (coreMemory.user_facts?.length) {
      coreLines.push(`- About them: ${coreMemory.user_facts.slice(0, caps.user_facts).join('; ')}`);
    }
    if (coreMemory.goals?.length) {
      const goalTexts = coreMemory.goals.slice(0, caps.goals).map(g => g.text);
      coreLines.push(`- Their goals: ${goalTexts.join('; ')}`);
    }
    if (coreMemory.themes?.length) {
      coreLines.push(`- Recurring themes: ${coreMemory.themes.slice(0, caps.themes).join('; ')}`);
    }
    if (coreMemory.pending_topics?.length) {
      coreLines.push(`- Unfinished topics (they may want to revisit): ${coreMemory.pending_topics.slice(0, caps.pending_topics).join('; ')}`);
    }
    if (coreMemory.constraints?.length) {
      const constraintTexts = coreMemory.constraints.slice(0, caps.constraints).map(c => c.description);
      coreLines.push(`- Constraints: ${constraintTexts.join('; ')}`);
    }
    if (coreMemory.emotion_timeline?.length) {
      const recent = coreMemory.emotion_timeline.slice(-caps.emotion_timeline);
      const emotions = recent.map(e => `${e.emotion}${e.context ? ` (${e.context})` : ''}`).join(' → ');
      coreLines.push(`- Emotional arc: ${emotions}`);
    }

    addSection(coreLines.join('\n'), 1);
  }

  if (recentMessages?.length) {
    const trimmed = recentMessages.slice(-messageLimit);
    const userMsgs = trimmed.filter(m => m.role === 'user').slice(-5);
    if (userMsgs.length) {
      const msgLines = ['\nRECENT (PREVIOUS SESSION):'];
      userMsgs.forEach(m => {
        const truncated = m.content.length > 120
          ? m.content.slice(0, 120) + '...'
          : m.content;
        msgLines.push(`- "${truncated}"`);
      });
      addSection(msgLines.join('\n'), 2);
    }
  }

  if (sessionSummaries?.length) {
    const summaryLines = ['\nPRIOR SESSIONS:'];
    sessionSummaries.slice(0, summaryLimit).forEach((s, i) => {
      summaryLines.push(`${i + 1}. ${s.summary}`);
    });
    addSection(summaryLines.join('\n'), 3);
  }

  if (compressions?.length) {
    const compLines = ['\nEARLIER CONTEXT:'];
    compressions.slice(0, 2).forEach(c => {
      compLines.push(`- ${c.summary}`);
    });
    addSection(compLines.join('\n'), 4);
  }

  if (sections.length === 0) return '';
  return sections.sort((a, b) => a.priority - b.priority).map(s => s.text).join('\n');
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

const COMPRESSION_THRESHOLD = 40;
const COMPRESSION_KEEP_RECENT = 20;

async function compressOlderMessages(openai, supabase, conversationId, sessionId, messages) {
  if (!openai || messages.length <= COMPRESSION_THRESHOLD) return null;

  if (!memoryStore.acquireLock(conversationId, 'compression')) {
    console.log('[SESSION COMPRESS] Already running for:', conversationId);
    return null;
  }

  try {
    const existingCompressions = await memoryStore.fetchSessionCompressions(supabase, conversationId, 1);
    const alreadyCompressedCount = existingCompressions.reduce((sum, c) => sum + (c.covers_message_count || 0), 0);

    const uncompressedStart = alreadyCompressedCount;
    const keepCount = COMPRESSION_KEEP_RECENT;
    const toCompressEnd = messages.length - keepCount;

    if (toCompressEnd <= uncompressedStart || toCompressEnd - uncompressedStart < 6) {
      console.log(`[SESSION COMPRESS] Not enough new messages to compress (already=${alreadyCompressedCount}, total=${messages.length})`);
      const keepFull = messages.slice(-keepCount);
      if (existingCompressions.length > 0) {
        return {
          compressionContext: { role: 'system', content: `[Earlier in this conversation]:\n${existingCompressions[0].summary}` },
          recentMessages: keepFull,
        };
      }
      return null;
    }

    const toCompress = messages.slice(uncompressedStart, toCompressEnd);
    const keepFull = messages.slice(-keepCount);

    const conversationText = toCompress
      .map(m => `${m.role === 'user' ? 'User' : 'TRACE'}: ${m.content}`)
      .join('\n');

    const priorSummary = existingCompressions.length > 0
      ? `\n\nPrior context (already summarized):\n${existingCompressions[0].summary}\n\nNew conversation segment to add to summary:`
      : '';

    const compressionPrompt = `Summarize this conversation segment for context continuity.${priorSummary} Preserve:
- Specific facts the user shared (names, dates, numbers, decisions, places)
- Emotional context and tone shifts
- Any commitments, action items, or things they said they'd come back to
- Topics they want to revisit
- Key relationship details mentioned (people, pets, work relationships)

Be SPECIFIC. Don't generalize. Keep proper nouns. Use concise bullet points.
Bad: "User discussed work stress"
Good: "User's manager Sarah rejected their Q1 report. Worried about job security."

${priorSummary ? 'Integrate the prior context with the new segment into one cohesive summary.' : ''}
Conversation to summarize:
${conversationText}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: compressionPrompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary || summary.length < 20) {
      console.warn('[SESSION COMPRESS] Summary too short, skipping');
      return null;
    }

    const totalCompressed = alreadyCompressedCount + toCompress.length;
    await memoryStore.saveSessionCompression(supabase, conversationId, sessionId, summary, totalCompressed);
    console.log(`[SESSION COMPRESS] Compressed ${toCompress.length} new messages (total covered: ${totalCompressed}) → ${summary.length} char summary, keeping ${keepFull.length} recent`);

    return {
      compressionContext: { role: 'system', content: `[Earlier in this conversation]:\n${summary}` },
      recentMessages: keepFull,
    };
  } catch (err) {
    console.error('[SESSION COMPRESS] Error:', err.message);
    return null;
  } finally {
    memoryStore.releaseLock(conversationId, 'compression');
  }
}

function hasImportanceSignals(recentMessages) {
  if (!recentMessages || recentMessages.length === 0) return false;
  const userMessages = recentMessages
    .filter(m => m.role === 'user')
    .slice(-5);
  
  for (const msg of userMessages) {
    const content = msg.content || '';
    let signalCount = 0;
    for (const pattern of IMPORTANCE_SIGNALS) {
      if (pattern.test(content)) signalCount++;
    }
    if (signalCount >= 2 || content.length > 100) return true;
  }
  return false;
}

function shouldExtract(conversation, recentMessages) {
  const count = conversation.user_msg_count_since_extraction || 0;
  if (count >= EXTRACTION_THRESHOLD) return true;
  if (count >= 3 && hasImportanceSignals(recentMessages)) return true;
  return false;
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
  compressOlderMessages,
  EXTRACTION_THRESHOLD,
  SUMMARY_THRESHOLD,
  COMPRESSION_THRESHOLD,
};
