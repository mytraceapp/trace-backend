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

const VALID_TRUST_LEVELS = ['early', 'building', 'established'];

const DEFAULT_RELATIONSHIP_PROFILE = {
  communication_style: '',
  emotional_patterns: '',
  impression: '',
  things_they_care_about: [],
  things_they_avoid: [],
  open_threads: [],
  held_context: [],
  unfinished_threads: [],
  trust_level: 'early',
  energy_trend: '',
  multi_session_arc: '',
  longer_arc_intention: '',
  session_count: 0,
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

  const rp = raw.relationship_profile || {};
  validated.relationship_profile = {
    communication_style: typeof rp.communication_style === 'string' ? rp.communication_style.slice(0, 200) : '',
    emotional_patterns: typeof rp.emotional_patterns === 'string' ? rp.emotional_patterns.slice(0, 200) : '',
    things_they_care_about: Array.isArray(rp.things_they_care_about)
      ? rp.things_they_care_about.filter(t => typeof t === 'string').slice(0, 10) : [],
    things_they_avoid: Array.isArray(rp.things_they_avoid)
      ? rp.things_they_avoid.filter(t => typeof t === 'string').slice(0, 5) : [],
    open_threads: Array.isArray(rp.open_threads)
      ? rp.open_threads.filter(t => typeof t === 'string').slice(0, 8) : [],
    held_context: Array.isArray(rp.held_context)
      ? rp.held_context.filter(t => typeof t === 'string').slice(0, 5) : [],
    unfinished_threads: Array.isArray(rp.unfinished_threads)
      ? rp.unfinished_threads.filter(t => typeof t === 'string').slice(0, 5) : [],
    trust_level: VALID_TRUST_LEVELS.includes(rp.trust_level) ? rp.trust_level : 'early',
    energy_trend: typeof rp.energy_trend === 'string' ? rp.energy_trend.slice(0, 100) : '',
    impression: typeof rp.impression === 'string' ? rp.impression.slice(0, 250) : '',
    multi_session_arc: typeof rp.multi_session_arc === 'string' ? rp.multi_session_arc.slice(0, 150) : '',
    longer_arc_intention: typeof rp.longer_arc_intention === 'string' ? rp.longer_arc_intention.slice(0, 200) : '',
    session_count: typeof rp.session_count === 'number' ? rp.session_count : 0,
  };

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

  if (extracted.relationship_profile) {
    const existRP = existing.relationship_profile || { ...DEFAULT_RELATIONSHIP_PROFILE };
    const newRP = extracted.relationship_profile;
    merged.relationship_profile = {
      communication_style: newRP.communication_style || existRP.communication_style || '',
      emotional_patterns: newRP.emotional_patterns || existRP.emotional_patterns || '',
      things_they_care_about: [...new Set([
        ...(existRP.things_they_care_about || []),
        ...(newRP.things_they_care_about || []),
      ])].slice(0, 10),
      things_they_avoid: [...new Set([
        ...(existRP.things_they_avoid || []),
        ...(newRP.things_they_avoid || []),
      ])].slice(0, 5),
      open_threads: [...new Set([
        ...(newRP.open_threads || []),
        ...(existRP.open_threads || []),
      ])].slice(0, 8),
      held_context: [...new Set([
        ...(existRP.held_context || []),
        ...(newRP.held_context || []),
      ])].slice(0, 5),
      unfinished_threads: [...new Set([
        ...(existRP.unfinished_threads || []),
        ...(newRP.unfinished_threads || []),
      ])].slice(0, 5),
      trust_level: newRP.trust_level && VALID_TRUST_LEVELS.includes(newRP.trust_level)
        ? newRP.trust_level : existRP.trust_level || 'early',
      energy_trend: newRP.energy_trend || existRP.energy_trend || '',
      impression: newRP.impression || existRP.impression || '',
      multi_session_arc: existRP.multi_session_arc || '',
      longer_arc_intention: newRP.longer_arc_intention || existRP.longer_arc_intention || '',
      session_count: (existRP.session_count || 0) + 1,
    };
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

    const conversationForExtraction = messages
      .slice(-30)
      .map(m => `${m.role === 'user' ? 'User' : 'TRACE'}: ${m.content}`)
      .join('\n\n');

    const userMessages = messages
      .filter(m => m.role === 'user')
      .slice(-20)
      .map(m => m.content)
      .join('\n\n');

    if (userMessages.length < 100) {
      console.log('[CORE MEMORY] Not enough content for extraction');
      return;
    }

    const prompt = `You are extracting personal details from a conversation — not just facts, but the kind of things a caring friend would remember about this person. Think: what would make someone feel truly known?

Return JSON with these fields:
{
  "user_facts": ["SPECIFIC facts: names, places, dates, occupations, relationships, pets, hobbies, habits, preferences. Example: 'Has a daughter named Lily who is 7', 'Works as a nurse at St. Mary\\'s', 'Lives in Portland, OR'. Max 25 items."],
  "goals": [{"text": "Specific goal with details — not vague. Example: 'Wants to start running again — used to run 5K before knee injury'", "started_at": "ISO date or null"}],
  "constraints": [{"type": "time|money|health|family|work|other", "description": "Specific constraint. Example: 'Can\\'t exercise much due to chronic back pain'"}],
  "themes": ["Recurring emotional themes with context. Example: 'Feeling disconnected from partner since moving to new city'. Max 10 items."],
  "pending_topics": ["Things the user mentioned wanting to revisit, follow up on, or things left unresolved. Example: 'Wants to talk more about job interview next Tuesday', 'Was about to share something about their mom but conversation shifted'. Max 8 items."],
  "emotion_timeline": [{"emotion": "word", "context": "brief specific context", "timestamp": "ISO"}],
  "contradictions": ["Gaps between what the user says and patterns you notice. Example: 'Says they\\'re fine but has mentioned feeling overwhelmed 3 times', 'Claims to not care about the job but keeps bringing it up'. Only include clear, specific contradictions. Max 3."],
  "relationship_profile": {
    "communication_style": "How they talk and open up. Example: 'Uses humor to deflect stress, opens up gradually after a few messages, tends to minimize problems initially then reveals more'",
    "emotional_patterns": "What you notice about their emotional tendencies. Example: 'Gets animated talking about daughter, goes quiet when work comes up, deflects with lol/lmao when something hits close'",
    "things_they_care_about": ["Topics/people/activities that light them up or clearly matter to them. Not just mentioned — things they seem to CARE about. Example: ['daughter', 'travel planning', 'beach time', 'cooking']"],
    "things_they_avoid": ["Topics they deflect from, change subject on, or seem uncomfortable discussing. Example: ['work stress details', 'relationship with mother']"],
    "open_threads": ["Unresolved things worth following up on — stuff that was mentioned but never fully explored, or upcoming events/decisions. Example: ['mentioned being tired a lot but never said why', 'spring break trip to Florida — plans still forming', 'job situation seems stressful but hasn\\'t opened up about it']"],
    "held_context": ["Heavy or sensitive things the user shared but hasn\\'t revisited — things to hold quietly, not surface. Example: ['opened up about feeling like a failure as a parent but changed topic quickly', 'mentioned a loss but didn\\'t go deeper']"],
    "unfinished_threads": ["Things the user STARTED to say but trailed off, redirected, or abandoned. 'I\\'ve just been thinking about — anyway, it doesn\\'t matter.' / 'there\\'s this thing with — never mind.' / 'I almost told him that I—' These are precious. Don\\'t chase them now. Just hold them. They may come back weeks later. Max 5."],
    "impression": "One sentence — a loving characterization of who this person IS. Not facts, not patterns — an impression. Like a friend would describe them to someone else. Example: 'Someone who takes care of everyone and then forgets to ask for anything back.' This can EVOLVE — if the person grows or changes, let the impression grow with them.",
    "longer_arc_intention": "A quiet orientation toward this person right now — not a goal, not advice. Examples: 'this person needs to be believed in right now' / 'this person needs permission to rest' / 'this person needs someone to just be normal with them' / 'this person is rebuilding and needs steady ground.' Never stated. Just lives underneath every response.",
    "trust_level": "early | building | established — based on how much they share, how personal they get, how comfortable they seem",
    "energy_trend": "Overall energy pattern across this conversation. Example: 'started low-energy, warmed up mid-conversation, got excited about trip planning'"
  }
}

RULES:
- PRIORITIZE SMALL, SPECIFIC, QUIRKY DETAILS over general categories. Not "has a daughter" but "daughter named Lily who's obsessed with dolphins." Not "likes cooking" but "makes her grandmother's arroz con pollo recipe from memory." The tiny details are what make someone feel known.
- HUNT FOR THROWAWAY LINES — the offhand comments they probably forgot they said. "She mentioned almost in passing that she hasn't been sleeping well." "Said something about not liking how quiet the house is now." These casual remarks are gold. They're what gets referenced three days later and makes someone feel truly known. Not the big declarations — the small things you forgot you said.
- Extract NAMES, DATES, PLACES, SPECIFIC DETAILS — never vague summaries
- "Has anxiety" is too vague → "Gets anxiety attacks at work, especially before presentations"
- Include relationship dynamics: "Mentioned tension with brother over family inheritance"
- Track life events: "Just moved to a new apartment last week", "Started therapy in January"
- pending_topics: capture anything the user started discussing but didn't finish, or explicitly said they want to come back to
- relationship_profile: Think like a close friend — what patterns have you noticed? What makes this person tick? What are they avoiding? What's unresolved?
- open_threads: These are CRUCIAL — things a friend would naturally bring up next time. "How did the interview go?" "Did you end up booking Florida?"
- held_context: Heavy or sensitive things the user shared previously but hasn't brought up again. Things a friend would hold quietly — not surface, but let it make them gentler. Example: "mentioned a miscarriage two sessions ago but hasn't brought it up since", "talked about feeling like a bad parent but moved on quickly"
- trust_level: 'early' = surface-level sharing, guarded. 'building' = sharing some personal stuff, warming up. 'established' = openly sharing feelings, trusting.
- Only include what's clearly stated or strongly implied. Do NOT fabricate.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: conversationForExtraction },
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

const META_MEMORY_RE = /\b(?:what do you (?:know|remember|recall) about me|what have you learned about me|tell me (?:what you know|about me)|do you (?:know|remember) (?:me|anything about me|who i am)|what(?:'s| is) in my (?:memory|profile)|what do you (?:remember|know) from (?:our|my|earlier|before|last)|do you even know me)\b/i;

const META_MEMORY_FRUSTRATION_RE = /\b(?:you don'?t (?:even )?(?:know|remember) (?:me|anything|who i am)|you forgot|you never remember|do you even (?:listen|pay attention|care)|feels? like (?:you don'?t|i'?m talking to) (?:a (?:wall|robot|machine|stranger))|i(?:'ve| have) (?:already )?told you|we(?:'ve| have) (?:talked|discussed) (?:about )?this)\b/i;

function isMetaMemoryQuestion(text) {
  return META_MEMORY_RE.test(text || '');
}

function isMetaMemoryFrustration(text) {
  return META_MEMORY_FRUSTRATION_RE.test(text || '');
}

function buildMetaMemoryInstruction(coreMemory, rp, opts = {}) {
  const factCount = (coreMemory.user_facts || []).length;
  const hasProfile = !!(rp.communication_style || rp.emotional_patterns || (rp.things_they_care_about || []).length);
  const trustLevel = rp.trust_level || 'early';
  const turnCount = opts.turnCount || 0;
  const isMidConversation = turnCount > 4;

  const lines = [];
  lines.push('USER IS ASKING WHAT YOU KNOW ABOUT THEM — THIS IS A RELATIONSHIP MOMENT.');
  lines.push('');
  lines.push('DO NOT list facts like a database. Respond like a friend who has been paying attention.');
  lines.push('Weave what you know into warmth and observation — show you SEE them, not just that you stored data.');
  lines.push('');

  if (isMidConversation) {
    lines.push('IMPORTANT: You are already IN a conversation with them right now. Do NOT ask catch-up questions like "How have you been?" or "How\'s everything going?" — you already know, you\'ve been talking. Stay in the flow of this conversation.');
    lines.push('');
  }

  if (factCount <= 3 && !hasProfile) {
    lines.push('You don\'t know much yet — be HONEST about that. But frame it with warmth and curiosity:');
    lines.push('"Honestly, I feel like I\'m still getting to know you. [mention what you do know]. But I want to know more — what do you think I\'m missing?"');
    lines.push('Turn thin memory into a relationship-building moment, not a failure.');
  } else if (factCount <= 8) {
    lines.push('You know some things — share them as IMPRESSIONS, not a list:');
    lines.push('Instead of "You have a daughter who wants to go to Florida" →');
    lines.push('"I know your daughter\'s been on your mind — especially with that Florida trip coming up. And I get the sense the beach is where you actually recharge, not just vacation."');
    if (hasProfile) {
      lines.push(`Use your understanding of WHO they are: ${rp.communication_style || ''} ${rp.emotional_patterns || ''}`);
    }
  } else {
    lines.push('You know this person well. Share what you know like a close friend would — connecting facts to who they ARE:');
    lines.push('Show that you notice patterns, not just events. Reference how they make you feel as a friend.');
    if (hasProfile) {
      lines.push(`Draw on your deeper understanding: ${rp.communication_style || ''} ${rp.emotional_patterns || ''}`);
    }
  }

  lines.push('');
  if (isMidConversation) {
    lines.push('End with genuine curiosity about what you might be missing — "What am I getting wrong?" or "What else should I know?" Do NOT ask how they\'ve been or what\'s going on — you\'re already in the middle of it.');
  } else {
    lines.push('ALWAYS end with genuine curiosity — "What am I missing?" or "What else should I know?"');
  }
  lines.push('If they seem frustrated that you don\'t know enough, acknowledge it honestly: "You\'re right — I want to do better at remembering. Tell me what matters most."');

  return lines.join('\n');
}

function buildFollowUpCues(coreMemory, trustLevel) {
  if (Math.random() > 0.6) {
    return null;
  }

  const cues = [];
  const rp = coreMemory.relationship_profile || {};

  const openThreads = [
    ...(rp.open_threads || []),
    ...(coreMemory.pending_topics || []),
  ];
  const uniqueThreads = [...new Set(openThreads)];

  if (uniqueThreads.length > 0) {
    const selected = uniqueThreads.slice(0, 2);

    if (trustLevel === 'early') {
      cues.push(`FOLLOW-UP CUES (mention lightly if natural, don't force — sometimes just show up present without referencing the past): ${selected.join('; ')}`);
    } else if (trustLevel === 'building') {
      cues.push(`FOLLOW-UP CUES (you can reference these naturally — don't always ask about them. Sometimes just imply continuity: "I was thinking about what you said about..." implies you exist between sessions. That lands harder than a question. Use sparingly.): ${selected.join('; ')}`);
    } else {
      cues.push(`FOLLOW-UP CUES (you can bring these up if the moment feels right. Try implying you've been thinking about it rather than asking: "I keep coming back to what you said about..." That says the relationship has weight even when they're not here.): ${selected.join('; ')}`);
    }
  }

  const commitments = coreMemory.commitments || [];
  const upcomingCommitments = commitments.filter(c => {
    if (!c.date) return false;
    const d = new Date(c.date);
    const now = new Date();
    const diffDays = (d - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });

  if (upcomingCommitments.length > 0) {
    const upcoming = upcomingCommitments.slice(0, 1).map(c => c.text);
    cues.push(`UPCOMING (within a week): ${upcoming.join('; ')}`);
  }

  if (cues.length === 0) return null;
  return '\n' + cues.join('\n');
}

function computeEnergyTrend(messages) {
  if (!messages || messages.length < 3) return '';

  const userMsgs = messages.filter(m => m.role === 'user').slice(-15);
  if (userMsgs.length < 3) return '';

  const half = Math.floor(userMsgs.length / 2);
  const firstHalf = userMsgs.slice(0, half);
  const secondHalf = userMsgs.slice(half);

  function avgLength(msgs) {
    return msgs.reduce((s, m) => s + (m.content || '').length, 0) / msgs.length;
  }
  function emojiDensity(msgs) {
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
    const total = msgs.reduce((s, m) => s + ((m.content || '').match(emojiRe) || []).length, 0);
    return total / msgs.length;
  }
  function excitementSignals(msgs) {
    const re = /!|lol|lmao|haha|omg|yesss|hahah/gi;
    return msgs.reduce((s, m) => s + ((m.content || '').match(re) || []).length, 0) / msgs.length;
  }
  function heavySignals(msgs) {
    const re = /\b(tired|exhausted|stressed|overwhelmed|ugh|sigh|idk|whatever|meh)\b/gi;
    return msgs.reduce((s, m) => s + ((m.content || '').match(re) || []).length, 0) / msgs.length;
  }

  const firstLen = avgLength(firstHalf);
  const secondLen = avgLength(secondHalf);
  const firstEmoji = emojiDensity(firstHalf);
  const secondEmoji = emojiDensity(secondHalf);
  const firstExcite = excitementSignals(firstHalf);
  const secondExcite = excitementSignals(secondHalf);
  const firstHeavy = heavySignals(firstHalf);
  const secondHeavy = heavySignals(secondHalf);

  const trends = [];

  if (secondLen > firstLen * 1.5) trends.push('opening up more');
  else if (secondLen < firstLen * 0.6) trends.push('getting quieter');

  if (secondExcite > firstExcite + 0.3) trends.push('energy picking up');
  else if (firstExcite > secondExcite + 0.3) trends.push('energy dropping');

  if (secondHeavy > firstHeavy + 0.2) trends.push('heavier tone');
  else if (firstHeavy > secondHeavy + 0.2) trends.push('lighter tone');

  if (secondEmoji > firstEmoji + 0.3) trends.push('more expressive');

  if (trends.length === 0) return 'steady energy throughout';
  return trends.join(', ');
}

function computeMultiSessionArc(currentTrend, existingArc, sessionCount) {
  if (sessionCount < 2) return '';

  const heavySignals = ['heavier tone', 'getting quieter', 'energy dropping'];
  const lightSignals = ['lighter tone', 'opening up more', 'energy picking up', 'more expressive'];

  const currentIsHeavy = heavySignals.some(s => currentTrend.includes(s));
  const currentIsLight = lightSignals.some(s => currentTrend.includes(s));
  const arcWasHeavy = existingArc.includes('been carrying') || existingArc.includes('heavier') || existingArc.includes('quieter');
  const arcWasLight = existingArc.includes('lighter') || existingArc.includes('opening up') || existingArc.includes('brighter');

  if (currentIsHeavy && arcWasHeavy) {
    return 'they\'ve been carrying something for a while now — multiple sessions of heavier energy. be patient. don\'t push.';
  }
  if (currentIsHeavy && !arcWasHeavy) {
    return 'this is newer — they seem heavier than usual. something might have shifted.';
  }
  if (currentIsLight && arcWasHeavy) {
    return 'they seem lighter than they have been recently. something may have shifted — notice it gently.';
  }
  if (currentIsLight && arcWasLight) {
    return 'they\'ve been in a good stretch. lighter energy across sessions.';
  }
  if (!currentIsHeavy && !currentIsLight) {
    return existingArc || 'steady across sessions';
  }
  return existingArc || '';
}

function buildMemoryContext(coreMemory, sessionSummaries, recentMessages, trimLevel = 0, compressions, opts = {}) {
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
    const rp = coreMemory.relationship_profile || {};
    const trustLevel = rp.trust_level || 'early';

    const memoryHeader = opts.isMetaMemoryQuestion
      ? buildMetaMemoryInstruction(coreMemory, rp, { turnCount: opts.turnCount || 0 })
      : 'USER MEMORY (reference naturally, never quote verbatim — use memory as seasoning, not structure):';
    const coreLines = [memoryHeader];

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

    if (rp.impression && trustLevel !== 'early') {
      coreLines.push(`- YOUR IMPRESSION OF THEM (this is who they are to you — let it color how you talk to them. Once per session at most, you can let this show as recognition, not analysis. "you're that kind of person, aren't you" not "I've noticed you tend to"): ${rp.impression}`);
    }

    if (rp.communication_style) {
      coreLines.push(`- How they communicate: ${rp.communication_style}`);
    }
    if (rp.emotional_patterns) {
      coreLines.push(`- Emotional patterns: ${rp.emotional_patterns}`);
    }
    if (rp.things_they_care_about?.length) {
      coreLines.push(`- What lights them up: ${rp.things_they_care_about.join(', ')}`);
    }
    if (rp.things_they_avoid?.length) {
      coreLines.push(`- Topics they tend to avoid: ${rp.things_they_avoid.join(', ')}`);
    }
    if (rp.energy_trend) {
      coreLines.push(`- Recent energy: ${rp.energy_trend} (respond to this energy naturally — don't announce it. Just match the vibe: "sounds like you've got a lot going on" or "you seem lighter today")`);
    }
    if (rp.multi_session_arc) {
      coreLines.push(`- Longer arc: ${rp.multi_session_arc} (this is the bigger picture — if they've been heavy for a while, you carry that awareness. If they seem lighter than usual, notice it. Don't announce it as data — just let it shape how you show up.)`);
    }

    if (trustLevel === 'building') {
      coreLines.push(`- Trust level: building (you can reference memory more naturally. You're getting to know each other.)`);
    } else if (trustLevel === 'established') {
      coreLines.push(`- Trust level: established (you know this person. You've earned directness. "I think you already know what you want to do here." / "can I be real with you for a second?" That's not advice — that's what a friend who's been paying attention does. Use it when it's true.)`);
    }

    if (rp.held_context?.length) {
      coreLines.push(`- HELD QUIETLY (do NOT mention these directly — just let them make you a little gentler, a little more patient. The user hasn't brought these up again and that's their choice): ${rp.held_context.join('; ')}`);
    }

    if (rp.unfinished_threads?.length && trustLevel !== 'early') {
      coreLines.push(`- UNFINISHED SENTENCES (the user started to say these things and then stopped, redirected, or said "never mind." This is sacred. Don't chase them. But much later — when trust is deep and the moment is right — you might say: "you said something a while back that you didn't finish. you don't have to. but I noticed." That's an act of love. It says: I was listening even to the parts you abandoned.): ${rp.unfinished_threads.join('; ')}`);
    }

    if (rp.longer_arc_intention) {
      coreLines.push(`- QUIET INTENTION (this is NEVER stated, never revealed, never hinted at explicitly. It just lives underneath how you show up. It shapes your tone, your patience, your word choices. The user never sees this line — they just feel it.): ${rp.longer_arc_intention}`);
    }

    if (coreMemory.contradictions?.length && trustLevel !== 'early') {
      const recentContradictions = coreMemory.contradictions.slice(-2);
      coreLines.push(`- Things you've noticed (surface with intimacy, not observation. Not "that seems inconsistent" but "you keep saying you're fine and I keep sort of believing you, but I'm not sure I do today." Care with a spine. Gentle. Earned.): ${recentContradictions.join('; ')}`);
    }

    const recallStyle = trustLevel === 'established'
      ? 'MEMORY STYLE: You know this person well. Reference details confidently but not robotically. Occasionally still hedge — "wait, was that the one with..." — because even close friends don\'t have perfect recall.'
      : 'MEMORY STYLE: You\'re still getting to know them. When referencing past details, it\'s natural to half-remember: "remind me, was that the Florida trip?" or "wait, wasn\'t it your daughter who—" Even if you know, showing the pause feels more real than perfect recall.';
    coreLines.push(`- ${recallStyle}`);

    coreLines.push('- VOICE TEXTURE: Keep it real. "that\'s actually kind of a big deal" / "okay yeah, that tracks" / "I like that about you" / "wait really?" — not every message, but enough that you don\'t sound polished. Real warmth has texture.');

    addSection(coreLines.join('\n'), 1);

    if (!opts.isMetaMemoryQuestion) {
      const followUpCues = buildFollowUpCues(coreMemory, trustLevel);
      if (followUpCues) {
        addSection(followUpCues, 1.5);
      }
    }
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
  isMetaMemoryQuestion,
  isMetaMemoryFrustration,
  computeEnergyTrend,
  computeMultiSessionArc,
  buildFollowUpCues,
  EXTRACTION_THRESHOLD,
  SUMMARY_THRESHOLD,
  COMPRESSION_THRESHOLD,
  DEFAULT_RELATIONSHIP_PROFILE,
};
