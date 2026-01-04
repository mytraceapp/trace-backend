const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Get ISO date string for N days ago
function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
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

module.exports = {
  buildNewsContextSummary,
  isNewsQuestion,
};
