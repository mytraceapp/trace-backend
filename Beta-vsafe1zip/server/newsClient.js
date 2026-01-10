const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Get ISO date string for N days ago
function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Extract the actual topic from a user message (removes filler words)
function extractNewsTopic(text) {
  if (!text) return 'general news';
  
  const t = text.toLowerCase().trim();
  
  // First, try to extract topic from common patterns
  const topicPatterns = [
    /news (?:about |on |in |regarding |for )(.+?)(?:\?|$)/i,
    /(?:about |on |in |regarding )(.+?)(?:\s+news|\?|$)/i,
    /what's happening (?:in |with )(.+?)(?:\?|$)/i,
    /what is going on (?:in |with )(.+?)(?:\?|$)/i,
    /tell me (?:about )?(?:the )?news (?:in |on |about )(.+?)(?:\?|$)/i,
    /headlines? (?:about |on |in |for )(.+?)(?:\?|$)/i,
  ];
  
  for (const pattern of topicPatterns) {
    const match = t.match(pattern);
    if (match && match[1]) {
      const topic = match[1].trim();
      if (topic && topic.length >= 3) {
        console.log('[NEWS] Extracted topic from user message:', topic);
        return topic;
      }
    }
  }
  
  // Fallback: strip common prefixes and look for what's left
  let topic = t
    .replace(/^(can you |could you |please |i'm stressed |i am stressed )/gi, '')
    .replace(/^(tell me |share |what's |what is )/gi, '')
    .replace(/(about the |about |the )?news/gi, '')
    .replace(/\?$/g, '')
    .trim();
  
  // Remove remaining filler
  topic = topic
    .replace(/^(about |on |in |regarding |for )/gi, '')
    .replace(/^(the |a |an )/gi, '')
    .trim();
  
  // If we have something reasonable, use it
  if (topic && topic.length >= 3 && topic.split(' ').length <= 5) {
    console.log('[NEWS] Extracted topic from user message:', topic);
    return topic;
  }
  
  console.log('[NEWS] Could not extract specific topic, using general');
  return 'general news';
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
  const t = text.toLowerCase().trim();

  // Simple check: if user mentions "news", fetch news
  if (t.includes('news')) {
    return true;
  }

  // Also catch current events questions without the word "news"
  const eventPatterns = [
    'current events',
    "what's happening",
    'what is happening',
    "what's going on",
    'what is going on',
    'did you hear about',
    'have you heard about',
    'situation in',
    'want to know what',
    'tell me what',
    'headlines',
  ];
  
  return eventPatterns.some(pattern => t.includes(pattern));
}

// Check if user is repeatedly asking for news (insisting)
function isInsistingOnNews(messages) {
  if (!messages?.length) return false;
  
  // Count how many times user asked about news/events in recent messages
  const recentUserMessages = messages.filter(m => m.role === 'user').slice(-5);
  let newsRequests = 0;
  
  for (const msg of recentUserMessages) {
    const content = (msg.content || '').toLowerCase();
    if (
      content.includes('news') ||
      content.includes('headlines') ||
      content.includes("what's going on") ||
      content.includes('what is going on') ||
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
  
  // Look for recent user messages that mentioned a topic
  const recentUser = messages.filter(m => m.role === 'user').slice(-5);
  
  for (const msg of recentUser.reverse()) {
    const content = (msg.content || '').toLowerCase();
    
    // Skip very short messages or pure confirmations
    if (content.length < 5) continue;
    if (/^(yes|yeah|ok|okay|sure|please)!?$/i.test(content.trim())) continue;
    
    // Look for news-related messages with topics
    if (content.includes('news') || content.includes('happening')) {
      const topic = extractNewsTopic(content);
      if (topic && topic !== 'general news') {
        return topic;
      }
    }
    
    // If the message is a single topic word, return it
    if (/^[a-z]+$/i.test(content.trim()) && content.trim().length >= 4) {
      return content.trim();
    }
  }
  
  return null;
}

module.exports = {
  buildNewsContextSummary,
  isNewsQuestion,
  isNewsConfirmation,
  extractPendingNewsTopic,
  extractNewsTopic,
  isInsistingOnNews,
};
