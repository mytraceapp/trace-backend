// server/traceFeedback.js
// TRACE Feedback Loop System - Signal ingestion, pattern analysis, and learning

const { v4: uuidv4 } = require('uuid');

async function storeSignal(pool, signal) {
  const query = `
    INSERT INTO user_signals (
      id, user_id, conversation_id, signal_timestamp,
      response_length, response_tone,
      activity_suggested, activity_completed, activity_completion_time,
      user_returned_24h, conversation_length, user_sentiment,
      user_followed_advice, user_continued_conversation, user_asked_for_activity
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id
  `;
  
  const values = [
    uuidv4(),
    signal.userId,
    signal.conversationId,
    signal.timestamp,
    signal.responseLength || null,
    signal.responseTone || null,
    signal.activitySuggested || null,
    signal.activityCompleted || null,
    signal.activityCompletionTime || null,
    signal.userReturned24h || null,
    signal.conversationLength || null,
    signal.userSentiment || null,
    signal.userFollowedAdvice || null,
    signal.userContinuedConversation || null,
    signal.userAskedForActivity || null,
  ];
  
  try {
    const result = await pool.query(query, values);
    return result.rows[0]?.id;
  } catch (err) {
    console.error(`[FEEDBACK] storeSignal failed for user ${signal.userId?.substring(0, 8)}:`, err.message);
    return null;
  }
}

async function getSignalsForUser(pool, userId, limit = 100) {
  const query = `
    SELECT * FROM user_signals 
    WHERE user_id = $1 
    ORDER BY signal_timestamp DESC 
    LIMIT $2
  `;
  const result = await pool.query(query, [userId, limit]);
  return result.rows;
}

async function getSignalCount(pool, userId) {
  const query = `SELECT COUNT(*) as count FROM user_signals WHERE user_id = $1`;
  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0]?.count || 0);
}

function calculateActivityScores(signals) {
  const activities = {};
  
  for (const signal of signals) {
    if (!signal.activity_suggested) continue;
    
    const name = signal.activity_suggested;
    if (!activities[name]) {
      activities[name] = {
        suggestedCount: 0,
        completedCount: 0,
        totalCompletionTime: 0,
        returnCount: 0,
      };
    }
    
    activities[name].suggestedCount++;
    if (signal.activity_completed) {
      activities[name].completedCount++;
      if (signal.activity_completion_time) {
        activities[name].totalCompletionTime += signal.activity_completion_time;
      }
      if (signal.user_returned_24h) {
        activities[name].returnCount++;
      }
    }
  }
  
  const scores = {};
  for (const [name, data] of Object.entries(activities)) {
    const completionRate = data.suggestedCount > 0 
      ? data.completedCount / data.suggestedCount 
      : 0;
    const avgCompletionTime = data.completedCount > 0 
      ? data.totalCompletionTime / data.completedCount 
      : 0;
    const returnRate24h = data.completedCount > 0 
      ? data.returnCount / data.completedCount 
      : 0;
    
    scores[name] = {
      suggestedCount: data.suggestedCount,
      completedCount: data.completedCount,
      completionRate: Math.round(completionRate * 100) / 100,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
      returnRate24h: Math.round(returnRate24h * 100) / 100,
    };
  }
  
  return scores;
}

function calculateResponsePreference(signals, field) {
  const counts = { short: 0, medium: 0, long: 0, warm: 0, practical: 0, reflective: 0 };
  let total = 0;
  
  for (const signal of signals) {
    const value = signal[field];
    if (value && counts.hasOwnProperty(value)) {
      counts[value]++;
      total++;
    }
  }
  
  if (total === 0) return 'mixed';
  
  for (const [key, count] of Object.entries(counts)) {
    if (count / total > 0.7) return key;
  }
  
  return 'mixed';
}

function calculateEngagementTime(signals) {
  const timeSlots = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  let total = 0;
  
  for (const signal of signals) {
    if (!signal.signal_timestamp) continue;
    
    const date = new Date(signal.signal_timestamp);
    const hour = date.getHours();
    
    if (hour >= 6 && hour < 12) timeSlots.morning++;
    else if (hour >= 12 && hour < 18) timeSlots.afternoon++;
    else if (hour >= 18 && hour < 24) timeSlots.evening++;
    else timeSlots.night++;
    
    total++;
  }
  
  if (total === 0) return 'varied';
  
  for (const [slot, count] of Object.entries(timeSlots)) {
    if (count / total > 0.7) return slot;
  }
  
  return 'varied';
}

function calculateUserTendency(signals) {
  let escalating = 0;
  let calm = 0;
  let processing = 0;
  
  for (const signal of signals) {
    if (signal.user_sentiment === 'escalating') escalating++;
    else if (signal.user_sentiment === 'calm') calm++;
    else if (signal.user_sentiment === 'processing') processing++;
  }
  
  const total = escalating + calm + processing;
  if (total === 0) return { tendency: 'mixed', escalatingFrequency: 0 };
  
  const escalatingRate = escalating / total;
  
  if (escalatingRate > 0.5) return { tendency: 'escalating', escalatingFrequency: escalatingRate };
  if (escalatingRate < 0.2) return { tendency: 'calm', escalatingFrequency: escalatingRate };
  
  return { tendency: 'processing', escalatingFrequency: escalatingRate };
}

function calculateActivityPreference(signals) {
  let askedForActivity = 0;
  let total = 0;
  
  for (const signal of signals) {
    if (signal.user_asked_for_activity !== null) {
      total++;
      if (signal.user_asked_for_activity) askedForActivity++;
    }
  }
  
  if (total === 0) return { preference: 'mixed', askRate: 0 };
  
  const askRate = askedForActivity / total;
  
  if (askRate > 0.4) return { preference: 'activity_suggestions', askRate };
  if (askRate < 0.2) return { preference: 'listening', askRate };
  
  return { preference: 'mixed', askRate };
}

function calculateAvgConversationLength(signals) {
  let total = 0;
  let count = 0;
  
  for (const signal of signals) {
    if (signal.conversation_length) {
      total += signal.conversation_length;
      count++;
    }
  }
  
  return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
}

function calculateConfidence(dataPoints) {
  if (dataPoints < 5) return 0;
  if (dataPoints < 10) return 0.3;
  if (dataPoints < 20) return 0.5;
  if (dataPoints < 50) return 0.7;
  return 0.9;
}

async function analyzeLearnings(pool, userId) {
  const signals = await getSignalsForUser(pool, userId, 200);
  const dataPoints = signals.length;
  
  if (dataPoints === 0) {
    return {
      userId,
      lastAnalyzedAt: Date.now(),
      activityScores: {},
      preferredResponseLength: 'mixed',
      preferredResponseTone: 'mixed',
      bestEngagementTime: 'varied',
      avgConversationLength: 0,
      userTendency: 'mixed',
      escalatingFrequency: 0,
      userPrefers: 'mixed',
      askForActivityRate: 0,
      dataPoints: 0,
      confidence: 0,
    };
  }
  
  const activityScores = calculateActivityScores(signals);
  const preferredResponseLength = calculateResponsePreference(signals, 'response_length');
  const preferredResponseTone = calculateResponsePreference(signals, 'response_tone');
  const bestEngagementTime = calculateEngagementTime(signals);
  const avgConversationLength = calculateAvgConversationLength(signals);
  const { tendency, escalatingFrequency } = calculateUserTendency(signals);
  const { preference, askRate } = calculateActivityPreference(signals);
  const confidence = calculateConfidence(dataPoints);
  
  const learnings = {
    userId,
    lastAnalyzedAt: Date.now(),
    activityScores,
    preferredResponseLength,
    preferredResponseTone,
    bestEngagementTime,
    avgConversationLength,
    userTendency: tendency,
    escalatingFrequency: Math.round(escalatingFrequency * 100) / 100,
    userPrefers: preference,
    askForActivityRate: Math.round(askRate * 100) / 100,
    dataPoints,
    confidence,
  };
  
  await saveLearnings(pool, learnings);
  
  return learnings;
}

async function saveLearnings(pool, learnings) {
  const query = `
    INSERT INTO user_learnings (
      id, user_id, last_analyzed_at,
      activity_scores, preferred_response_length, preferred_response_tone,
      best_engagement_time, avg_conversation_length, user_tendency,
      escalating_frequency, user_prefers, ask_for_activity_rate,
      data_points, confidence, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      last_analyzed_at = EXCLUDED.last_analyzed_at,
      activity_scores = EXCLUDED.activity_scores,
      preferred_response_length = EXCLUDED.preferred_response_length,
      preferred_response_tone = EXCLUDED.preferred_response_tone,
      best_engagement_time = EXCLUDED.best_engagement_time,
      avg_conversation_length = EXCLUDED.avg_conversation_length,
      user_tendency = EXCLUDED.user_tendency,
      escalating_frequency = EXCLUDED.escalating_frequency,
      user_prefers = EXCLUDED.user_prefers,
      ask_for_activity_rate = EXCLUDED.ask_for_activity_rate,
      data_points = EXCLUDED.data_points,
      confidence = EXCLUDED.confidence,
      updated_at = NOW()
  `;
  
  const values = [
    uuidv4(),
    learnings.userId,
    learnings.lastAnalyzedAt,
    JSON.stringify(learnings.activityScores),
    learnings.preferredResponseLength,
    learnings.preferredResponseTone,
    learnings.bestEngagementTime,
    learnings.avgConversationLength,
    learnings.userTendency,
    learnings.escalatingFrequency,
    learnings.userPrefers,
    learnings.askForActivityRate,
    learnings.dataPoints,
    learnings.confidence,
  ];
  
  await pool.query(query, values);
}

async function getLearnings(pool, userId) {
  const query = `SELECT * FROM user_learnings WHERE user_id = $1`;
  const result = await pool.query(query, [userId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    userId: row.user_id,
    lastAnalyzedAt: parseInt(row.last_analyzed_at),
    activityScores: typeof row.activity_scores === 'string' 
      ? JSON.parse(row.activity_scores) 
      : row.activity_scores || {},
    preferredResponseLength: row.preferred_response_length || 'mixed',
    preferredResponseTone: row.preferred_response_tone || 'mixed',
    bestEngagementTime: row.best_engagement_time || 'varied',
    avgConversationLength: parseFloat(row.avg_conversation_length) || 0,
    userTendency: row.user_tendency || 'mixed',
    escalatingFrequency: parseFloat(row.escalating_frequency) || 0,
    userPrefers: row.user_prefers || 'mixed',
    askForActivityRate: parseFloat(row.ask_for_activity_rate) || 0,
    dataPoints: parseInt(row.data_points) || 0,
    confidence: parseFloat(row.confidence) || 0,
  };
}

function buildAdaptedPromptSection(learnings) {
  if (!learnings || learnings.dataPoints < 5) {
    return '';
  }
  
  const adaptations = [];
  
  if (learnings.preferredResponseLength === 'short') {
    adaptations.push('[ADAPTATION] User prefers brief, concise responses (2-3 sentences).');
  } else if (learnings.preferredResponseLength === 'long') {
    adaptations.push('[ADAPTATION] User appreciates detailed, thoughtful responses.');
  }
  
  if (learnings.preferredResponseTone === 'warm') {
    adaptations.push('[ADAPTATION] Lean into warmth, emotional resonance, comfort.');
  } else if (learnings.preferredResponseTone === 'practical') {
    adaptations.push('[ADAPTATION] This user sometimes finds practical next steps useful — offer them when the moment fits, not as default mode. Presence first.');
  } else if (learnings.preferredResponseTone === 'reflective') {
    adaptations.push('[ADAPTATION] Encourage introspection, deeper thinking.');
  }
  
  if (learnings.userPrefers === 'activity_suggestions') {
    adaptations.push('[ADAPTATION] This user responds well to activity suggestions. Include them naturally.');
  } else if (learnings.userPrefers === 'listening') {
    adaptations.push('[ADAPTATION] This user prefers listening/reflection over activity suggestions. Only suggest when user asks.');
  }
  
  if (learnings.escalatingFrequency > 0.5) {
    adaptations.push('[ADAPTATION] This user tends to escalate emotionally. Provide extra grounding, validation, safety checks.');
  } else if (learnings.escalatingFrequency < 0.2) {
    adaptations.push('[ADAPTATION] This user maintains calm. Can engage more intellectually/philosophically.');
  }
  
  const topActivities = Object.entries(learnings.activityScores || {})
    .filter(([_, score]) => score.completedCount > 0)
    .sort((a, b) => b[1].completionRate - a[1].completionRate)
    .slice(0, 3)
    .map(([name, score]) => `${name} (${Math.round(score.completionRate * 100)}%)`)
    .join(', ');
  
  if (topActivities) {
    adaptations.push(`[ADAPTATION] Most effective activities for this user: ${topActivities}. Suggest these first.`);
  }
  
  if (learnings.confidence < 0.5) {
    adaptations.push('[NOTE] Learnings confidence is low. Continue collecting signals before heavy adaptation.');
  }
  
  return adaptations.length > 0 ? '\n\n' + adaptations.join('\n') : '';
}

async function shouldReanalyze(pool, userId) {
  const learnings = await getLearnings(pool, userId);
  if (!learnings) return true;
  
  const signalCount = await getSignalCount(pool, userId);
  const newSignals = signalCount - learnings.dataPoints;
  
  if (newSignals >= 10) return true;
  
  const hoursSinceAnalysis = (Date.now() - learnings.lastAnalyzedAt) / (1000 * 60 * 60);
  if (hoursSinceAnalysis >= 24 && newSignals > 0) return true;
  
  return false;
}

async function getOrAnalyzeLearnings(pool, userId) {
  const needsReanalysis = await shouldReanalyze(pool, userId);
  
  if (needsReanalysis) {
    return await analyzeLearnings(pool, userId);
  }
  
  const existing = await getLearnings(pool, userId);
  return existing || await analyzeLearnings(pool, userId);
}

module.exports = {
  storeSignal,
  getSignalsForUser,
  getSignalCount,
  analyzeLearnings,
  getLearnings,
  getOrAnalyzeLearnings,
  buildAdaptedPromptSection,
};
