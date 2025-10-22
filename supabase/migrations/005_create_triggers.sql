-- Migration: 005_create_triggers.sql
-- Description: Create all database triggers for business logic automation
-- Date: 2025-01-15
-- Author: System

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles triggers
-- ----------------------------------------------------------------------------

-- Auto-update updated_at timestamp on profile modification
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

COMMENT ON TRIGGER update_profiles_updated_at ON profiles IS 'Automatically updates updated_at timestamp';

-- ----------------------------------------------------------------------------
-- briefs triggers
-- ----------------------------------------------------------------------------

-- Auto-update updated_at timestamp on brief modification
CREATE TRIGGER update_briefs_updated_at
  BEFORE UPDATE ON briefs
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

COMMENT ON TRIGGER update_briefs_updated_at ON briefs IS 'Automatically updates updated_at timestamp';

-- Enforce 20 brief limit for creators
CREATE TRIGGER enforce_creator_brief_limit_trigger
  BEFORE INSERT ON briefs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_creator_brief_limit();

COMMENT ON TRIGGER enforce_creator_brief_limit_trigger ON briefs IS 'Prevents creators from exceeding 20 brief limit';

-- Reset status to draft when content is edited
CREATE TRIGGER reset_status_on_brief_edit_trigger
  BEFORE UPDATE ON briefs
  FOR EACH ROW
  EXECUTE FUNCTION reset_status_on_brief_edit();

COMMENT ON TRIGGER reset_status_on_brief_edit_trigger ON briefs IS 'Resets brief status to draft when content/header/footer is modified';

-- ----------------------------------------------------------------------------
-- brief_recipients triggers
-- ----------------------------------------------------------------------------

-- Enforce 10 recipient limit per brief
CREATE TRIGGER enforce_recipient_limit_trigger
  BEFORE INSERT ON brief_recipients
  FOR EACH ROW
  EXECUTE FUNCTION enforce_recipient_limit();

COMMENT ON TRIGGER enforce_recipient_limit_trigger ON brief_recipients IS 'Prevents briefs from having more than 10 recipients';

-- Change brief status to 'sent' when first recipient is added
CREATE TRIGGER auto_change_status_to_sent_trigger
  AFTER INSERT ON brief_recipients
  FOR EACH ROW
  EXECUTE FUNCTION auto_change_status_to_sent();

COMMENT ON TRIGGER auto_change_status_to_sent_trigger ON brief_recipients IS 'Changes brief status to sent when shared with first recipient';

-- Reset status to draft when all recipients are removed
CREATE TRIGGER reset_status_on_all_recipients_removed_trigger
  AFTER DELETE ON brief_recipients
  FOR EACH ROW
  EXECUTE FUNCTION reset_status_on_all_recipients_removed();

COMMENT ON TRIGGER reset_status_on_all_recipients_removed_trigger ON brief_recipients IS 'Resets brief status to draft when last recipient is removed';

-- ----------------------------------------------------------------------------
-- comments triggers
-- ----------------------------------------------------------------------------

-- Increment comment count when comment is added
CREATE TRIGGER update_comment_count_on_insert_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_count_on_insert();

COMMENT ON TRIGGER update_comment_count_on_insert_trigger ON comments IS 'Increments denormalized comment count on brief';

-- Decrement comment count when comment is deleted
CREATE TRIGGER update_comment_count_on_delete_trigger
  AFTER DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_count_on_delete();

COMMENT ON TRIGGER update_comment_count_on_delete_trigger ON comments IS 'Decrements denormalized comment count on brief';

-- Audit comment deletions
CREATE TRIGGER audit_comment_deletion_trigger
  BEFORE DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION audit_comment_deletion();

COMMENT ON TRIGGER audit_comment_deletion_trigger ON comments IS 'Logs comment deletion to audit trail';

-- ----------------------------------------------------------------------------
-- auth.users triggers (Supabase Auth)
-- ----------------------------------------------------------------------------

-- Archive user data before deletion (GDPR compliance)
CREATE TRIGGER archive_before_user_deletion_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION archive_before_user_deletion();

-- Note: Cannot add comment on auth.users trigger due to permissions

-- Auto-create profile when user signs up
CREATE TRIGGER create_profile_for_new_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();

-- Note: Cannot add comment on auth.users trigger due to permissions

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- List all triggers
-- SELECT
--   trigger_schema,
--   trigger_name,
--   event_object_table,
--   action_timing,
--   event_manipulation,
--   action_statement
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public' OR event_object_table = 'users'
-- ORDER BY event_object_table, trigger_name;

-- Test trigger (example - signup should create profile)
-- -- This should be tested via Supabase Auth, not directly:
-- -- INSERT INTO auth.users (email, raw_user_meta_data) VALUES ('test@example.com', '{"role": "creator"}');
-- -- SELECT * FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'test@example.com');

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP TRIGGER IF EXISTS create_profile_for_new_user_trigger ON auth.users;
-- DROP TRIGGER IF EXISTS archive_before_user_deletion_trigger ON auth.users;
-- DROP TRIGGER IF EXISTS audit_comment_deletion_trigger ON comments;
-- DROP TRIGGER IF EXISTS update_comment_count_on_delete_trigger ON comments;
-- DROP TRIGGER IF EXISTS update_comment_count_on_insert_trigger ON comments;
-- DROP TRIGGER IF EXISTS reset_status_on_all_recipients_removed_trigger ON brief_recipients;
-- DROP TRIGGER IF EXISTS auto_change_status_to_sent_trigger ON brief_recipients;
-- DROP TRIGGER IF EXISTS enforce_recipient_limit_trigger ON brief_recipients;
-- DROP TRIGGER IF EXISTS reset_status_on_brief_edit_trigger ON briefs;
-- DROP TRIGGER IF EXISTS enforce_creator_brief_limit_trigger ON briefs;
-- DROP TRIGGER IF EXISTS update_briefs_updated_at ON briefs;
-- DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
