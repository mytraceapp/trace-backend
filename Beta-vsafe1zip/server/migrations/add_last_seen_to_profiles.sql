-- Migration: Add last_seen_at column to profiles table
-- This enables return warmth feature (detecting when users return after time away)

-- Add last_seen_at column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at 
ON profiles(last_seen_at);

-- Comment explaining the column
COMMENT ON COLUMN profiles.last_seen_at IS 'Timestamp of users last interaction, used for return warmth feature';
