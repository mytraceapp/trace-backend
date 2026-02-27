-- Add first-run onboarding fields to profiles table
-- Run this in your Supabase SQL Editor

-- Add columns for tracking first-run completion
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_run_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS first_run_completed_at TIMESTAMPTZ;

-- Add index for efficient bootstrap queries
CREATE INDEX IF NOT EXISTS idx_profiles_first_run ON profiles(first_run_completed);

-- Ensure preferred_name column exists (for name personalization)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_name TEXT;
