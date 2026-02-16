/**
 * Greeting Grounding Guard
 * 
 * Validates AI-generated greetings against verified memory and recent messages.
 * Prevents hallucinated references (e.g., "smoothie recipe" when none exists).
 * Enforces lowercase greeting line and max 2-line format.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up', 'down',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
  'your', 'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she',
  'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
  'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom',
  'this', 'that', 'these', 'those', 'am', 'it\'s', 'that\'s',
  'don\'t', 'doesn\'t', 'didn\'t', 'won\'t', 'wouldn\'t', 'couldn\'t',
  'shouldn\'t', 'can\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t',
  'haven\'t', 'hasn\'t', 'hadn\'t', 'i\'m', 'you\'re', 'he\'s', 'she\'s',
  'we\'re', 'they\'re', 'i\'ve', 'you\'ve', 'we\'ve', 'they\'ve',
  'i\'ll', 'you\'ll', 'he\'ll', 'she\'ll', 'we\'ll', 'they\'ll',
  'i\'d', 'you\'d', 'he\'d', 'she\'d', 'we\'d', 'they\'d',
  'let\'s', 'that\'ll', 'who\'s', 'what\'s', 'here\'s', 'there\'s',
  'when\'s', 'where\'s', 'why\'s', 'how\'s',
]);

const SAFE_GENERIC_WORDS = new Set([
  'hey', 'hi', 'hello', 'morning', 'afternoon', 'evening', 'night',
  'late', 'early', 'day', 'today', 'tonight', 'week', 'weekend',
  'back', 'going', 'doing', 'feeling', 'been', 'want', 'ready',
  'something', 'anything', 'everything', 'nothing', 'thing', 'things',
  'good', 'great', 'ok', 'okay', 'fine', 'well', 'better', 'worse',
  'still', 'yet', 'already', 'right', 'now', 'first', 'last', 'next',
  'one', 'two', 'start', 'keep', 'take', 'breath', 'breathe', 'sit',
  'regulate', 'reflect', 'check', 'mind', 'body', 'head', 'heart',
  'space', 'time', 'moment', 'bit', 'little', 'lot', 'much',
  'yeah', 'nah', 'sure', 'maybe', 'probably', 'definitely',
  'what\'s', 'how\'s', 'where', 'pick', 'left', 'off', 'catch',
  'sleep', 'rest', 'energy', 'stress', 'mood', 'vibe',
  'busy', 'tired', 'long', 'rough', 'chill', 'easy', 'hard',
  'getting', 'holding', 'sitting', 'looking', 'working', 'thinking',
  'need', 'like', 'else', 'before', 'since', 'talk', 'chat',
  'pause', 'stop', 'open', 'close', 'settle', 'land', 'ground',
  'way', 'world', 'place', 'life', 'stuff', 'kind', 'sort',
]);

const HALLUCINATION_PHRASES = [
  /you (?:mentioned|told me about|said|brought up|shared)/i,
  /(?:that|the) (?:thing|stuff) (?:you|about)/i,
  /did you (?:end up|ever|finally|get to)/i,
  /how (?:did|was) (?:your|the) \w+(?:\s+\w+)? (?:go|turn out|work out)/i,
  /(?:remember|recall) (?:when|that|the)/i,
  /last time you (?:mentioned|said|told)/i,
  /can't wait for your/i,
  /excited about your/i,
  /hope (?:your|the) .+ went well/i,
];

const HEALTH_BAN_PATTERNS = [
  /\b(?:headache|migraine|cold|flu|fever|cough|sick|illness|nausea|pain|ache|sore|injury|injured|hurt|hurting)\b/i,
  /\b(?:doctor|hospital|clinic|medication|medicine|prescription|diagnosis|symptom|condition|treatment|surgery|therapy|therapist)\b/i,
  /\b(?:health\s*(?:issue|problem|concern|condition|struggle))\b/i,
  /\b(?:feeling\s+(?:sick|unwell|ill|nauseous|dizzy|faint))\b/i,
  /\b(?:getting\s+(?:sick|worse|ill))\b/i,
  /\b(?:your\s+(?:health|body|back|knee|stomach|throat|chest|head)\s+(?:is|was|been|still|better|worse|okay|ok|hurting|bothering))\b/i,
  /\b(?:recover|recovering|recovery)\b/i,
  /\b(?:allergies|allergy|asthma|diabetes|infection|virus|disease)\b/i,
  /\b(?:hope you(?:'re| are) feeling better)\b/i,
  /\b(?:take care of yourself)\b/i,
];

function extractContentNouns(text) {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = cleaned.split(' ').filter(w => w.length > 2);
  
  const nouns = words.filter(w => {
    if (STOP_WORDS.has(w)) return false;
    if (SAFE_GENERIC_WORDS.has(w)) return false;
    return true;
  });
  
  return [...new Set(nouns)];
}

function extractPhrases(text) {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  const phrases = [];
  
  const twoWordPattern = /\b([a-z]{3,})\s+([a-z]{3,})\b/g;
  let match;
  while ((match = twoWordPattern.exec(cleaned)) !== null) {
    const phrase = `${match[1]} ${match[2]}`;
    const w1Safe = STOP_WORDS.has(match[1]) || SAFE_GENERIC_WORDS.has(match[1]);
    const w2Safe = STOP_WORDS.has(match[2]) || SAFE_GENERIC_WORDS.has(match[2]);
    if (!w1Safe || !w2Safe) {
      phrases.push(phrase);
    }
  }
  
  return phrases;
}

function buildVerifiedCorpus(verifiedSources) {
  const corpus = new Set();
  
  const allText = [];
  
  if (verifiedSources.memoryItems) {
    for (const item of verifiedSources.memoryItems) {
      const val = (item.value || item.content || '').toLowerCase();
      allText.push(val);
      val.split(/\s+/).forEach(w => {
        if (w.length > 2 && !STOP_WORDS.has(w)) corpus.add(w);
      });
    }
  }
  
  if (verifiedSources.conversationTopics) {
    for (const topic of verifiedSources.conversationTopics) {
      const t = topic.toLowerCase();
      allText.push(t);
      t.split(/\s+/).forEach(w => {
        if (w.length > 2 && !STOP_WORDS.has(w)) corpus.add(w);
      });
    }
  }
  
  if (verifiedSources.recentUserMessages) {
    for (const msg of verifiedSources.recentUserMessages) {
      const m = msg.toLowerCase();
      allText.push(m);
      m.split(/\s+/).forEach(w => {
        if (w.length > 2 && !STOP_WORDS.has(w)) corpus.add(w);
      });
    }
  }
  
  if (verifiedSources.displayName) {
    const name = verifiedSources.displayName.toLowerCase();
    name.split(/\s+/).forEach(w => {
      if (w.length > 1) corpus.add(w);
    });
  }
  
  if (verifiedSources.coreThemes) {
    for (const theme of verifiedSources.coreThemes) {
      const t = theme.toLowerCase();
      allText.push(t);
      t.split(/\s+/).forEach(w => {
        if (w.length > 2 && !STOP_WORDS.has(w)) corpus.add(w);
      });
    }
  }
  
  if (verifiedSources.goals) {
    for (const goal of verifiedSources.goals) {
      const g = (typeof goal === 'string' ? goal : goal.text || '').toLowerCase();
      allText.push(g);
      g.split(/\s+/).forEach(w => {
        if (w.length > 2 && !STOP_WORDS.has(w)) corpus.add(w);
      });
    }
  }
  
  if (verifiedSources.userFacts) {
    for (const fact of verifiedSources.userFacts) {
      const f = fact.toLowerCase();
      allText.push(f);
      f.split(/\s+/).forEach(w => {
        if (w.length > 2 && !STOP_WORDS.has(w)) corpus.add(w);
      });
    }
  }
  
  return { corpus, fullText: allText.join(' ') };
}

function validateGreeting(greeting, verifiedSources) {
  const result = {
    valid: true,
    greeting: greeting,
    failures: [],
    enforcedGreeting: null,
  };
  
  if (!greeting || greeting.trim().length < 2) {
    result.valid = false;
    result.failures.push('empty_greeting');
    return result;
  }
  
  const lines = greeting.split('\n').filter(l => l.trim().length > 0);
  
  if (lines.length > 2) {
    result.valid = false;
    result.failures.push('too_many_lines');
  }
  
  if (lines[0] && lines[0][0] !== lines[0][0].toLowerCase()) {
    result.enforcedGreeting = greeting;
    lines[0] = lines[0][0].toLowerCase() + lines[0].slice(1);
    result.enforcedGreeting = lines.join('\n');
  }
  
  for (const pattern of HALLUCINATION_PHRASES) {
    if (pattern.test(greeting)) {
      result.valid = false;
      result.failures.push(`hallucination_phrase: ${pattern.source}`);
    }
  }
  
  for (const pattern of HEALTH_BAN_PATTERNS) {
    if (pattern.test(greeting)) {
      result.valid = false;
      result.failures.push(`health_reference_banned: ${pattern.source}`);
    }
  }
  
  const secondLine = lines.length > 1 ? lines.slice(1).join(' ') : lines[0];
  const contentNouns = extractContentNouns(secondLine);
  
  if (contentNouns.length === 0) {
    return result;
  }
  
  const { corpus, fullText } = buildVerifiedCorpus(verifiedSources);
  
  const fullTextWords = new Set(fullText.split(/\s+/).filter(w => w.length > 0));
  
  const unverifiedNouns = [];
  for (const noun of contentNouns) {
    const inCorpus = corpus.has(noun);
    const inFullTextWord = fullTextWords.has(noun);
    const isSafe = SAFE_GENERIC_WORDS.has(noun);
    
    if (!inCorpus && !inFullTextWord && !isSafe) {
      unverifiedNouns.push(noun);
    }
  }
  
  if (unverifiedNouns.length > 0) {
    result.valid = false;
    result.failures.push(`unverified_nouns: [${unverifiedNouns.join(', ')}]`);
  }
  
  return result;
}

function enforceLowercase(greeting) {
  if (!greeting) return greeting;
  const lines = greeting.split('\n');
  if (lines[0] && lines[0].length > 0) {
    lines[0] = lines[0][0].toLowerCase() + lines[0].slice(1);
  }
  return lines.join('\n');
}

function buildRepairPrompt(originalGreeting, failures, verifiedSources) {
  const allowedRefs = [];
  
  if (verifiedSources.conversationTopics?.length > 0) {
    allowedRefs.push(`Recent topics: ${verifiedSources.conversationTopics.join(', ')}`);
  }
  if (verifiedSources.coreThemes?.length > 0) {
    allowedRefs.push(`Known themes: ${verifiedSources.coreThemes.join(', ')}`);
  }
  if (verifiedSources.goals?.length > 0) {
    const goalTexts = verifiedSources.goals.map(g => typeof g === 'string' ? g : g.text).filter(Boolean);
    if (goalTexts.length > 0) allowedRefs.push(`Goals: ${goalTexts.join(', ')}`);
  }
  if (verifiedSources.userFacts?.length > 0) {
    allowedRefs.push(`Known facts: ${verifiedSources.userFacts.slice(0, 5).join(', ')}`);
  }
  if (verifiedSources.recentUserMessages?.length > 0) {
    allowedRefs.push(`Recent messages: ${verifiedSources.recentUserMessages.slice(0, 3).map(m => `"${m.slice(0, 60)}"`).join(', ')}`);
  }
  
  const refsBlock = allowedRefs.length > 0 
    ? allowedRefs.join('\n') 
    : '(No verified memory available)';
  
  return `STRICT REPAIR: Your previous greeting was rejected because it referenced things not in verified memory.

REJECTED: "${originalGreeting}"
REASON: ${failures.join('; ')}

ALLOWED REFERENCES (you may ONLY reference these):
${refsBlock}

RULES:
- Line 1: lowercase greeting (e.g., "hey." or "morning.")
- Line 2: question about something from ALLOWED REFERENCES only, or a simple open-ended question
- NEVER invent topics, events, recipes, meetings, flights, or anything not listed above
- If no references available, just say: "hey.\\nwant to regulate or reflect?"
- Max 2 lines total
- All lowercase

Return ONLY the greeting text.`;
}

const MINIMAL_FALLBACK = "hey.\nwant to regulate or reflect?";

module.exports = {
  validateGreeting,
  enforceLowercase,
  buildRepairPrompt,
  extractContentNouns,
  buildVerifiedCorpus,
  MINIMAL_FALLBACK,
};
