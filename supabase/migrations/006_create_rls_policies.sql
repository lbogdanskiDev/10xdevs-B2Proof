-- Migration: 006_create_rls_policies.sql
-- Description: Enable Row Level Security and create security policies
-- Date: 2025-01-15
-- Author: System

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY profiles_select_own
  ON profiles
  FOR SELECT
  USING ((SELECT auth.uid()) = id);

COMMENT ON POLICY profiles_select_own ON profiles IS 'Users can view their own profile';

-- Users can insert their own profile (for manual profile creation if needed)
CREATE POLICY profiles_insert_own
  ON profiles
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

COMMENT ON POLICY profiles_insert_own ON profiles IS 'Users can create their own profile during registration';

-- Users can update their own profile
CREATE POLICY profiles_update_own
  ON profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

COMMENT ON POLICY profiles_update_own ON profiles IS 'Users can update their own profile (e.g., change role)';

-- Users can delete their own profile
CREATE POLICY profiles_delete_own
  ON profiles
  FOR DELETE
  USING ((SELECT auth.uid()) = id);

COMMENT ON POLICY profiles_delete_own ON profiles IS 'Users can delete their own profile';

-- ============================================================================
-- BRIEFS POLICIES
-- ============================================================================

-- Users can view briefs they own or have been granted access to
CREATE POLICY briefs_select_accessible
  ON briefs
  FOR SELECT
  USING (
    owner_id = (SELECT auth.uid()) OR
    user_has_brief_access(id)
  );

COMMENT ON POLICY briefs_select_accessible ON briefs IS 'Users can view briefs they own or have access to';

-- Only creators can insert briefs
CREATE POLICY briefs_insert_creators_only
  ON briefs
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = owner_id AND
    (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'creator'
  );

COMMENT ON POLICY briefs_insert_creators_only ON briefs IS 'Only creators can create new briefs';

-- Only brief owners can update their briefs
CREATE POLICY briefs_update_own
  ON briefs
  FOR UPDATE
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

COMMENT ON POLICY briefs_update_own ON briefs IS 'Only brief owners can update their briefs';

-- Only brief owners can delete their briefs
CREATE POLICY briefs_delete_own
  ON briefs
  FOR DELETE
  USING (owner_id = (SELECT auth.uid()));

COMMENT ON POLICY briefs_delete_own ON briefs IS 'Only brief owners can delete their briefs';

-- ============================================================================
-- BRIEF_RECIPIENTS POLICIES
-- ============================================================================

-- Users can view recipients if they own the brief
CREATE POLICY brief_recipients_select_own_briefs
  ON brief_recipients
  FOR SELECT
  USING (
    (SELECT owner_id FROM briefs WHERE id = brief_id) = (SELECT auth.uid())
  );

COMMENT ON POLICY brief_recipients_select_own_briefs ON brief_recipients IS 'Brief owners can view recipient list';

-- Only brief owners can share briefs (insert recipients)
CREATE POLICY brief_recipients_insert_own_briefs
  ON brief_recipients
  FOR INSERT
  WITH CHECK (
    (SELECT owner_id FROM briefs WHERE id = brief_id) = (SELECT auth.uid()) AND
    shared_by = (SELECT auth.uid())
  );

COMMENT ON POLICY brief_recipients_insert_own_briefs ON brief_recipients IS 'Only brief owners can share briefs';

-- Only brief owners can revoke access (delete recipients)
CREATE POLICY brief_recipients_delete_own_briefs
  ON brief_recipients
  FOR DELETE
  USING (
    (SELECT owner_id FROM briefs WHERE id = brief_id) = (SELECT auth.uid())
  );

COMMENT ON POLICY brief_recipients_delete_own_briefs ON brief_recipients IS 'Only brief owners can revoke access';

-- No UPDATE policy - recipients are immutable (delete and recreate if needed)

-- ============================================================================
-- COMMENTS POLICIES
-- ============================================================================

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

-- Users can only delete their own comments
CREATE POLICY comments_delete_own
  ON comments
  FOR DELETE
  USING (author_id = (SELECT auth.uid()));

COMMENT ON POLICY comments_delete_own ON comments IS 'Users can only delete their own comments';

-- No UPDATE policy - comments are immutable (delete and recreate if editing is needed)

-- ============================================================================
-- AUDIT_LOG POLICIES
-- ============================================================================

-- Users can view their own audit trail
CREATE POLICY audit_log_select_own
  ON audit_log
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

COMMENT ON POLICY audit_log_select_own ON audit_log IS 'Users can view their own audit trail (GDPR compliance)';

-- No INSERT/UPDATE/DELETE policies - only triggers can write to this table
-- This ensures audit integrity

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- List all policies
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Test RLS (run as different users)
-- -- Set user context (simulates authenticated user)
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claim.sub = 'user-uuid-here';
--
-- -- Try to select briefs (should only see own and shared)
-- SELECT * FROM briefs;
--
-- -- Try to insert brief as client (should fail)
-- INSERT INTO briefs (owner_id, header, content) VALUES (auth.uid(), 'Test', '{}');

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- -- Drop all policies
-- DROP POLICY IF EXISTS audit_log_select_own ON audit_log;
-- DROP POLICY IF EXISTS comments_delete_own ON comments;
-- DROP POLICY IF EXISTS comments_insert_accessible_briefs ON comments;
-- DROP POLICY IF EXISTS comments_select_accessible_briefs ON comments;
-- DROP POLICY IF EXISTS brief_recipients_delete_own_briefs ON brief_recipients;
-- DROP POLICY IF EXISTS brief_recipients_insert_own_briefs ON brief_recipients;
-- DROP POLICY IF EXISTS brief_recipients_select_own_briefs ON brief_recipients;
-- DROP POLICY IF EXISTS briefs_delete_own ON briefs;
-- DROP POLICY IF EXISTS briefs_update_own ON briefs;
-- DROP POLICY IF EXISTS briefs_insert_creators_only ON briefs;
-- DROP POLICY IF EXISTS briefs_select_accessible ON briefs;
-- DROP POLICY IF EXISTS profiles_delete_own ON profiles;
-- DROP POLICY IF EXISTS profiles_update_own ON profiles;
-- DROP POLICY IF EXISTS profiles_insert_own ON profiles;
-- DROP POLICY IF EXISTS profiles_select_own ON profiles;
--
-- -- Disable RLS
-- ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE brief_recipients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE briefs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
