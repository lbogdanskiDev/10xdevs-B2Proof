-- migration: 20251220200005_create_triggers.sql
-- description: create all database triggers for business logic automation
-- date: 2025-12-20
-- author: system
--
-- this migration creates triggers for:
-- - automatic timestamp updates (updated_at)
-- - business rule enforcement (brief limits, recipient limits)
-- - status workflow automation
-- - comment count denormalization
-- - audit logging
-- - user profile creation on signup
-- - pending invitation auto-claim

-- ============================================================================
-- triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles triggers
-- ----------------------------------------------------------------------------

-- auto-update updated_at timestamp on profile modification
create trigger update_profiles_updated_at
  before update on profiles
  for each row
  execute function extensions.moddatetime(updated_at);

comment on trigger update_profiles_updated_at on profiles is 'Automatically updates updated_at timestamp';

-- ----------------------------------------------------------------------------
-- briefs triggers
-- ----------------------------------------------------------------------------

-- auto-update updated_at timestamp on brief modification
create trigger update_briefs_updated_at
  before update on briefs
  for each row
  execute function extensions.moddatetime(updated_at);

comment on trigger update_briefs_updated_at on briefs is 'Automatically updates updated_at timestamp';

-- enforce 20 brief limit for creators
create trigger enforce_creator_brief_limit_trigger
  before insert on briefs
  for each row
  execute function enforce_creator_brief_limit();

comment on trigger enforce_creator_brief_limit_trigger on briefs is 'Prevents creators from exceeding 20 brief limit';

-- reset status to draft when content is edited
create trigger reset_status_on_brief_edit_trigger
  before update on briefs
  for each row
  execute function reset_status_on_brief_edit();

comment on trigger reset_status_on_brief_edit_trigger on briefs is 'Resets brief status to draft when content/header/footer is modified';

-- ----------------------------------------------------------------------------
-- brief_recipients triggers
-- ----------------------------------------------------------------------------

-- enforce 10 recipient limit per brief
create trigger enforce_recipient_limit_trigger
  before insert on brief_recipients
  for each row
  execute function enforce_recipient_limit();

comment on trigger enforce_recipient_limit_trigger on brief_recipients is 'Prevents briefs from having more than 10 recipients';

-- change brief status to 'sent' when first recipient is added
create trigger auto_change_status_to_sent_trigger
  after insert on brief_recipients
  for each row
  execute function auto_change_status_to_sent();

comment on trigger auto_change_status_to_sent_trigger on brief_recipients is 'Changes brief status to sent when shared with first recipient';

-- reset status to draft when all recipients are removed
create trigger reset_status_on_all_recipients_removed_trigger
  after delete on brief_recipients
  for each row
  execute function reset_status_on_all_recipients_removed();

comment on trigger reset_status_on_all_recipients_removed_trigger on brief_recipients is 'Resets brief status to draft when last recipient is removed';

-- ----------------------------------------------------------------------------
-- comments triggers
-- ----------------------------------------------------------------------------

-- increment comment count when comment is added
create trigger update_comment_count_on_insert_trigger
  after insert on comments
  for each row
  execute function update_comment_count_on_insert();

comment on trigger update_comment_count_on_insert_trigger on comments is 'Increments denormalized comment count on brief';

-- decrement comment count when comment is deleted
create trigger update_comment_count_on_delete_trigger
  after delete on comments
  for each row
  execute function update_comment_count_on_delete();

comment on trigger update_comment_count_on_delete_trigger on comments is 'Decrements denormalized comment count on brief';

-- audit comment deletions
create trigger audit_comment_deletion_trigger
  before delete on comments
  for each row
  execute function audit_comment_deletion();

comment on trigger audit_comment_deletion_trigger on comments is 'Logs comment deletion to audit trail';

-- ----------------------------------------------------------------------------
-- auth.users triggers (supabase auth)
-- ----------------------------------------------------------------------------

-- archive user data before deletion (gdpr compliance)
create trigger archive_before_user_deletion_trigger
  before delete on auth.users
  for each row
  execute function archive_before_user_deletion();

-- note: cannot add comment on auth.users trigger due to permissions

-- auto-create profile when user signs up
create trigger create_profile_for_new_user_trigger
  after insert on auth.users
  for each row
  execute function create_profile_for_new_user();

-- note: cannot add comment on auth.users trigger due to permissions

-- auto-update pending recipients when user registers with invited email
create trigger update_pending_recipients_on_user_create
  after insert on auth.users
  for each row
  execute function auto_update_recipient_id();

-- note: cannot add comment on auth.users trigger due to permissions

-- ============================================================================
-- verification
-- ============================================================================
-- list all triggers
-- select
--   trigger_schema,
--   trigger_name,
--   event_object_table,
--   action_timing,
--   event_manipulation,
--   action_statement
-- from information_schema.triggers
-- where trigger_schema = 'public' or event_object_table = 'users'
-- order by event_object_table, trigger_name;

-- ============================================================================
-- rollback
-- ============================================================================
-- drop trigger if exists update_pending_recipients_on_user_create on auth.users;
-- drop trigger if exists create_profile_for_new_user_trigger on auth.users;
-- drop trigger if exists archive_before_user_deletion_trigger on auth.users;
-- drop trigger if exists audit_comment_deletion_trigger on comments;
-- drop trigger if exists update_comment_count_on_delete_trigger on comments;
-- drop trigger if exists update_comment_count_on_insert_trigger on comments;
-- drop trigger if exists reset_status_on_all_recipients_removed_trigger on brief_recipients;
-- drop trigger if exists auto_change_status_to_sent_trigger on brief_recipients;
-- drop trigger if exists enforce_recipient_limit_trigger on brief_recipients;
-- drop trigger if exists reset_status_on_brief_edit_trigger on briefs;
-- drop trigger if exists enforce_creator_brief_limit_trigger on briefs;
-- drop trigger if exists update_briefs_updated_at on briefs;
-- drop trigger if exists update_profiles_updated_at on profiles;
