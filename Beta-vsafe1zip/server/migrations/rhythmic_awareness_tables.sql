-- Rhythmic Awareness & Weekly Letters Tables
-- Run this in your Supabase SQL Editor

-- 1. User Touchpoints - tracks when contextual messages were shown
-- Prevents repeating the same rhythmic awareness lines too frequently
CREATE TABLE IF NOT EXISTS user_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_touchpoints_user_kind 
ON user_touchpoints(user_id, kind, created_at DESC);

ALTER TABLE user_touchpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own touchpoints" ON user_touchpoints
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage touchpoints" ON user_touchpoints
  FOR ALL USING (auth.role() = 'service_role');

-- 2. Weekly Reflections - stores AI-generated weekly letters
CREATE TABLE IF NOT EXISTS weekly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reflections_user_week 
ON weekly_reflections(user_id, week_start DESC);

ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reflections" ON weekly_reflections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage reflections" ON weekly_reflections
  FOR ALL USING (auth.role() = 'service_role');

-- 3. Add trigger to update updated_at on weekly_reflections
CREATE OR REPLACE FUNCTION update_weekly_reflections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_weekly_reflections_updated_at ON weekly_reflections;
CREATE TRIGGER trigger_weekly_reflections_updated_at
  BEFORE UPDATE ON weekly_reflections
  FOR EACH ROW
  EXECUTE FUNCTION update_weekly_reflections_updated_at();
