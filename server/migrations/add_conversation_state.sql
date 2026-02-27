-- Add conversation_state JSONB column to user_settings
-- Persists conversation state across server restarts
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT NULL;
