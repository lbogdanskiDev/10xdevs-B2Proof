-- Migration: 002_create_tables.sql
-- Description: Create all database tables with constraints and relationships
-- Date: 2025-01-15
-- Author: System

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- Extends Supabase Auth users with application-specific role information
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles extending Supabase Auth with role information';
COMMENT ON COLUMN profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN profiles.role IS 'User role: creator or client';

-- ----------------------------------------------------------------------------
-- briefs
-- Main entity storing project briefs created by users
-- ----------------------------------------------------------------------------
CREATE TABLE briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  header TEXT NOT NULL,
  content JSONB NOT NULL,
  footer TEXT,
  status brief_status NOT NULL DEFAULT 'draft',
  status_changed_at TIMESTAMPTZ,
  status_changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT header_length_check CHECK (char_length(header) > 0 AND char_length(header) <= 200),
  CONSTRAINT footer_length_check CHECK (footer IS NULL OR char_length(footer) <= 200),
  CONSTRAINT comment_count_check CHECK (comment_count >= 0)
);

COMMENT ON TABLE briefs IS 'Project briefs created by creators and shared with clients';
COMMENT ON COLUMN briefs.header IS 'Brief title (1-200 characters)';
COMMENT ON COLUMN briefs.content IS 'TipTap document structure stored as JSONB';
COMMENT ON COLUMN briefs.footer IS 'Optional footer text (max 200 characters)';
COMMENT ON COLUMN briefs.status IS 'Current workflow status';
COMMENT ON COLUMN briefs.comment_count IS 'Denormalized count for performance';

-- ----------------------------------------------------------------------------
-- brief_recipients
-- Junction table tracking brief sharing with full audit trail
-- ----------------------------------------------------------------------------
CREATE TABLE brief_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate shares
  CONSTRAINT unique_brief_recipient UNIQUE (brief_id, recipient_id)
);

COMMENT ON TABLE brief_recipients IS 'Tracks brief sharing relationships with audit information';
COMMENT ON COLUMN brief_recipients.brief_id IS 'Brief being shared';
COMMENT ON COLUMN brief_recipients.recipient_id IS 'User receiving access';
COMMENT ON COLUMN brief_recipients.shared_by IS 'User who granted access';

-- ----------------------------------------------------------------------------
-- comments
-- User comments on briefs for collaboration and discussion
-- ----------------------------------------------------------------------------
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint
  CONSTRAINT content_length_check CHECK (char_length(content) > 0 AND char_length(content) <= 1000)
);

COMMENT ON TABLE comments IS 'User comments on briefs for discussion and feedback';
COMMENT ON COLUMN comments.content IS 'Comment text (1-1000 characters)';

-- ----------------------------------------------------------------------------
-- audit_log
-- Universal audit trail for compliance and debugging
-- ----------------------------------------------------------------------------
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Audit trail for all critical operations (GDPR compliance)';
COMMENT ON COLUMN audit_log.user_id IS 'User who performed the action (NULL for system actions)';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity affected (e.g., "user", "brief", "comment")';
COMMENT ON COLUMN audit_log.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_log.old_data IS 'Entity state before change (NULL for creates)';
COMMENT ON COLUMN audit_log.new_data IS 'Entity state after change (NULL for deletes)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- List all tables
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
--
-- Describe specific table
-- \d+ profiles
-- \d+ briefs
-- \d+ brief_recipients
-- \d+ comments
-- \d+ audit_log

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP TABLE IF EXISTS audit_log CASCADE;
-- DROP TABLE IF EXISTS comments CASCADE;
-- DROP TABLE IF EXISTS brief_recipients CASCADE;
-- DROP TABLE IF EXISTS briefs CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
