/**
 * Context Bullets Extractor
 * 
 * Extracts concise bullet points from existing context objects for traceIntent.selectedContext.
 * These are used in V2 prompt building to provide focused context without the full injection blocks.
 * 
 * Design: Keep brainSynthesis pure - extraction happens in /api/chat before synthesis.
 */

/**
 * Extract memory bullets from memoryContext string.
 * memoryContext is built by coreMemory.buildMemoryContext() and contains lines like:
 * - Facts: x; y; z
 * - Themes: a, b, c
 * - Goals: goal1; goal2
 * 
 * @param {string|object} memoryContext - The memory context (string or structured)
 * @returns {string[]} Array of concise bullets
 */
function pickMemoryBullets(memoryContext) {
  if (!memoryContext) return [];
  
  // If it's already an array of bullets
  if (Array.isArray(memoryContext.bullets)) {
    return memoryContext.bullets.slice(0, 6);
  }
  
  // If it's a string (from buildMemoryContext), extract key lines
  if (typeof memoryContext === 'string') {
    const bullets = [];
    const lines = memoryContext.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      // Skip headers
      if (line.includes('USER MEMORY') || line.includes('PRIOR SESSIONS')) continue;
      
      // Extract fact/theme/goal lines
      const trimmed = line.replace(/^-\s*/, '').trim();
      if (trimmed && trimmed.length > 3 && trimmed.length < 200) {
        bullets.push(trimmed);
      }
      
      if (bullets.length >= 6) break;
    }
    
    return bullets;
  }
  
  // If it's structured with facts array
  if (Array.isArray(memoryContext.facts)) {
    return memoryContext.facts.slice(0, 6).map(String);
  }
  
  return [];
}

/**
 * Extract pattern bullets from safe pattern context.
 * patternContext from getSafePatternContext() has: consent, canOfferConsent, patternSummary
 * 
 * @param {object} patternContext - Pattern context object
 * @returns {string[]} Array of concise bullets
 */
function pickPatternBullets(patternContext) {
  if (!patternContext) return [];
  
  // If it has pre-formatted bullets
  if (Array.isArray(patternContext.bullets)) {
    return patternContext.bullets.slice(0, 4);
  }
  
  const out = [];
  
  // Extract from patternSummary if available
  if (patternContext.patternSummary) {
    const summary = patternContext.patternSummary;
    
    // Peak windows
    if (summary.peaks?.length) {
      out.push(`Peak energy: ${summary.peaks.slice(0, 2).join(', ')}`);
    }
    
    // Stress echoes
    if (summary.stress_echoes?.length) {
      out.push(`Stress patterns: ${summary.stress_echoes.slice(0, 2).join(', ')}`);
    }
    
    // Rhythm
    if (summary.rhythm) {
      out.push(`Weekly rhythm: ${summary.rhythm}`);
    }
    
    // Energy tides
    if (summary.energy_tides) {
      out.push(`Energy: ${summary.energy_tides}`);
    }
  }
  
  return out.slice(0, 4);
}

/**
 * Extract activity-related bullets from outcomes and reflection context.
 * 
 * @param {Array} activityOutcomes - Array of {activity, label, avgImprovement, completions}
 * @param {object} reflectionContext - Post-activity reflection state
 * @returns {string[]} Array of concise bullets
 */
function pickActivityBullets(activityOutcomes, reflectionContext) {
  const out = [];
  
  // Most helpful activities
  if (Array.isArray(activityOutcomes) && activityOutcomes.length > 0) {
    const helpful = activityOutcomes
      .filter(a => a.avgImprovement > 0)
      .slice(0, 2)
      .map(a => a.label || a.activity);
    
    if (helpful.length > 0) {
      out.push(`Helpful activities: ${helpful.join(', ')}`);
    }
  }
  
  // Post-activity state
  if (reflectionContext?.postActivityState) {
    out.push(`Post-activity: ${String(reflectionContext.postActivityState)}`);
  }
  
  // Recent activity context
  if (reflectionContext?.recentActivity) {
    out.push(`Just did: ${reflectionContext.recentActivity}`);
  }
  
  return out.slice(0, 2);
}

/**
 * Format dreamscape history into a single bullet.
 * 
 * @param {object} dreamscapeHistory - {trackId, daysAgo, ...}
 * @returns {string|null} Single bullet or null
 */
function formatDreamBullet(dreamscapeHistory) {
  if (!dreamscapeHistory) return null;
  
  const track = dreamscapeHistory.trackId || dreamscapeHistory.track_id || dreamscapeHistory.track || dreamscapeHistory.lastTrack || null;
  const days = dreamscapeHistory.daysAgo ?? dreamscapeHistory.days_ago ?? null;
  
  if (!track && days == null) return null;
  
  if (track && days != null) {
    return `Dreamscape: ${track} (${days}d ago)`;
  }
  if (track) {
    return `Dreamscape: ${track}`;
  }
  return `Dreamscape session: ${days}d ago`;
}

/**
 * Extract anti-repetition openers from recent assistant messages.
 * 
 * @param {Array} messages - Chat messages array
 * @returns {string[]} Array of recent openers to avoid
 */
function extractRecentOpeners(messages) {
  if (!Array.isArray(messages)) return [];
  
  return messages
    .filter(m => m.role === 'assistant')
    .slice(-3) // Last 3 assistant responses
    .map(m => {
      const content = m.content || '';
      // Extract first sentence/line as "opener" (up to 80 chars)
      const opener = content.split(/[.!?\n]/)[0]?.trim()?.slice(0, 80) || '';
      return opener;
    })
    .filter(Boolean);
}

module.exports = {
  pickMemoryBullets,
  pickPatternBullets,
  pickActivityBullets,
  formatDreamBullet,
  extractRecentOpeners,
};
