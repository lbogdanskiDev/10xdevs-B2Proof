-- Migration: 003_create_indexes.sql
-- Description: Create indexes for query performance optimization
-- Date: 2025-01-15
-- Author: System

-- ============================================================================
-- INDEXES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles indexes
-- ----------------------------------------------------------------------------
-- Primary key index is created automatically
-- No additional indexes needed (small table, simple queries)

-- ----------------------------------------------------------------------------
-- briefs indexes
-- ----------------------------------------------------------------------------

-- Index for user's brief list pagination (most common query)
-- Supports: SELECT * FROM briefs WHERE owner_id = ? ORDER BY updated_at DESC
CREATE INDEX idx_briefs_owner_updated
  ON briefs(owner_id, updated_at DESC);

COMMENT ON INDEX idx_briefs_owner_updated IS 'Optimizes brief list pagination for owners';

-- Index for filtering by status
-- Supports: SELECT * FROM briefs WHERE status = ? ORDER BY updated_at DESC
CREATE INDEX idx_briefs_status_updated
  ON briefs(status, updated_at DESC);

COMMENT ON INDEX idx_briefs_status_updated IS 'Optimizes filtering briefs by status';

-- Index for ownership checks (used by RLS policies)
CREATE INDEX idx_briefs_owner_id
  ON briefs(owner_id);

COMMENT ON INDEX idx_briefs_owner_id IS 'Speeds up ownership validation in RLS policies';

-- ----------------------------------------------------------------------------
-- brief_recipients indexes
-- ----------------------------------------------------------------------------

-- Unique constraint creates an index automatically on (brief_id, recipient_id)

-- Index for finding all briefs shared with a user
-- Supports: SELECT * FROM brief_recipients WHERE recipient_id = ?
CREATE INDEX idx_brief_recipients_recipient_id
  ON brief_recipients(recipient_id);

COMMENT ON INDEX idx_brief_recipients_recipient_id IS 'Finds all briefs shared with a specific user';

-- Index for finding all recipients of a brief
-- Supports: SELECT * FROM brief_recipients WHERE brief_id = ?
CREATE INDEX idx_brief_recipients_brief_id
  ON brief_recipients(brief_id);

COMMENT ON INDEX idx_brief_recipients_brief_id IS 'Lists all recipients of a specific brief';

-- ----------------------------------------------------------------------------
-- comments indexes
-- ----------------------------------------------------------------------------

-- Index for chronological comment display
-- Supports: SELECT * FROM comments WHERE brief_id = ? ORDER BY created_at DESC
CREATE INDEX idx_comments_brief_created
  ON comments(brief_id, created_at DESC);

COMMENT ON INDEX idx_comments_brief_created IS 'Optimizes chronological comment retrieval';

-- Index for finding user's comments (for deletion cascade optimization)
CREATE INDEX idx_comments_author_id
  ON comments(author_id);

COMMENT ON INDEX idx_comments_author_id IS 'Speeds up finding all comments by a user';

-- ----------------------------------------------------------------------------
-- audit_log indexes
-- ----------------------------------------------------------------------------

-- Index for querying audit history of specific entities
-- Supports: SELECT * FROM audit_log WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC
CREATE INDEX idx_audit_log_entity
  ON audit_log(entity_type, entity_id, created_at DESC);

COMMENT ON INDEX idx_audit_log_entity IS 'Enables efficient entity history queries for GDPR compliance';

-- Index for user activity tracking (also covers foreign key)
-- Supports: SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX idx_audit_log_user_id
  ON audit_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;

COMMENT ON INDEX idx_audit_log_user_id IS 'Tracks all actions performed by a specific user and covers FK';

-- Index for action type filtering
-- Supports: SELECT * FROM audit_log WHERE action = ? ORDER BY created_at DESC
CREATE INDEX idx_audit_log_action
  ON audit_log(action, created_at DESC);

COMMENT ON INDEX idx_audit_log_action IS 'Filters audit log by action type';

-- ----------------------------------------------------------------------------
-- Additional indexes for foreign keys
-- ----------------------------------------------------------------------------

-- Foreign key index for brief_recipients.shared_by
CREATE INDEX idx_brief_recipients_shared_by
  ON brief_recipients(shared_by);

COMMENT ON INDEX idx_brief_recipients_shared_by IS 'Covers foreign key for shared_by column';

-- Foreign key index for briefs.status_changed_by
CREATE INDEX idx_briefs_status_changed_by
  ON briefs(status_changed_by);

COMMENT ON INDEX idx_briefs_status_changed_by IS 'Covers foreign key for status_changed_by column';

-- Foreign key index for comments.brief_id (already exists in compound index)
-- idx_comments_brief_created covers this, so no additional index needed

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- List all indexes
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- Check index usage (run after some time in production)
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP INDEX IF EXISTS idx_audit_log_action;
-- DROP INDEX IF EXISTS idx_audit_log_user_id;
-- DROP INDEX IF EXISTS idx_audit_log_entity;
-- DROP INDEX IF EXISTS idx_comments_author_id;
-- DROP INDEX IF EXISTS idx_comments_brief_created;
-- DROP INDEX IF EXISTS idx_brief_recipients_brief_id;
-- DROP INDEX IF EXISTS idx_brief_recipients_recipient_id;
-- DROP INDEX IF EXISTS idx_briefs_owner_id;
-- DROP INDEX IF EXISTS idx_briefs_status_updated;
-- DROP INDEX IF EXISTS idx_briefs_owner_updated;
