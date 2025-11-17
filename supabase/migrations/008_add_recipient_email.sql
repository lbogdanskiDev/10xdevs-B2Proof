-- Migration: 008_add_recipient_email.sql
-- Description: Add recipient_email column to brief_recipients to support sharing with non-existent users
-- Date: 2025-01-16
-- Author: System

-- ============================================================================
-- SCHEMA CHANGES
-- ============================================================================

-- Step 1: Add recipient_email column (nullable initially for existing data)
ALTER TABLE brief_recipients
ADD COLUMN recipient_email TEXT;

COMMENT ON COLUMN brief_recipients.recipient_email IS 'Email address of recipient (allows sharing with non-existent users)';

-- Step 2: Populate recipient_email from auth.users for existing records
UPDATE brief_recipients br
SET recipient_email = au.email
FROM auth.users au
WHERE br.recipient_id = au.id
  AND br.recipient_email IS NULL;

-- Step 3: Make recipient_id nullable (allows pending invitations)
ALTER TABLE brief_recipients
ALTER COLUMN recipient_id DROP NOT NULL;

-- Step 4: Make recipient_email NOT NULL (required field)
ALTER TABLE brief_recipients
ALTER COLUMN recipient_email SET NOT NULL;

-- Step 5: Drop old unique constraint (brief_id, recipient_id)
ALTER TABLE brief_recipients
DROP CONSTRAINT unique_brief_recipient;

-- Step 6: Add new unique constraint on (brief_id, recipient_email)
-- This prevents duplicate shares to same email (regardless of user existence)
ALTER TABLE brief_recipients
ADD CONSTRAINT unique_brief_recipient_email UNIQUE (brief_id, recipient_email);

-- Step 7: Add check constraint to ensure email format
ALTER TABLE brief_recipients
ADD CONSTRAINT recipient_email_format_check CHECK (recipient_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================

-- Update user_has_brief_access function to handle recipient_email matching
-- This allows users who register with a pending email to automatically get access
-- Use CASCADE to drop dependent policies, which will be recreated automatically
DROP FUNCTION IF EXISTS user_has_brief_access(UUID) CASCADE;

CREATE OR REPLACE FUNCTION user_has_brief_access(brief_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
BEGIN
  -- Get current user ID and email
  current_user_id := auth.uid();

  -- Get current user email from auth.users
  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = current_user_id;

  RETURN EXISTS (
    -- User is the owner
    SELECT 1 FROM public.briefs
    WHERE id = brief_id
      AND owner_id = current_user_id

    UNION

    -- User is a recipient (by ID or by email match)
    SELECT 1 FROM public.brief_recipients
    WHERE brief_recipients.brief_id = user_has_brief_access.brief_id
      AND (
        recipient_id = current_user_id
        OR recipient_email = current_user_email
      )
  );
END;
$$;

COMMENT ON FUNCTION user_has_brief_access IS 'Returns true if current user owns or has been granted access to the brief (by ID or email)';

-- Recreate policies that were dropped by CASCADE
-- Users can view briefs they own or have been granted access to
CREATE POLICY briefs_select_accessible
  ON briefs
  FOR SELECT
  USING (
    owner_id = (SELECT auth.uid()) OR
    user_has_brief_access(id)
  );

COMMENT ON POLICY briefs_select_accessible ON briefs IS 'Users can view briefs they own or have access to';

-- Users can view comments on briefs they have access to
CREATE POLICY comments_select_accessible_briefs
  ON comments
  FOR SELECT
  USING (
    user_has_brief_access(brief_id)
  );

COMMENT ON POLICY comments_select_accessible_briefs ON comments IS 'Users can view comments on briefs they have access to';

-- Users can create comments on briefs they have access to
CREATE POLICY comments_insert_accessible_briefs
  ON comments
  FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid()) AND
    user_has_brief_access(brief_id)
  );

COMMENT ON POLICY comments_insert_accessible_briefs ON comments IS 'Users can comment on briefs they have access to';

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Update auto_update_recipient_id trigger function
-- Automatically fills recipient_id when user registers with pending email
CREATE OR REPLACE FUNCTION auto_update_recipient_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- When a new user is created, update any pending invitations with their email
  UPDATE public.brief_recipients
  SET recipient_id = NEW.id
  WHERE recipient_email = NEW.email
    AND recipient_id IS NULL;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_update_recipient_id IS 'Trigger function: Auto-updates recipient_id when user registers with pending invitation email';

-- Create trigger on auth.users (fires after INSERT)
-- Note: This requires SECURITY DEFINER on the function to access auth schema
DROP TRIGGER IF EXISTS update_pending_recipients_on_user_create ON auth.users;

CREATE TRIGGER update_pending_recipients_on_user_create
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_recipient_id();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify schema changes
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'brief_recipients'
-- ORDER BY ordinal_position;

-- Verify constraints
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'brief_recipients'::regclass;

-- Test pending invitation flow
-- INSERT INTO brief_recipients (brief_id, recipient_email, shared_by)
-- VALUES ('some-brief-uuid', 'pending@example.com', 'owner-uuid');

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP TRIGGER IF EXISTS update_pending_recipients_on_user_create ON auth.users;
-- DROP FUNCTION IF EXISTS auto_update_recipient_id() CASCADE;
-- DROP FUNCTION IF EXISTS user_has_brief_access(UUID) CASCADE;
-- ALTER TABLE brief_recipients DROP CONSTRAINT IF EXISTS recipient_email_format_check;
-- ALTER TABLE brief_recipients DROP CONSTRAINT IF EXISTS unique_brief_recipient_email;
-- ALTER TABLE brief_recipients ADD CONSTRAINT unique_brief_recipient UNIQUE (brief_id, recipient_id);
-- ALTER TABLE brief_recipients ALTER COLUMN recipient_email DROP NOT NULL;
-- ALTER TABLE brief_recipients ALTER COLUMN recipient_id SET NOT NULL;
-- ALTER TABLE brief_recipients DROP COLUMN recipient_email;
