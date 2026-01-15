-- Privacy by Design Tables for TRACE
-- Run this in Supabase SQL Editor

-- Table 1: Summaries only (privacy-first default)
CREATE TABLE IF NOT EXISTS trace_entries_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  summary_text TEXT NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('chat', 'journal', 'activity')),
  tags JSONB DEFAULT '[]'::jsonb,
  word_count INTEGER,
  sentiment VARCHAR(20)
);

-- Table 2: Raw text (only if user opts in)
CREATE TABLE IF NOT EXISTS trace_entries_raw (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  raw_text TEXT NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('chat', 'journal', 'activity')),
  summary_id UUID REFERENCES trace_entries_summary(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trace_summary_device ON trace_entries_summary(device_id);
CREATE INDEX IF NOT EXISTS idx_trace_summary_user ON trace_entries_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_trace_summary_created ON trace_entries_summary(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trace_raw_device ON trace_entries_raw(device_id);
CREATE INDEX IF NOT EXISTS idx_trace_raw_user ON trace_entries_raw(user_id);

-- RLS Policies for trace_entries_summary
ALTER TABLE trace_entries_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own summary entries" ON trace_entries_summary;
CREATE POLICY "Users can view own summary entries" ON trace_entries_summary
  FOR SELECT USING (
    auth.uid() = user_id OR 
    device_id = (current_setting('request.headers', true)::json->>'x-device-id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert own summary entries" ON trace_entries_summary;
CREATE POLICY "Users can insert own summary entries" ON trace_entries_summary
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    device_id = (current_setting('request.headers', true)::json->>'x-device-id')::uuid
  );

DROP POLICY IF EXISTS "Users can delete own summary entries" ON trace_entries_summary;
CREATE POLICY "Users can delete own summary entries" ON trace_entries_summary
  FOR DELETE USING (
    auth.uid() = user_id OR 
    device_id = (current_setting('request.headers', true)::json->>'x-device-id')::uuid
  );

-- RLS Policies for trace_entries_raw
ALTER TABLE trace_entries_raw ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own raw entries" ON trace_entries_raw;
CREATE POLICY "Users can view own raw entries" ON trace_entries_raw
  FOR SELECT USING (
    auth.uid() = user_id OR 
    device_id = (current_setting('request.headers', true)::json->>'x-device-id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert own raw entries" ON trace_entries_raw;
CREATE POLICY "Users can insert own raw entries" ON trace_entries_raw
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    device_id = (current_setting('request.headers', true)::json->>'x-device-id')::uuid
  );

DROP POLICY IF EXISTS "Users can delete own raw entries" ON trace_entries_raw;
CREATE POLICY "Users can delete own raw entries" ON trace_entries_raw
  FOR DELETE USING (
    auth.uid() = user_id OR 
    device_id = (current_setting('request.headers', true)::json->>'x-device-id')::uuid
  );

-- Service role bypass for server-side operations
DROP POLICY IF EXISTS "Service role full access summary" ON trace_entries_summary;
CREATE POLICY "Service role full access summary" ON trace_entries_summary
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access raw" ON trace_entries_raw;
CREATE POLICY "Service role full access raw" ON trace_entries_raw
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Add privacy preference to user_settings if not exists
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS store_raw_content BOOLEAN DEFAULT false;

-- Comment: Run this SQL in Supabase Dashboard > SQL Editor
