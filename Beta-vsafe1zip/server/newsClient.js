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
  
  // Common patterns to strip out
  const stripPatterns = [
    /^(can you |could you |please |tell me |share |what's |what is |any |some )/gi,
    /(about the |about |the )?news (about |on |regarding )?/gi,
    /^(i'm stressed |i am stressed |i need )/gi,
    /(happening |going on )(in |with )?/gi,
    /\?$/g,
  ];
  
  let topic = t;
  for (const pattern of stripPatterns) {
    topic = topic.replace(pattern, '').trim();
  }
  
  // If we stripped too much or nothing left, try to find key nouns
  if (!topic || topic.length < 3) {
    // Look for specific topics mentioned
    const topicMatches = t.match(/(?:about|on|regarding|in)\s+(\w+(?:\s+\w+)?)/i);
    if (topicMatches && topicMatches[1]) {
      topic = topicMatches[1];
    } else {
      // Fall back to removing just the obvious filler
      topic = t.replace(/^(tell me |what's |can you )/gi, '').trim();
    }
  }
  
  // Final cleanup - remove common noise words if topic is still too long
  if (topic.split(' ').length > 4) {
    topic = topic
      .replace(/^(the |a |an )/gi, '')
      .replace(/(right now|today|lately|recently)$/gi, '')
      .trim();
  }
  
  console.log('[NEWS] Extracted topic from user message:', topic);
  return topic || 'general news';
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
    "what's happening in",
    'what is happening in',
    "what's going on in",
    'what is going on in',
    'did you hear about',
    'have you heard about',
    'situation in',
  ];
  
  return eventPatterns.some(pattern => t.includes(pattern));
}

// Check if user is confirming they want news after TRACE offered
function isNewsConfirmation(userMessage, previousMessages) {
  if (!userMessage || !previousMessages?.length) return false;
  
  const t = userMessage.toLowerCase().trim();
  
  // Short confirmations that might be news topic confirmations
  const confirmationWords = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'please'];
  const isShortConfirmation = confirmationWords.some(w => t === w || t === w + '!');
  
  // Single word that could be a topic (like "Immigration", "Venezuela")
  const isSingleWordTopic = /^[a-z]+$/i.test(t) && t.length >= 4 && t.length <= 20;
  
  if (isShortConfirmation || isSingleWordTopic) {
    // Check if TRACE recently offered to share news
    const recentAssistant = previousMessages.filter(m => m.role === 'assistant').slice(-2);
    for (const msg of recentAssistant) {
      const content = (msg.content || '').toLowerCase();
      if (
        content.includes('share what i know') ||
        content.includes('news') ||
        content.includes('headlines') ||
        content.includes('would you like me to') && content.includes('news')
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
};
