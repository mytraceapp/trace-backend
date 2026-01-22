-- Migration: Create feedback loop tables
-- Version: 001
-- Date: 2026-01-22
-- Description: Creates user_signals and user_learnings tables for TRACE feedback loop system

-- User signals table - captures conversation signals from frontend
CREATE TABLE IF NOT EXISTS user_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  conversation_id VARCHAR(255) NOT NULL,
  signal_timestamp BIGINT NOT NULL,
  
  -- Response metrics
  response_length VARCHAR(20),
  response_tone VARCHAR(20),
  
  -- Activity metrics
  activity_suggested VARCHAR(100),
  activity_completed BOOLEAN,
  activity_completion_time INT,
  
  -- Engagement metrics
  user_returned_24h BOOLEAN,
  conversation_length INT,
  user_sentiment VARCHAR(20),
  user_followed_advice BOOLEAN,
  user_continued_conversation BOOLEAN,
  user_asked_for_activity BOOLEAN,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_signals ON user_signals(user_id, signal_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_tracking ON user_signals(user_id, activity_suggested);

-- User learnings table - stores analyzed patterns and preferences
CREATE TABLE IF NOT EXISTS user_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) UNIQUE NOT NULL,
  last_analyzed_at BIGINT NOT NULL,
  
  -- Activity effectiveness scores (JSON)
  activity_scores JSONB DEFAULT '{}',
  
  -- Response preferences
  preferred_response_length VARCHAR(20),
  preferred_response_tone VARCHAR(20),
  
  -- Engagement patterns
  best_engagement_time VARCHAR(20),
  avg_conversation_length FLOAT,
  
  -- User tendency
  user_tendency VARCHAR(20),
  escalating_frequency FLOAT,
  
  -- Activity preference
  user_prefers VARCHAR(30),
  ask_for_activity_rate FLOAT,
  
  -- Confidence metrics
  data_points INT DEFAULT 0,
  confidence FLOAT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for learnings lookup
CREATE INDEX IF NOT EXISTS idx_user_learnings ON user_learnings(user_id);

-- Rollback:
-- DROP TABLE IF EXISTS user_signals;
-- DROP TABLE IF EXISTS user_learnings;
