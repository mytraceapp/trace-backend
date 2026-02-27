-- Migration: Add lat/lon columns to profiles for weather support
-- Run this in Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS lon DECIMAL(11, 8);

COMMENT ON COLUMN profiles.lat IS 'User latitude for weather lookups';
COMMENT ON COLUMN profiles.lon IS 'User longitude for weather lookups';
