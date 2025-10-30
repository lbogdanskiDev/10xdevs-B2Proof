-- ============================================================
-- Add Mock User for Development Testing
-- ============================================================
-- This script creates a mock user profile for development testing
-- The mock user ID matches DEFAULT_USER_PROFILE in src/db/supabase.client.ts
-- ============================================================

-- Insert mock user into profiles table
INSERT INTO profiles (id, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'creator',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Verify the mock user was created
SELECT
  id,
  role,
  created_at,
  updated_at
FROM profiles
WHERE id = '00000000-0000-0000-0000-000000000000';
