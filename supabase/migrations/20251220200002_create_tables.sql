-- migration: 20251220200002_create_tables.sql
-- description: create all database tables with constraints and relationships
-- date: 2025-12-20
-- author: system
--
-- this migration creates the core tables for b2proof:
-- - profiles: extends supabase auth users with role information
-- - briefs: main entity for project briefs
-- - brief_recipients: junction table for brief sharing (with recipient_email support)
-- - comments: user comments on briefs
-- - audit_log: gdpr-compliant audit trail

-- ============================================================================
-- tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles
-- extends supabase auth users with application-specific role information
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'User profiles extending Supabase Auth with role information';
comment on column profiles.id is 'References auth.users.id - primary key and foreign key';
comment on column profiles.role is 'User role: creator (can create briefs) or client (can review briefs)';
comment on column profiles.created_at is 'Profile creation timestamp';
comment on column profiles.updated_at is 'Last profile update timestamp (auto-updated by trigger)';

-- ----------------------------------------------------------------------------
-- briefs
-- main entity storing project briefs created by users
-- ----------------------------------------------------------------------------
create table briefs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  header text not null,
  content jsonb not null,
  footer text,
  status brief_status not null default 'draft',
  status_changed_at timestamptz,
  status_changed_by uuid references auth.users(id) on delete set null,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- constraints
  constraint header_length_check check (char_length(header) > 0 and char_length(header) <= 200),
  constraint footer_length_check check (footer is null or char_length(footer) <= 200),
  constraint comment_count_check check (comment_count >= 0)
);

comment on table briefs is 'Project briefs created by creators and shared with clients';
comment on column briefs.id is 'Unique brief identifier (UUID)';
comment on column briefs.owner_id is 'Brief creator - references auth.users';
comment on column briefs.header is 'Brief title (1-200 characters)';
comment on column briefs.content is 'TipTap document structure stored as JSONB';
comment on column briefs.footer is 'Optional footer text (max 200 characters)';
comment on column briefs.status is 'Current workflow status (draft -> sent -> accepted/rejected/needs_modification)';
comment on column briefs.status_changed_at is 'Timestamp of last status change';
comment on column briefs.status_changed_by is 'User who changed the status (owner or client)';
comment on column briefs.comment_count is 'Denormalized comment count for performance';
comment on column briefs.created_at is 'Brief creation timestamp';
comment on column briefs.updated_at is 'Last brief update timestamp (auto-updated by trigger)';

-- ----------------------------------------------------------------------------
-- brief_recipients
-- junction table tracking brief sharing with full audit trail
-- supports pending invitations via recipient_email (recipient_id can be null)
-- ----------------------------------------------------------------------------
create table brief_recipients (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs(id) on delete cascade,
  recipient_id uuid references auth.users(id) on delete cascade,
  recipient_email text not null,
  shared_by uuid not null references auth.users(id) on delete cascade,
  shared_at timestamptz not null default now(),

  -- prevent duplicate shares to same email
  constraint unique_brief_recipient_email unique (brief_id, recipient_email),
  -- validate email format
  constraint recipient_email_format_check check (
    recipient_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

comment on table brief_recipients is 'Tracks brief sharing relationships with audit information';
comment on column brief_recipients.id is 'Unique recipient record identifier';
comment on column brief_recipients.brief_id is 'Brief being shared';
comment on column brief_recipients.recipient_id is 'User receiving access (NULL for pending invitations)';
comment on column brief_recipients.recipient_email is 'Email address of recipient (required, allows sharing with non-registered users)';
comment on column brief_recipients.shared_by is 'User who granted access (brief owner)';
comment on column brief_recipients.shared_at is 'Timestamp when access was granted';

-- ----------------------------------------------------------------------------
-- comments
-- user comments on briefs for collaboration and discussion
-- both creators and clients with access can add comments
-- ----------------------------------------------------------------------------
create table comments (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references briefs(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),

  -- constraint
  constraint content_length_check check (char_length(content) > 0 and char_length(content) <= 1000)
);

comment on table comments is 'User comments on briefs for discussion and feedback';
comment on column comments.id is 'Unique comment identifier';
comment on column comments.brief_id is 'Brief being commented on';
comment on column comments.author_id is 'Comment author (creator or client with access)';
comment on column comments.content is 'Comment text (1-1000 characters)';
comment on column comments.created_at is 'Comment creation timestamp';

-- ----------------------------------------------------------------------------
-- audit_log
-- universal audit trail for compliance and debugging (gdpr)
-- write-only for users - only triggers can insert
-- ----------------------------------------------------------------------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action audit_action not null,
  entity_type text not null,
  entity_id uuid not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

comment on table audit_log is 'Audit trail for all critical operations (GDPR compliance)';
comment on column audit_log.id is 'Unique audit log entry identifier';
comment on column audit_log.user_id is 'User who performed the action (NULL for system actions or deleted users)';
comment on column audit_log.action is 'Type of action performed';
comment on column audit_log.entity_type is 'Type of entity affected (user, brief, comment)';
comment on column audit_log.entity_id is 'ID of the affected entity';
comment on column audit_log.old_data is 'Entity state before change (NULL for creates)';
comment on column audit_log.new_data is 'Entity state after change (NULL for deletes)';
comment on column audit_log.created_at is 'Timestamp when action occurred';

-- ============================================================================
-- verification
-- ============================================================================
-- list all tables
-- select tablename from pg_tables where schemaname = 'public' order by tablename;
--
-- describe specific table
-- \d+ profiles
-- \d+ briefs
-- \d+ brief_recipients
-- \d+ comments
-- \d+ audit_log

-- ============================================================================
-- rollback
-- ============================================================================
-- warning: destructive operations - will delete all data
-- drop table if exists audit_log cascade;
-- drop table if exists comments cascade;
-- drop table if exists brief_recipients cascade;
-- drop table if exists briefs cascade;
-- drop table if exists profiles cascade;
