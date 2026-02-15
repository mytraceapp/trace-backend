const { fetchNewsArticles } = require('./newsClient');

const SEARCH_COOLDOWN_MS = 30000;
const searchTimestamps = new Map();

function canSearch(userId) {
  const last = searchTimestamps.get(userId);
  if (!last) return true;
  return Date.now() - last > SEARCH_COOLDOWN_MS;
}

function markSearched(userId) {
  searchTimestamps.set(userId, Date.now());
}

function isCurrentEventsQuery(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();

  const currentEventPatterns = [
    /\b(?:latest|recent|upcoming)\b/i,
    /\bnew\b.*\b(?:movie|show|album|song|game|release|episode|season|book|trailer)\b/i,
    /\bcurrent\b.*\b(?:events?|situation|news|score)\b/i,
    /\bdid (?:you )?(?:hear|see|know|watch)\b/i,
    /\bhave you (?:heard|seen)\b/i,
    /\bwhat(?:'s| is) (?:going on|happening)\b/i,
    /\bwho won\b/i,
    /\bwho is winning\b/i,
    /\bscore(?:s)?\b/i,
    /\bgame (?:last night|tonight|yesterday|today)\b/i,
    /\belection\b/i,
    /\b(?:nba|nfl|mlb|nhl|mls|ufc|wwe|fifa)\b/i,
    /\bmovie(?:s)?\b.*\b(?:out|release|playing|theaters?|good|new|watch|seen|recommend)\b/i,
    /\b(?:out|release|playing|theaters?|good|new|watch|seen|recommend)\b.*\bmovie(?:s)?\b/i,
    /\bshow(?:s)?\b.*\b(?:new|watch|streaming|netflix|hulu|good|recommend|binge)\b/i,
    /\b(?:new|watch|streaming|netflix|hulu|good|recommend|binge)\b.*\bshow(?:s)?\b/i,
    /\b(?:tv show|series|anime|drama)\b/i,
    /\balbum(?:s)?\b.*\b(?:new|drop|release|out)\b/i,
    /\b(?:new|drop|release|out)\b.*\balbum(?:s)?\b/i,
    /\bconcert(?:s)?\b/i,
    /\btour(?:ing)?\b/i,
    /\bsuper bowl\b/i,
    /\bworld cup\b/i,
    /\bolympics\b/i,
    /\bplayoffs?\b/i,
    /\bchampionship\b/i,
    /\bstock(?:s)?\b.*\b(?:market|price|today)\b/i,
    /\bcrypto\b/i,
    /\bbitcoin\b/i,
    /\bhurricane|earthquake|wildfire|tornado|flood\b/i,
    /\bwhat (?:happened|is happening)\b/i,
    /\banything (?:interesting|cool|fun|new)\b.*\b(?:going on|happening)\b/i,
    /\btell me (?:about|something about)\b.*\b(?:latest|recent|new)\b/i,
    /\bdo you know (?:about|anything about|if)\b/i,
    /\bhave you (?:watched|listened to|read about)\b/i,
    /\bis .{2,30} (?:good|worth|any good|out yet)\b/i,
    /\bwhen (?:does|is|did) .{2,30} (?:come out|release|drop|start|premiere|air)\b/i,
    /\btrending\b/i,
    /\bviral\b/i,
    /\bbreaking news\b/i,
  ];

  return currentEventPatterns.some(p => p.test(t));
}

function extractSearchQuery(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();

  const extractPatterns = [
    /do you know (?:about |anything about )?(.+?)(?:\?|$)/i,
    /have you (?:heard|seen|watched|listened to|read) (?:about |of )?(.+?)(?:\?|$)/i,
    /did you (?:hear|see|watch|know) (?:about |of )?(.+?)(?:\?|$)/i,
    /is (.+?) (?:good|worth|any good|out yet|out)\b/i,
    /when (?:does|is|did) (.+?) (?:come out|release|drop|start|premiere|air)/i,
    /(?:latest|recent|new|upcoming) (.+?)(?:\?|$)/i,
    /tell me (?:about|something about) (?:the )?(?:latest |recent |new )?(.+?)(?:\?|$)/i,
    /who won (?:the )?(.+?)(?:\?|$)/i,
    /(?:what'?s?|w?hat'?s?) (?:going on|happening) (?:with |in )(?:the )?(.+?)(?:\?|$)/i,
    /(?:going on|happening) (?:with |in )(?:the )?(.+?)(?:\?|$)/i,
  ];

  for (const pattern of extractPatterns) {
    const match = t.match(pattern);
    if (match && match[1]) {
      const topic = match[1].trim().replace(/[?.!]+$/, '').trim();
      if (topic.length >= 2 && topic.length <= 80) {
        console.log('[SEARCH] Extracted topic from pattern:', topic);
        return topic;
      }
    }
  }

  const categoryPatterns = [
    { pattern: /\b(?:movies?|films?)\b/i, fallback: 'new movies 2025 2026' },
    { pattern: /\b(?:tv shows?|series|shows? on netflix|shows? on hulu)\b/i, fallback: 'new tv shows 2025 2026' },
    { pattern: /\b(?:albums?|songs?|music)\b.*\b(?:new|latest|recent|drop|release)\b/i, fallback: 'new music releases' },
    { pattern: /\b(?:new|latest|recent|drop|release)\b.*\b(?:albums?|songs?|music)\b/i, fallback: 'new music releases' },
    { pattern: /\btrending\b/i, fallback: 'trending now' },
    { pattern: /\bviral\b/i, fallback: 'viral today' },
    { pattern: /\banything (?:interesting|cool|fun|new)\b/i, fallback: 'interesting news today' },
  ];

  for (const { pattern, fallback } of categoryPatterns) {
    if (pattern.test(t)) {
      return fallback;
    }
  }

  let cleaned = t
    .replace(/^(?:hey |yo |trace |so |um |like |just |okay |ok |w?hat'?s? |what is |what are |how is |how are |where is |where are |who is |who are |when is |when are |tell me about (?:the )?)/gi, '')
    .replace(/\b(?:happening|going on)\b/gi, '')
    .replace(/\b(?:with the|with|in the|in|about the|about|right now|today|lately|currently)\b/gi, '')
    .replace(/\?+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length >= 2 && cleaned.length <= 80) {
    console.log('[SEARCH] Extracted topic from cleanup:', cleaned);
    return cleaned;
  }

  return text.trim().slice(0, 80);
}

async function searchForContext(userMessage, userId) {
  if (!canSearch(userId)) {
    console.log('[SEARCH] Cooldown active for user', userId);
    return null;
  }

  const query = extractSearchQuery(userMessage);
  if (!query) {
    console.log('[SEARCH] Could not extract search query from:', userMessage);
    return null;
  }

  console.log('[SEARCH] Searching for:', query);
  markSearched(userId);

  try {
    if (!process.env.NEWS_API_KEY) {
      console.warn('[SEARCH] NEWS_API_KEY missing — search disabled');
      return null;
    }

    const articles = await fetchNewsArticles(query);

    if (!articles || articles.length === 0) {
      console.log('[SEARCH] No results found for:', query);
      return `SEARCH_CONTEXT for "${query}": No recent news articles found, but this is likely a topic you know about from your training data. Answer confidently from your knowledge. Share what you know about ${query} — stats, context, recent developments. If you genuinely have no knowledge of this topic, say so naturally. Don't make anything up, but don't deflect if you do know.`;
    }

    const brief = articles.slice(0, 5).map(a => ({
      title: a.title,
      source: a.source?.name,
      date: a.publishedAt?.split('T')[0],
      snippet: (a.description || '').slice(0, 150),
    }));

    console.log('[SEARCH] Found', brief.length, 'results for:', query);

    return `SEARCH_CONTEXT for "${query}" (real data — use it):
${JSON.stringify(brief, null, 2)}

INSTRUCTIONS: Weave this info into your response naturally. Keep buddy voice. Don't say "according to search results" or "I found that" — just share the info like you already knew it. Be brief unless they ask for detail. Never mention APIs, sources, or search unless they ask where you heard it.`;
  } catch (err) {
    console.error('[SEARCH] Error:', err.message);
    return null;
  }
}

module.exports = {
  isCurrentEventsQuery,
  searchForContext,
  extractSearchQuery,
  canSearch,
};
