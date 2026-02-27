-- Personal Anniversaries Table
-- Stores meaningful personal dates (loss, sobriety, transitions) for contextual awareness
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS personal_anniversaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  label VARCHAR(255),
  category VARCHAR(50) DEFAULT 'other',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_personal_anniversaries_user_id 
  ON personal_anniversaries(user_id);

-- Index for active anniversaries
CREATE INDEX IF NOT EXISTS idx_personal_anniversaries_active 
  ON personal_anniversaries(user_id, is_active) 
  WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE personal_anniversaries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own anniversaries"
  ON personal_anniversaries FOR SELECT
  USING (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own anniversaries"
  ON personal_anniversaries FOR INSERT
  WITH CHECK (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own anniversaries"
  ON personal_anniversaries FOR UPDATE
  USING (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own anniversaries"
  ON personal_anniversaries FOR DELETE
  USING (user_id = auth.uid()::text OR user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service role bypass for server operations
CREATE POLICY "Service role full access"
  ON personal_anniversaries FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- Categories:
-- 'loss' - death of loved one, pet, relationship ending
-- 'sobriety' - sobriety date, recovery milestone
-- 'trauma' - traumatic event date
-- 'transition' - major life change (divorce, job loss, move)
-- 'other' - any other personally meaningful date
