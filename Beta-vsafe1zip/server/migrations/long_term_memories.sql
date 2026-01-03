-- TRACE Long-Term Memory Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS long_term_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind VARCHAR(50) NOT NULL CHECK (kind IN ('identity', 'themes', 'goals', 'triggers', 'preferences')),
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ltm_user_id ON long_term_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_ltm_kind ON long_term_memories(kind);
CREATE INDEX IF NOT EXISTS idx_ltm_user_active ON long_term_memories(user_id, is_active);

ALTER TABLE long_term_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own memories"
  ON long_term_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can do everything"
  ON long_term_memories FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE long_term_memories IS 'Stores extracted insights from user conversations for TRACE memory';
COMMENT ON COLUMN long_term_memories.kind IS 'Type of memory: identity, themes, goals, triggers, preferences';
