const CRISIS_PRESENCE_FALLBACKS = [
  "still here with you.",
  "i'm not going anywhere.",
  "you don't have to say anything. i'm here.",
  "yeah. still here.",
  "what do you need right now — even if it's nothing.",
  "i hear you. keep talking to me.",
];

const SEMANTIC_CLUSTERS = [
  {
    name: 'safety',
    maxUses: 1,
    phrases: ['are you safe', 'are you okay right now', 'safe right now', 'are you in a safe place'],
  },
  {
    name: '988',
    maxUses: 1,
    phrases: ['988', 'crisis line', 'call or text'],
  },
  {
    name: 'not-alone',
    maxUses: 2,
    phrases: ['not alone', "don't have to face", "don't have to go through", "you're not alone"],
  },
  {
    name: 'feelings-valid',
    maxUses: 0,
    phrases: ['feelings are valid', 'okay to feel', 'feelings are important', 'your feelings'],
  },
  {
    name: 'heavy-burden',
    maxUses: 1,
    phrases: ['heavy burden', 'heavy weight', "that's a lot to carry", 'heavy to carry'],
  },
  {
    name: 'acknowledge-difficulty',
    maxUses: 1,
    phrases: ['incredibly heavy', 'incredibly difficult', 'going through a lot', 'so much right now', 'i want to acknowledge'],
  },
  {
    name: 'share-more',
    maxUses: 1,
    phrases: ['share more', 'share a bit more', 'tell me more', 'can you share', 'share what'],
  },
  {
    name: 'here-to-listen',
    maxUses: 1,
    phrases: ['here to listen', 'here for you', 'here to support'],
  },
];

function deduplicateResponse(proposedResponse, conversationHistory, { isCrisisMode = false } = {}) {
  if (!proposedResponse || typeof proposedResponse !== 'string') {
    return { isDuplicate: false, violations: [], replacement: null };
  }

  const proposedLower = proposedResponse.toLowerCase();

  const recentAssistantMessages = (conversationHistory || [])
    .filter(m => m.role === 'assistant')
    .slice(-6)
    .map(m => (m.content || '').toLowerCase());

  const violations = [];

  for (const cluster of SEMANTIC_CLUSTERS) {
    const proposedHasCluster = cluster.phrases.some(phrase => proposedLower.includes(phrase));
    if (!proposedHasCluster) continue;

    if (cluster.maxUses === 0) {
      violations.push(cluster.name);
      continue;
    }

    let historyCount = 0;
    for (const msg of recentAssistantMessages) {
      if (cluster.phrases.some(phrase => msg.includes(phrase))) {
        historyCount++;
      }
    }

    if (historyCount >= cluster.maxUses) {
      violations.push(cluster.name);
    }
  }

  if (violations.length === 0) {
    return { isDuplicate: false, violations: [], replacement: null };
  }

  let replacement = null;
  if (isCrisisMode) {
    const assistantCount = (conversationHistory || []).filter(m => m.role === 'assistant').length;
    const fallbackIndex = assistantCount % CRISIS_PRESENCE_FALLBACKS.length;
    replacement = CRISIS_PRESENCE_FALLBACKS[fallbackIndex];
  }

  return { isDuplicate: true, violations, replacement };
}

module.exports = { deduplicateResponse, SEMANTIC_CLUSTERS, CRISIS_PRESENCE_FALLBACKS };
