-- Activity reflections table for onboarding flow
-- Stores user's felt_shift responses after completing activities during onboarding

CREATE TABLE IF NOT EXISTS activity_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id VARCHAR(100) NOT NULL,
  felt_shift TEXT NOT NULL,
  mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_user_id ON activity_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_activity_id ON activity_reflections(activity_id);
CREATE INDEX IF NOT EXISTS idx_ar_created_at ON activity_reflections(created_at);

ALTER TABLE activity_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own activity reflections"
  ON activity_reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity reflections"
  ON activity_reflections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can do everything on activity reflections"
  ON activity_reflections FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE activity_reflections IS 'Stores onboarding activity reflections with mood scores';
COMMENT ON COLUMN activity_reflections.activity_id IS 'Activity type: Breathing, Maze, Grounding, etc.';
COMMENT ON COLUMN activity_reflections.felt_shift IS 'User verbatim response to "Did that help at all?"';
COMMENT ON COLUMN activity_reflections.mood_score IS 'Normalized mood score 1-5 from felt_shift text';
