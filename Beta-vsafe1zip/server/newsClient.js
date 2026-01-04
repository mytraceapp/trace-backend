const NEWS_API_KEY = process.env.NEWS_API_KEY;

async function fetchNewsArticles(query) {
  if (!NEWS_API_KEY) {
    console.error('[NEWS] Missing NEWS_API_KEY');
    return [];
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      query
    )}&pageSize=5&sortBy=publishedAt&language=en&apiKey=${NEWS_API_KEY}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.error('[NEWS] API error:', res.status);
      return [];
    }

    const data = await res.json();
    return data.articles || [];
  } catch (err) {
    console.error('[NEWS] Fetch error:', err.message);
    return [];
  }
}

async function buildNewsContextSummary(topic) {
  try {
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
    return `NEWS_CONTEXT: News lookup for "${topic}" failed.`;
  }
}

function isNewsQuestion(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();

  // Direct news phrases that don't need location qualifier
  const directNewsPatterns = [
    "what's in the news",
    'what is in the news',
    "what's the news",
    'what is the news',
    'any news',
    'latest news',
    'current news',
    'current events',
    'what else is happening',
  ];
  
  // Check direct patterns first
  if (directNewsPatterns.some(pattern => t.includes(pattern))) {
    return true;
  }

  // Patterns that need a topic/location
  const topicPatterns = [
    "what's happening",
    'what is happening',
    "what's going on",
    'what is going on',
    'news about',
    'news on',
    'do you know what',
    'tell me about what',
  ];
  
  // Must also mention a topic/place to avoid false positives
  const hasLocation = /\b(in|about|with|on)\s+\w+/.test(t);
  
  return topicPatterns.some(pattern => t.includes(pattern)) && hasLocation;
}

module.exports = {
  buildNewsContextSummary,
  isNewsQuestion,
};
