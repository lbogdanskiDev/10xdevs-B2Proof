-- migration: 20251220200001_create_enums.sql
-- description: create custom enum types for type safety and data validation
-- date: 2025-12-20
-- author: system
--
-- this migration creates enum types used throughout the application:
-- - user_role: defines user types (creator, client)
-- - brief_status: defines brief workflow states
-- - audit_action: defines trackable events for audit log

-- ============================================================================
-- enums
-- ============================================================================

-- user role enumeration
-- defines the two types of users in the system
create type user_role as enum (
  'creator',  -- can create and manage briefs
  'client'    -- can review and respond to briefs shared with them
);

comment on type user_role is 'User role: creator can create briefs, client can review shared briefs';

-- brief status enumeration
-- defines the workflow states for a brief
create type brief_status as enum (
  'draft',              -- initial state, being edited by creator
  'sent',               -- shared with at least one recipient
  'accepted',           -- approved by client
  'rejected',           -- declined by client
  'needs_modification'  -- client requested changes
);

comment on type brief_status is 'Brief workflow status from draft through client response';

-- audit action enumeration
-- defines all trackable events in the system for gdpr compliance
create type audit_action as enum (
  'user_registered',      -- new user signed up
  'user_deleted',         -- user account deleted
  'brief_created',        -- new brief created
  'brief_updated',        -- brief content modified
  'brief_deleted',        -- brief permanently deleted
  'brief_shared',         -- brief shared with recipient
  'brief_unshared',       -- recipient access revoked
  'brief_status_changed', -- brief status updated
  'comment_created',      -- new comment added
  'comment_deleted'       -- comment removed
);

comment on type audit_action is 'Trackable audit events for GDPR compliance and debugging';

-- ============================================================================
-- verification
-- ============================================================================
-- select typname, enumlabel
-- from pg_type
-- join pg_enum on pg_type.oid = pg_enum.enumtypid
-- where typname in ('user_role', 'brief_status', 'audit_action')
-- order by typname, enumsortorder;

-- ============================================================================
-- rollback
-- ============================================================================
-- drop type if exists audit_action cascade;
-- drop type if exists brief_status cascade;
-- drop type if exists user_role cascade;
