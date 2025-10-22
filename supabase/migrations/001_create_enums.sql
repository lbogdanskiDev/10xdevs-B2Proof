-- Migration: 001_create_enums.sql
-- Description: Create custom ENUM types for type safety and data validation
-- Date: 2025-01-15
-- Author: System

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User role enumeration
-- Defines the two types of users in the system
CREATE TYPE user_role AS ENUM (
  'creator',  -- Can create and manage briefs
  'client'    -- Can review and respond to briefs shared with them
);

-- Brief status enumeration
-- Defines the workflow states for a brief
CREATE TYPE brief_status AS ENUM (
  'draft',              -- Initial state, being edited by creator
  'sent',               -- Shared with at least one recipient
  'accepted',           -- Approved by client
  'rejected',           -- Declined by client
  'needs_modification'  -- Client requested changes
);

-- Audit action enumeration
-- Defines all trackable events in the system
CREATE TYPE audit_action AS ENUM (
  'user_registered',      -- New user signed up
  'user_deleted',         -- User account deleted
  'brief_created',        -- New brief created
  'brief_updated',        -- Brief content modified
  'brief_deleted',        -- Brief permanently deleted
  'brief_shared',         -- Brief shared with recipient
  'brief_unshared',       -- Recipient access revoked
  'brief_status_changed', -- Brief status updated
  'comment_created',      -- New comment added
  'comment_deleted'       -- Comment removed
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Verify ENUMs were created
-- SELECT typname, enumlabel FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname IN ('user_role', 'brief_status', 'audit_action') ORDER BY typname, enumsortorder;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP TYPE IF EXISTS audit_action CASCADE;
-- DROP TYPE IF EXISTS brief_status CASCADE;
-- DROP TYPE IF EXISTS user_role CASCADE;
