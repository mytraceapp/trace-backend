-- Dynamic Facts Table
-- Stores facts that change over time (current president, etc.)
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS dynamic_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_dynamic_facts_key ON dynamic_facts(key);

ALTER TABLE dynamic_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read facts" ON dynamic_facts
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage facts" ON dynamic_facts
  FOR ALL USING (auth.role() = 'service_role');

-- Insert current US president
INSERT INTO dynamic_facts (key, value, updated_by)
VALUES (
  'current_us_president',
  '{"name": "Donald Trump", "since": "January 2025"}',
  'system'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
