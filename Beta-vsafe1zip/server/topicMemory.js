const TOPIC_PATTERNS = [
  { pattern: /\b(deadline|deadlines|due date|due soon)\b/i, topic: 'deadlines' },
  { pattern: /\b(project|projects)\b/i, topic: 'project' },
  { pattern: /\b(boss|manager|supervisor)\b/i, topic: 'work relationships' },
  { pattern: /\b(new job|starting a job|just started|first day|first week)\b/i, topic: 'new job' },
  { pattern: /\b(promotion|raise|salary)\b/i, topic: 'career growth' },
  { pattern: /\b(fired|laid off|let go|lost my job|unemployed)\b/i, topic: 'job loss' },
  { pattern: /\b(work|job|career|office|meeting)\b/i, topic: 'work' },
  { pattern: /\b(exam|exams|test|finals|midterm)\b/i, topic: 'exams' },
  { pattern: /\b(homework|assignment|essay|paper)\b/i, topic: 'school work' },
  { pattern: /\b(school|class|classes|college|university|grad school)\b/i, topic: 'school' },
  { pattern: /\b(dating|date|tinder|hinge|bumble)\b/i, topic: 'dating' },
  { pattern: /\b(breakup|broke up|breaking up|split up|ended things)\b/i, topic: 'breakup' },
  { pattern: /\b(girlfriend|boyfriend|partner|spouse|wife|husband|fiancé|fiancee)\b/i, topic: 'relationship' },
  { pattern: /\b(mom|dad|parent|parents|mother|father|family)\b/i, topic: 'family' },
  { pattern: /\b(sister|brother|sibling|siblings)\b/i, topic: 'siblings' },
  { pattern: /\b(kids|children|son|daughter|baby)\b/i, topic: 'parenting' },
  { pattern: /\b(therapy|therapist|counselor|counseling)\b/i, topic: 'therapy' },
  { pattern: /\b(medication|meds|prescription|dosage)\b/i, topic: 'medication' },
  { pattern: /\b(anxiety|anxious|panic|panicking|panic attack)\b/i, topic: 'anxiety' },
  { pattern: /\b(depress|depressed|depression)\b/i, topic: 'depression' },
  { pattern: /\b(doctor|medical|hospital|appointment|diagnosis)\b/i, topic: 'health' },
  { pattern: /\b(sleep|insomnia|can't sleep|tired|exhausted)\b/i, topic: 'sleep' },
  { pattern: /\b(moving|move|new apartment|new place|new city)\b/i, topic: 'moving' },
  { pattern: /\b(money|rent|bills|debt|financial|afford)\b/i, topic: 'finances' },
  { pattern: /\b(music|song|album|playlist|band|concert)\b/i, topic: 'music' },
  { pattern: /\b(writing|wrote|novel|book|blog|journal)\b/i, topic: 'writing' },
  { pattern: /\b(art|painting|drawing|creative|creating)\b/i, topic: 'creative work' },
  { pattern: /\b(exercise|gym|workout|running|yoga)\b/i, topic: 'fitness' },
  { pattern: /\b(friend|friends|friendship|bestie)\b/i, topic: 'friendships' },
  { pattern: /\b(lonel|lonely|alone|isolated|no one)\b/i, topic: 'loneliness' },
  { pattern: /\b(grief|griev|loss|died|death|passed away|funeral)\b/i, topic: 'grief' },
];

const RESOLUTION_PATTERNS = [
  /\b(that's done|all done|finished with that|wrapped up|all finished)\b/i,
  /\b(it worked out|turned out fine|sorted|resolved|all good now)\b/i,
  /\b(over it|past that|moved on|don't worry about that|not an issue)\b/i,
  /\b(finally done|completed|got through it|handled it)\b/i,
];

function extractTopics(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return [];
  const msg = userMessage.toLowerCase();
  const topics = [];
  const seen = new Set();

  for (const { pattern, topic } of TOPIC_PATTERNS) {
    if (pattern.test(msg) && !seen.has(topic)) {
      seen.add(topic);
      topics.push(topic);
    }
  }

  const parentTopics = new Set(['work', 'school', 'family']);
  const childTopicMap = {
    'work': ['deadlines', 'project', 'work relationships', 'new job', 'career growth', 'job loss'],
    'school': ['exams', 'school work'],
    'family': ['siblings', 'parenting'],
  };

  for (const [parent, children] of Object.entries(childTopicMap)) {
    if (seen.has(parent) && children.some(c => seen.has(c))) {
      const idx = topics.indexOf(parent);
      if (idx !== -1) topics.splice(idx, 1);
    }
  }

  return topics.slice(0, 3);
}

function detectResolution(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return false;
  return RESOLUTION_PATTERNS.some(p => p.test(userMessage));
}

async function storeTopics(pool, userId, conversationId, topics) {
  if (!pool || !userId || !conversationId || !topics || topics.length === 0) return;

  for (const topic of topics) {
    try {
      await pool.query(`
        INSERT INTO conversation_topics (user_id, conversation_id, topic)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, conversation_id, topic)
        DO UPDATE SET
          last_mentioned_at = NOW(),
          mention_count = conversation_topics.mention_count + 1
      `, [userId, conversationId, topic]);
    } catch (err) {
      console.error('[TOPIC_MEMORY] store error:', err.message);
    }
  }
}

async function resolveTopicsForUser(pool, userId, topics) {
  if (!pool || !userId || !topics || topics.length === 0) return;

  for (const topic of topics) {
    try {
      await pool.query(`
        UPDATE conversation_topics
        SET resolved = TRUE
        WHERE user_id = $1 AND topic = $2 AND resolved = FALSE
      `, [userId, topic]);
      console.log(`[TOPIC_MEMORY] Resolved topic: ${topic} for user ${userId.slice(0, 8)}`);
    } catch (err) {
      console.error('[TOPIC_MEMORY] resolve error:', err.message);
    }
  }
}

async function fetchActiveTopics(pool, userId, conversationId, limit = 5) {
  if (!pool || !userId || !conversationId) return [];
  try {
    const { rows } = await pool.query(`
      SELECT topic, mention_count, last_mentioned_at
      FROM conversation_topics
      WHERE user_id = $1
        AND conversation_id = $2
        AND resolved = FALSE
      ORDER BY last_mentioned_at DESC
      LIMIT $3
    `, [userId, conversationId, limit]);
    return rows || [];
  } catch (err) {
    console.error('[TOPIC_MEMORY] fetchActive error:', err.message);
    return [];
  }
}

async function fetchRecentCrossSessionTopics(pool, userId, currentConversationId, limit = 3) {
  if (!pool || !userId) return [];
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (topic) topic, last_mentioned_at
      FROM conversation_topics
      WHERE user_id = $1
        AND ($2::text IS NULL OR conversation_id != $2)
        AND last_mentioned_at > NOW() - INTERVAL '7 days'
        AND resolved = FALSE
      ORDER BY topic, last_mentioned_at DESC
      LIMIT $3
    `, [userId, currentConversationId, limit]);
    return rows || [];
  } catch (err) {
    console.error('[TOPIC_MEMORY] fetchRecent error:', err.message);
    return [];
  }
}

async function cleanupOldResolvedTopics(pool) {
  if (!pool) return;
  try {
    const { rowCount } = await pool.query(`
      DELETE FROM conversation_topics
      WHERE resolved = TRUE
        AND last_mentioned_at < NOW() - INTERVAL '30 days'
    `);
    if (rowCount > 0) {
      console.log(`[TOPIC_MEMORY] Cleaned up ${rowCount} old resolved topics`);
    }
  } catch (err) {
    console.error('[TOPIC_MEMORY] cleanup error:', err.message);
  }
}

function buildTopicContextPrompt(activeTopics, recentTopics) {
  let context = '';

  if (activeTopics && activeTopics.length > 0) {
    context += '\nCURRENT TOPICS:\n';
    context += activeTopics.map(t => `${t.topic} (mentioned ${t.mention_count}x)`).join(', ');
    context += '\n\nIf user says "still thinking about it" or "it\'s getting better" — assume they mean one of these topics. Don\'t force them to re-explain.';
  }

  if (recentTopics && recentTopics.length > 0) {
    context += '\n\nRECENT TOPICS (from past conversations): ';
    context += recentTopics.map(t => t.topic).join(', ');
    context += '\nThese were discussed recently. If user references something vaguely, check if it maps to one of these.';
  }

  return context;
}

module.exports = {
  extractTopics,
  detectResolution,
  storeTopics,
  resolveTopicsForUser,
  fetchActiveTopics,
  fetchRecentCrossSessionTopics,
  cleanupOldResolvedTopics,
  buildTopicContextPrompt,
};
