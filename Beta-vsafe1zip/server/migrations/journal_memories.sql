-- TRACE Journal Memory Table
-- Run this in your Supabase SQL Editor
-- Stores summarized themes from journal entries for contextual chat references

CREATE TABLE IF NOT EXISTS journal_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  journal_entry_id UUID,
  theme TEXT NOT NULL,
  subject TEXT,
  emotional_tone VARCHAR(50),
  entry_date DATE NOT NULL,
  consent_given BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jm_user_id ON journal_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_jm_entry_date ON journal_memories(entry_date);
CREATE INDEX IF NOT EXISTS idx_jm_user_active ON journal_memories(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_jm_user_consent ON journal_memories(user_id, consent_given);

ALTER TABLE journal_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own journal memories"
  ON journal_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can do everything on journal memories"
  ON journal_memories FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE journal_memories IS 'Stores summarized themes from journal entries for TRACE contextual memory';
COMMENT ON COLUMN journal_memories.theme IS 'High-level theme extracted from journal (e.g., "relationship with mom", "work stress")';
COMMENT ON COLUMN journal_memories.subject IS 'Optional specific subject (e.g., "mom", "boss")';
COMMENT ON COLUMN journal_memories.emotional_tone IS 'Emotional tone of the entry (e.g., "reflective", "anxious", "hopeful")';
COMMENT ON COLUMN journal_memories.consent_given IS 'Whether user has consented to TRACE referencing this in conversation';
