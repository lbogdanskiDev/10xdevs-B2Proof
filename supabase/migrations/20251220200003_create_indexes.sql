-- migration: 20251220200003_create_indexes.sql
-- description: create indexes for query performance optimization
-- date: 2025-12-20
-- author: system
--
-- this migration creates indexes to optimize common query patterns:
-- - brief list pagination by owner
-- - filtering briefs by status
-- - finding briefs shared with a user
-- - chronological comment display
-- - audit log queries

-- ============================================================================
-- indexes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- briefs indexes
-- ----------------------------------------------------------------------------

-- index for user's brief list pagination (most common query)
-- supports: select * from briefs where owner_id = ? order by updated_at desc
create index idx_briefs_owner_updated
  on briefs(owner_id, updated_at desc);

comment on index idx_briefs_owner_updated is 'Optimizes brief list pagination for owners';

-- index for filtering by status
-- supports: select * from briefs where status = ? order by updated_at desc
create index idx_briefs_status_updated
  on briefs(status, updated_at desc);

comment on index idx_briefs_status_updated is 'Optimizes filtering briefs by status';

-- index for ownership checks (used by rls policies)
create index idx_briefs_owner_id
  on briefs(owner_id);

comment on index idx_briefs_owner_id is 'Speeds up ownership validation in RLS policies';

-- foreign key index for status_changed_by
create index idx_briefs_status_changed_by
  on briefs(status_changed_by)
  where status_changed_by is not null;

comment on index idx_briefs_status_changed_by is 'Covers foreign key for status_changed_by column';

-- ----------------------------------------------------------------------------
-- brief_recipients indexes
-- ----------------------------------------------------------------------------

-- note: unique constraint creates an automatic index on (brief_id, recipient_email)

-- index for finding all briefs shared with a user by recipient_id
-- supports: select * from brief_recipients where recipient_id = ?
create index idx_brief_recipients_recipient_id
  on brief_recipients(recipient_id)
  where recipient_id is not null;

comment on index idx_brief_recipients_recipient_id is 'Finds all briefs shared with a specific user by ID';

-- index for finding all briefs shared with a user by email (pending invitations)
-- supports: select * from brief_recipients where recipient_email = ?
create index idx_brief_recipients_recipient_email
  on brief_recipients(recipient_email);

comment on index idx_brief_recipients_recipient_email is 'Finds all briefs shared with a specific email (including pending)';

-- index for finding all recipients of a brief
-- supports: select * from brief_recipients where brief_id = ?
create index idx_brief_recipients_brief_id
  on brief_recipients(brief_id);

comment on index idx_brief_recipients_brief_id is 'Lists all recipients of a specific brief';

-- foreign key index for shared_by
create index idx_brief_recipients_shared_by
  on brief_recipients(shared_by);

comment on index idx_brief_recipients_shared_by is 'Covers foreign key for shared_by column';

-- ----------------------------------------------------------------------------
-- comments indexes
-- ----------------------------------------------------------------------------

-- index for chronological comment display
-- supports: select * from comments where brief_id = ? order by created_at desc
create index idx_comments_brief_created
  on comments(brief_id, created_at desc);

comment on index idx_comments_brief_created is 'Optimizes chronological comment retrieval';

-- index for finding user's comments (for deletion and user history)
create index idx_comments_author_id
  on comments(author_id);

comment on index idx_comments_author_id is 'Speeds up finding all comments by a user';

-- ----------------------------------------------------------------------------
-- audit_log indexes
-- ----------------------------------------------------------------------------

-- index for querying audit history of specific entities
-- supports: select * from audit_log where entity_type = ? and entity_id = ? order by created_at desc
create index idx_audit_log_entity
  on audit_log(entity_type, entity_id, created_at desc);

comment on index idx_audit_log_entity is 'Enables efficient entity history queries for GDPR compliance';

-- index for user activity tracking (also covers foreign key)
-- supports: select * from audit_log where user_id = ? order by created_at desc
create index idx_audit_log_user_id
  on audit_log(user_id, created_at desc)
  where user_id is not null;

comment on index idx_audit_log_user_id is 'Tracks all actions performed by a specific user';

-- index for action type filtering
-- supports: select * from audit_log where action = ? order by created_at desc
create index idx_audit_log_action
  on audit_log(action, created_at desc);

comment on index idx_audit_log_action is 'Filters audit log by action type';

-- ============================================================================
-- verification
-- ============================================================================
-- list all indexes
-- select
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- from pg_indexes
-- where schemaname = 'public'
-- order by tablename, indexname;

-- ============================================================================
-- rollback
-- ============================================================================
-- drop index if exists idx_audit_log_action;
-- drop index if exists idx_audit_log_user_id;
-- drop index if exists idx_audit_log_entity;
-- drop index if exists idx_comments_author_id;
-- drop index if exists idx_comments_brief_created;
-- drop index if exists idx_brief_recipients_shared_by;
-- drop index if exists idx_brief_recipients_brief_id;
-- drop index if exists idx_brief_recipients_recipient_email;
-- drop index if exists idx_brief_recipients_recipient_id;
-- drop index if exists idx_briefs_status_changed_by;
-- drop index if exists idx_briefs_owner_id;
-- drop index if exists idx_briefs_status_updated;
-- drop index if exists idx_briefs_owner_updated;
