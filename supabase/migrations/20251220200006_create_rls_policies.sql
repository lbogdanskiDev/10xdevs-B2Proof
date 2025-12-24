-- migration: 20251220200006_create_rls_policies.sql
-- description: enable row level security and create security policies
-- date: 2025-12-20
-- author: system
--
-- this migration enables rls on all tables and creates granular policies:
-- - profiles: users can only access their own profile
-- - briefs: owners have full access, recipients have read access, clients can change status
-- - brief_recipients: owners can manage sharing, recipients can view and claim invitations
-- - comments: users with brief access can read/create, authors can delete own comments
-- - audit_log: users can only view their own audit trail
--
-- performance optimization: all auth.uid() calls are wrapped in (select ...) for single evaluation

-- ============================================================================
-- enable row level security
-- ============================================================================

alter table profiles enable row level security;
alter table briefs enable row level security;
alter table brief_recipients enable row level security;
alter table comments enable row level security;
alter table audit_log enable row level security;

-- ============================================================================
-- profiles policies
-- ============================================================================

-- users can view their own profile
create policy profiles_select_own
  on profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

comment on policy profiles_select_own on profiles is 'Users can view their own profile';

-- users can insert their own profile (for manual profile creation if needed)
create policy profiles_insert_own
  on profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

comment on policy profiles_insert_own on profiles is 'Users can create their own profile during registration';

-- users can update their own profile
create policy profiles_update_own
  on profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

comment on policy profiles_update_own on profiles is 'Users can update their own profile';

-- users can delete their own profile
create policy profiles_delete_own
  on profiles
  for delete
  to authenticated
  using ((select auth.uid()) = id);

comment on policy profiles_delete_own on profiles is 'Users can delete their own profile';

-- ============================================================================
-- briefs policies
-- ============================================================================

-- users can view briefs they own or have been granted access to
-- uses user_has_brief_access function which checks both owner_id and recipient access
create policy briefs_select_accessible
  on briefs
  for select
  to authenticated
  using (user_has_brief_access(id));

comment on policy briefs_select_accessible on briefs is 'Users can view briefs they own or have access to (via recipient_id or recipient_email)';

-- only creators can insert briefs
create policy briefs_insert_creators_only
  on briefs
  for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id and
    (select role from profiles where id = (select auth.uid())) = 'creator'
  );

comment on policy briefs_insert_creators_only on briefs is 'Only users with creator role can create new briefs';

-- brief owners can update their briefs (content, header, footer)
create policy briefs_update_own
  on briefs
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

comment on policy briefs_update_own on briefs is 'Brief owners can update their brief content, header, and footer';

-- clients with access can change brief status to accepted/rejected/needs_modification
create policy briefs_update_status_by_client
  on briefs
  for update
  to authenticated
  using (
    user_has_brief_access(id) and
    (select role from profiles where id = (select auth.uid())) = 'client'
  )
  with check (
    status in ('accepted', 'rejected', 'needs_modification') and
    status_changed_by = (select auth.uid())
  );

comment on policy briefs_update_status_by_client on briefs is 'Clients with brief access can change status to accepted/rejected/needs_modification';

-- only brief owners can delete their briefs
create policy briefs_delete_own
  on briefs
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

comment on policy briefs_delete_own on briefs is 'Only brief owners can delete their briefs';

-- ============================================================================
-- brief_recipients policies
-- ============================================================================

-- brief owners can view recipients list
create policy brief_recipients_select_own_briefs
  on brief_recipients
  for select
  to authenticated
  using (
    (select owner_id from briefs where id = brief_id) = (select auth.uid())
  );

comment on policy brief_recipients_select_own_briefs on brief_recipients is 'Brief owners can view the list of recipients';

-- recipients can view their own recipient records (by recipient_id or recipient_email)
create policy brief_recipients_select_as_recipient
  on brief_recipients
  for select
  to authenticated
  using (
    recipient_id = (select auth.uid()) or
    recipient_email = get_current_user_email()
  );

comment on policy brief_recipients_select_as_recipient on brief_recipients is 'Recipients can view their own recipient records (by recipient_id or recipient_email)';

-- only brief owners can share briefs (insert recipients)
create policy brief_recipients_insert_own_briefs
  on brief_recipients
  for insert
  to authenticated
  with check (
    (select owner_id from briefs where id = brief_id) = (select auth.uid()) and
    shared_by = (select auth.uid())
  );

comment on policy brief_recipients_insert_own_briefs on brief_recipients is 'Only brief owners can share briefs with recipients';

-- users can claim pending invitations by updating recipient_id
create policy brief_recipients_update_claim_invitation
  on brief_recipients
  for update
  to authenticated
  using (
    -- can only update records where email matches and recipient_id is null
    recipient_email = (select email from auth.users where id = (select auth.uid())) and
    recipient_id is null
  )
  with check (
    -- can only set recipient_id to current user's id
    recipient_id = (select auth.uid()) and
    recipient_email = (select email from auth.users where id = (select auth.uid()))
  );

comment on policy brief_recipients_update_claim_invitation on brief_recipients is 'Users can claim pending invitations by setting recipient_id when their email matches';

-- only brief owners can revoke access (delete recipients)
create policy brief_recipients_delete_own_briefs
  on brief_recipients
  for delete
  to authenticated
  using (
    (select owner_id from briefs where id = brief_id) = (select auth.uid())
  );

comment on policy brief_recipients_delete_own_briefs on brief_recipients is 'Only brief owners can revoke recipient access';

-- ============================================================================
-- comments policies
-- ============================================================================

-- users can view comments on briefs they have access to
create policy comments_select_accessible_briefs
  on comments
  for select
  to authenticated
  using (user_has_brief_access(brief_id));

comment on policy comments_select_accessible_briefs on comments is 'Users can view comments on briefs they have access to';

-- users can create comments on briefs they have access to
-- both creators and clients with access can add comments
create policy comments_insert_accessible_briefs
  on comments
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid()) and
    user_has_brief_access(brief_id)
  );

comment on policy comments_insert_accessible_briefs on comments is 'Users with brief access can add comments (both creators and clients)';

-- users can only delete their own comments
create policy comments_delete_own
  on comments
  for delete
  to authenticated
  using (author_id = (select auth.uid()));

comment on policy comments_delete_own on comments is 'Users can only delete their own comments';

-- no update policy - comments are immutable (delete and recreate if editing is needed)

-- ============================================================================
-- audit_log policies
-- ============================================================================

-- users can view their own audit trail (gdpr compliance)
create policy audit_log_select_own
  on audit_log
  for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on policy audit_log_select_own on audit_log is 'Users can view their own audit trail (GDPR compliance)';

-- no insert/update/delete policies for users - only triggers can write to this table
-- this ensures audit integrity

-- ============================================================================
-- verification
-- ============================================================================
-- list all policies
-- select
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;

-- ============================================================================
-- rollback
-- ============================================================================
-- -- drop all policies
-- drop policy if exists audit_log_select_own on audit_log;
-- drop policy if exists comments_delete_own on comments;
-- drop policy if exists comments_insert_accessible_briefs on comments;
-- drop policy if exists comments_select_accessible_briefs on comments;
-- drop policy if exists brief_recipients_delete_own_briefs on brief_recipients;
-- drop policy if exists brief_recipients_update_claim_invitation on brief_recipients;
-- drop policy if exists brief_recipients_insert_own_briefs on brief_recipients;
-- drop policy if exists brief_recipients_select_as_recipient on brief_recipients;
-- drop policy if exists brief_recipients_select_own_briefs on brief_recipients;
-- drop policy if exists briefs_delete_own on briefs;
-- drop policy if exists briefs_update_status_by_client on briefs;
-- drop policy if exists briefs_update_own on briefs;
-- drop policy if exists briefs_insert_creators_only on briefs;
-- drop policy if exists briefs_select_accessible on briefs;
-- drop policy if exists profiles_delete_own on profiles;
-- drop policy if exists profiles_update_own on profiles;
-- drop policy if exists profiles_insert_own on profiles;
-- drop policy if exists profiles_select_own on profiles;
--
-- -- disable rls
-- alter table audit_log disable row level security;
-- alter table comments disable row level security;
-- alter table brief_recipients disable row level security;
-- alter table briefs disable row level security;
-- alter table profiles disable row level security;
