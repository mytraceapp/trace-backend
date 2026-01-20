-- Add onboarding_step column to profiles for scripted onboarding flow
-- 
-- STEP SEQUENCE:
-- 1. intro_sent (initial state) - Bootstrap intro shown to user
-- 2. waiting_ok - After first user message, TRACE offers breathing activity 
-- 3. activity_in_progress - User said "okay", navigated to activity
-- 4. reflection_pending - Activity completed, waiting for user reflection
-- 5. completed - Reflection captured via /api/onboarding/reflection, onboarding done
--
-- Client responsibilities:
-- - Shows "Welcome back" message when activity completes
-- - Captures reflection and POSTs to /api/onboarding/reflection
-- - Shows handoff message client-side
--
-- Server responsibilities:
-- - /api/chat: Returns scripted responses for intro_sent, waiting_ok steps
-- - /api/onboarding/activity-complete: Updates step to reflection_pending
-- - /api/onboarding/reflection: Records reflection, sets onboarding_completed=true

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT 'intro_sent';

COMMENT ON COLUMN profiles.onboarding_step IS 'Tracks the current step in the scripted onboarding flow';
