const NEWS_API_KEY = process.env.NEWS_API_KEY;

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

const _newsArticleCache = new Map();
const NEWS_CACHE_TTL = 30 * 60 * 1000;

function getCachedArticles(userId) {
  const cached = _newsArticleCache.get(userId);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > NEWS_CACHE_TTL) {
    _newsArticleCache.delete(userId);
    return null;
  }
  return cached;
}

function cacheArticles(userId, topic, articles) {
  _newsArticleCache.set(userId, { topic, articles, fetchedAt: Date.now() });
}

function hasSpecificTopic(text) {
  if (!text) return false;
  const hasProperNouns = /[A-Z][a-z]{2,}/.test(text);
  const hasYear = /\b20[0-9]{2}\b/.test(text);
  const hasEventWords = /\b(shooting|attack|incident|case|scandal|crash|explosion|earthquake|hurricane|wildfire|flood|protest|riot|strike|coup|war|invasion|election|trial|verdict|ruling|recall|outbreak)\b/i.test(text);
  const hasLocationEvent = /\b(in|at|near|from)\s+[A-Z][a-z]+/i.test(text);
  return hasProperNouns || hasYear || hasEventWords || hasLocationEvent;
}

function extractNewsTopic(text) {
  if (!text) return 'general news';
  
  const t = text.toLowerCase().trim();
  
  const topicPatterns = [
    /news (?:about |on |in |regarding |for )(.+?)(?:\?|$)/i,
    /(?:about |on |in |regarding )(.+?)(?:\s+news|\?|$)/i,
    /(?:w?hat'?s?) happening (?:in |with )(?:the )?(.+?)(?:\?|$)/i,
    /(?:w?hat'?s?) going on (?:in |with )(?:the )?(.+?)(?:\?|$)/i,
    /happening (?:in |with )(?:the )?(.+?)(?:\?|$)/i,
    /tell me (?:about )?(?:the )?news (?:in |on |about )(.+?)(?:\?|$)/i,
    /headlines? (?:about |on |in |for )(.+?)(?:\?|$)/i,
    /who (?:are|were|is|was) (?:the )?(.+?)(?:\?|$)/i,
    /what (?:happened|is happening) (?:in |at |with |to )(.+?)(?:\?|$)/i,
  ];
  
  for (const pattern of topicPatterns) {
    const match = t.match(pattern);
    if (match && match[1]) {
      const topic = match[1].trim();
      if (topic && topic.length >= 3 && !isPronoun(topic)) {
        console.log('[NEWS] Extracted topic from user message:', topic);
        return topic;
      }
    }
  }
  
  let topic = t
    .replace(/^(can you |could you |please |i'm stressed |i am stressed )/gi, '')
    .replace(/^(tell me |share |what's |what is )/gi, '')
    .replace(/(about the |about |the )?news/gi, '')
    .replace(/\?$/g, '')
    .trim();
  
  topic = topic
    .replace(/^(about |on |in |regarding |for )/gi, '')
    .replace(/^(the |a |an )/gi, '')
    .trim();
  
  if (topic && topic.length >= 3 && topic.split(' ').length <= 8 && !isPronoun(topic)) {
    console.log('[NEWS] Extracted topic from user message:', topic);
    return topic;
  }
  
  console.log('[NEWS] Could not extract specific topic, using general');
  return 'general news';
}

function isGeneralKnowledgeQuestion(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();
  
  const realTimeIndicators = [
    /what(?:'s|\s+is)\s+happening/i,
    /\b(latest|recent|today|yesterday|this week|this month|right now|breaking)\b/i,
    /\bcurrent\s+(news|events?|situation|score)/i,
    /\bwho\s+won\b/i,
    /\bscore(?:s)?\b/i,
  ];
  
  if (realTimeIndicators.some(p => p.test(t))) return false;
  
  const knowledgePatterns = [
    /\bwho\s+(?:was|is|were)\s+[A-Z]/,
    /\bwhat\s+(?:was|is|were)\s+(?:the\s+)?[A-Z]/,
    /\bhistory\s+of\b/i,
    /\bculture\s+(?:of|in)\b/i,
    /\bwhen\s+(?:was|did|were)\b/i,
    /\bwhat\s+(?:caused|started|led\s+to)\b/i,
    /\btell\s+me\s+about\s+(?:the\s+)?(?:history|culture|tradition|origin|story)\b/i,
    /\bwhat\s+(?:does|do)\s+.+\s+mean\b/i,
    /\bexplain\b/i,
    /\bwhy\s+(?:is|are|do|did|was|were)\b/i,
    /\bhow\s+(?:does|do|did|was|were)\b/i,
  ];
  
  return knowledgePatterns.some(p => p.test(t));
}

function isFactualQuestion(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();
  
  const factualPatterns = [
    /^who\s/i,
    /^what\s/i,
    /^when\s/i,
    /^where\s/i,
    /^how\s+(many|much|old|long|far|did|does|do|was|were|is)\b/i,
    /^why\s/i,
    /^tell\s+me\s+about\b/i,
    /^explain\b/i,
    /\bvictim/i,
    /\bcasualt/i,
    /\bhow\s+many\s+(people|died|killed|injured|hurt)\b/i,
  ];
  
  return factualPatterns.some(p => p.test(t));
}

async function fetchNewsArticles(query) {
  if (!NEWS_API_KEY) {
    console.error('[NEWS] Missing NEWS_API_KEY');
    return [];
  }

  try {
    // Filter to last 2 days for fresh news (free tier allows up to 30 days)
    const fromDate = getDateDaysAgo(2);
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      query
    )}&from=${fromDate}&pageSize=5&sortBy=publishedAt&language=en&apiKey=${NEWS_API_KEY}`;

    console.log('[NEWS] Fetching articles from:', fromDate, 'query:', query);

    const res = await fetch(url);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[NEWS] API error:', res.status, errorText);
      return [];
    }

    const data = await res.json();
    console.log('[NEWS] Found', data.articles?.length || 0, 'articles');
    return data.articles || [];
  } catch (err) {
    console.error('[NEWS] Fetch error:', err.message);
    return [];
  }
}

async function buildNewsContextSummary(userMessage) {
  try {
    // Extract just the topic from the user's message
    const topic = extractNewsTopic(userMessage);
    const articles = await fetchNewsArticles(topic);

    if (!articles.length) {
      return `NEWS_CONTEXT: No recent major coverage found for "${topic}".`;
    }

    const brief = articles.slice(0, 5).map(a => ({
      title: a.title,
      source: a.source?.name,
      publishedAt: a.publishedAt,
      description: a.description,
    }));

    return `NEWS_CONTEXT for "${topic}" (recent headlines, may be incomplete):
${JSON.stringify(brief, null, 2)}`;
  } catch (err) {
    console.error('[NEWS] buildNewsContextSummary error', err.message);
    return `NEWS_CONTEXT: News lookup failed.`;
  }
}

function isNewsQuestion(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim().replace(/['']/g, "'");

  if (t.includes('news')) {
    return true;
  }

  const eventPatterns = [
    'current events',
    "what's happening",
    'whats happening',
    'what is happening',
    "hat's happening",
    "hats happening",
    "what's going on",
    'whats going on',
    'what is going on',
    'going on in',
    'did you hear about',
    'have you heard about',
    'situation in',
    'want to know what',
    'tell me what',
    'headlines',
    'happening with the',
    'happening in the',
  ];
  
  return eventPatterns.some(pattern => t.includes(pattern));
}

const _newsConvoState = new Map();

function markNewsFetched(userId, topic) {
  _newsConvoState.set(userId, { topic, fetchedAt: Date.now(), turnsSince: 0 });
}

function tickNewsState(userId) {
  const state = _newsConvoState.get(userId);
  if (state) {
    state.turnsSince++;
    if (state.turnsSince > 5) {
      _newsConvoState.delete(userId);
    }
  }
}

function getNewsState(userId) {
  return _newsConvoState.get(userId) || null;
}

function isNewsFollowUp(text, messages, userId) {
  if (!text || !messages?.length) return { isFollowUp: false, topic: null, hasOwnTopic: false };
  const t = text.toLowerCase().trim();
  
  const trackedState = userId ? getNewsState(userId) : null;
  let newsWasDiscussed = !!trackedState;
  let lastNewsTopic = trackedState?.topic || null;
  
  if (!newsWasDiscussed) {
    const recentMessages = messages.slice(-14);
    for (const msg of recentMessages) {
      const content = (msg.content || '').toLowerCase();
      if (msg.role === 'user' && isNewsQuestion(msg.content)) {
        newsWasDiscussed = true;
        const topic = extractNewsTopic(msg.content);
        if (topic && topic !== 'general news') lastNewsTopic = topic;
      }
      if (msg.role === 'assistant' && (
        content.includes('shooting') || content.includes('headline') ||
        content.includes('incident') || content.includes('victim') ||
        content.includes('report') || content.includes('coverage') ||
        content.includes('killed') || content.includes('arrested') ||
        content.includes('immigration') || content.includes('breaking')
      )) {
        newsWasDiscussed = true;
      }
    }
  }
  
  if (!newsWasDiscussed) {
    return { isFollowUp: false, topic: null, hasOwnTopic: false };
  }
  
  const msgHasSpecificTopic = hasSpecificTopic(text);
  
  const followUpPatterns = [
    /who('s| is| was| got| were| did| are)/i,
    /who (got|was|were|did|is|are)/i,
    /who .*(victim|killed|shot|died|hurt|injured|involved|arrested|responsible)/i,
    /the victim/i,
    /what happened/i,
    /where (was|did|is|were|exactly)/i,
    /when (did|was|were|is)/i,
    /how many/i,
    /how (did|was|is)/i,
    /why (did|was|were|is)/i,
    /tell me more/i,
    /more (about|on|details|info)/i,
    /what (about|else)/i,
    /any (other|more|update|detail)/i,
    /details/i,
    /what (exactly|specifically)/i,
    /can you (tell|share|give)/i,
    /do you know/i,
    /what .*(cause|reason|motive)/i,
    /is (there|that|it) (true|real|confirmed)/i,
    /any (arrest|suspect|update|casualt)/i,
    /how (bad|serious|many)/i,
  ];
  
  const matched = followUpPatterns.some(p => p.test(t));
  if (matched) {
    if (msgHasSpecificTopic) {
      const ownTopic = extractNewsTopic(text);
      if (ownTopic && ownTopic !== 'general news') {
        console.log('[NEWS] Follow-up detected but message has its OWN specific topic:', ownTopic, '(ignoring cached:', lastNewsTopic, ')');
        return { isFollowUp: true, topic: ownTopic, hasOwnTopic: true };
      }
    }
    console.log('[NEWS] Detected vague follow-up, using cached topic:', lastNewsTopic || 'general');
    return { isFollowUp: true, topic: lastNewsTopic, hasOwnTopic: false };
  }
  return { isFollowUp: false, topic: null, hasOwnTopic: false };
}

// Check if user is repeatedly asking for news (insisting)
function isInsistingOnNews(messages) {
  if (!messages?.length) return false;
  
  // Count how many times user asked about news/events in recent messages
  const recentUserMessages = messages.filter(m => m.role === 'user').slice(-5);
  let newsRequests = 0;
  
  for (const msg of recentUserMessages) {
    // Normalize curly quotes
    const content = (msg.content || '').toLowerCase().replace(/['']/g, "'");
    if (
      content.includes('news') ||
      content.includes('headlines') ||
      content.includes("what's going on") ||
      content.includes('whats going on') ||
      content.includes('what is going on') ||
      content.includes('going on in') ||
      content.includes('tell me what')
    ) {
      newsRequests++;
    }
  }
  
  // If user has asked 2+ times about news, they're insisting
  if (newsRequests >= 2) {
    console.log('[NEWS] User is insisting on news (' + newsRequests + ' requests)');
    return true;
  }
  
  return false;
}

// Check if user is confirming they want news after TRACE offered
function isNewsConfirmation(userMessage, previousMessages) {
  if (!userMessage || !previousMessages?.length) return false;
  
  const t = userMessage.toLowerCase().trim();
  
  // Confirmation patterns - starts with yes/yeah/sure/ok or contains headline/news
  const confirmationPatterns = [
    /^(yes|yeah|yep|sure|ok|okay|please)/i,
    /headline/i,
    /tell me/i,
    /share/i,
  ];
  const matchesConfirmation = confirmationPatterns.some(p => p.test(t));
  
  // Single word that could be a topic (like "Immigration", "Venezuela")
  const isSingleWordTopic = /^[a-z]+$/i.test(t) && t.length >= 4 && t.length <= 20;
  
  // Short message (under 30 chars) that might be a confirmation
  const isShortMessage = t.length < 30;
  
  if ((matchesConfirmation && isShortMessage) || isSingleWordTopic) {
    // Check if TRACE recently offered to share news
    const recentAssistant = previousMessages.filter(m => m.role === 'assistant').slice(-2);
    for (const msg of recentAssistant) {
      const content = (msg.content || '').toLowerCase();
      if (
        content.includes('share what i know') ||
        content.includes('news') ||
        content.includes('headlines') ||
        content.includes('would you like me to share')
      ) {
        console.log('[NEWS] Detected news confirmation after TRACE offered');
        return true;
      }
    }
  }
  
  return false;
}

// Extract the pending news topic from previous messages
function extractPendingNewsTopic(messages) {
  if (!messages?.length) return null;
  
  const recentUser = messages.filter(m => m.role === 'user').slice(-8);
  
  for (const msg of recentUser.reverse()) {
    const content = (msg.content || '').toLowerCase();
    
    if (content.length < 5) continue;
    if (/^(yes|yeah|ok|okay|sure|please)!?$/i.test(content.trim())) continue;
    
    if (content.includes('news') || content.includes('happening')) {
      const topic = extractNewsTopic(content);
      if (topic && topic !== 'general news') {
        return topic;
      }
    }
    
    if (/^[a-z]+$/i.test(content.trim()) && content.trim().length >= 4) {
      return content.trim();
    }
  }
  
  const allMessages = messages.slice(-12);
  for (const msg of [...allMessages].reverse()) {
    const content = (msg.content || '').toLowerCase();
    if (content.length < 8) continue;
    
    const topicHints = content.match(/(?:about |regarding |with |in )((?:[A-Z][a-z]+\s*){1,4})/i);
    if (topicHints && topicHints[1]) {
      const hint = topicHints[1].trim();
      if (hint.length >= 3 && !isPronoun(hint)) {
        console.log('[NEWS] Resolved contextual topic from conversation:', hint);
        return hint;
      }
    }
    
    const namedEntities = (msg.content || '').match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g);
    if (namedEntities) {
      const filtered = namedEntities.filter(e => 
        e.length >= 3 && 
        !['Any', 'The', 'What', 'How', 'Can', 'Could', 'Would', 'Should', 'Yeah', 'Sure', 'Thanks', 'Okay', 'Sorry'].includes(e)
      );
      if (filtered.length > 0) {
        console.log('[NEWS] Resolved topic from named entities:', filtered[0]);
        return filtered[0];
      }
    }
  }
  
  return null;
}

function isPronoun(word) {
  const pronouns = ['that', 'this', 'it', 'them', 'they', 'those', 'these', 'him', 'her', 'he', 'she', 'we', 'us'];
  return pronouns.includes(word.toLowerCase().trim());
}

module.exports = {
  buildNewsContextSummary,
  fetchNewsArticles,
  isNewsQuestion,
  isNewsFollowUp,
  isNewsConfirmation,
  extractPendingNewsTopic,
  extractNewsTopic,
  isInsistingOnNews,
  markNewsFetched,
  tickNewsState,
  hasSpecificTopic,
  getCachedArticles,
  cacheArticles,
  isGeneralKnowledgeQuestion,
  isFactualQuestion,
};
