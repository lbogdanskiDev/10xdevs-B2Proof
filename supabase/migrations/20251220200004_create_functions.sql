-- migration: 20251220200004_create_functions.sql
-- description: create helper functions for rls policies and triggers
-- date: 2025-12-20
-- author: system
--
-- this migration creates:
-- - helper functions for rls policies (user_has_brief_access, get_current_user_email)
-- - trigger functions for business logic automation
-- - utility functions (get_user_by_email)

-- ============================================================================
-- helper functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_current_user_email
-- returns the email of the currently authenticated user
-- security definer to access auth.users table
-- ----------------------------------------------------------------------------
create or replace function get_current_user_email()
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  return (select email from auth.users where id = auth.uid());
end;
$$;

comment on function get_current_user_email is 'Returns current authenticated user email (SECURITY DEFINER for auth.users access)';

-- grant execute to authenticated users
grant execute on function get_current_user_email() to authenticated;

-- ----------------------------------------------------------------------------
-- user_has_brief_access
-- checks if the current user can access a specific brief
-- returns true if user is owner or recipient (by id or email)
-- used by rls policies for select, update operations
-- ----------------------------------------------------------------------------
create or replace function user_has_brief_access(brief_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  current_user_email text;
begin
  -- cache current user info for efficiency
  current_user_id := auth.uid();
  current_user_email := public.get_current_user_email();

  return exists (
    -- user is the owner
    select 1 from public.briefs
    where id = brief_id
      and owner_id = current_user_id

    union

    -- user is a recipient (by recipient_id or recipient_email)
    select 1 from public.brief_recipients
    where brief_recipients.brief_id = user_has_brief_access.brief_id
      and (
        recipient_id = current_user_id
        or recipient_email = current_user_email
      )
  );
end;
$$;

comment on function user_has_brief_access is 'Returns true if current user owns or has been granted access to the brief (checks both recipient_id and recipient_email)';

-- ----------------------------------------------------------------------------
-- get_user_by_email
-- lookup user by email from auth.users table
-- needed because auth.users is not directly accessible via supabase client
-- ----------------------------------------------------------------------------
create or replace function get_user_by_email(email_param text)
returns table (id uuid, email text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select au.id, au.email::text
  from auth.users au
  where au.email = email_param;
end;
$$;

comment on function get_user_by_email is 'Looks up user by email from auth.users table (SECURITY DEFINER for auth schema access)';

-- grant execute to authenticated users
grant execute on function get_user_by_email(text) to authenticated;

-- ============================================================================
-- trigger functions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- enforce_creator_brief_limit
-- prevents creators from exceeding 20 brief limit
-- ----------------------------------------------------------------------------
create or replace function enforce_creator_brief_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_role_val public.user_role;
  brief_count integer;
begin
  -- get user's role
  select role into user_role_val
  from public.profiles
  where id = new.owner_id;

  -- only enforce limit for creators
  if user_role_val = 'creator' then
    -- count existing briefs
    select count(*) into brief_count
    from public.briefs
    where owner_id = new.owner_id;

    -- check limit (20 briefs max)
    if brief_count >= 20 then
      raise exception 'Brief limit of 20 reached for creator users';
    end if;
  end if;

  return new;
end;
$$;

comment on function enforce_creator_brief_limit is 'Trigger function: Enforces 20 brief limit for creators';

-- ----------------------------------------------------------------------------
-- enforce_recipient_limit
-- prevents briefs from having more than 10 recipients
-- ----------------------------------------------------------------------------
create or replace function enforce_recipient_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient_count integer;
begin
  -- count existing recipients for this brief
  select count(*) into recipient_count
  from public.brief_recipients
  where brief_id = new.brief_id;

  -- check limit (10 recipients max)
  if recipient_count >= 10 then
    raise exception 'Maximum of 10 recipients per brief exceeded';
  end if;

  return new;
end;
$$;

comment on function enforce_recipient_limit is 'Trigger function: Enforces 10 recipient limit per brief';

-- ----------------------------------------------------------------------------
-- auto_change_status_to_sent
-- automatically changes brief status to 'sent' when first recipient is added
-- ----------------------------------------------------------------------------
create or replace function auto_change_status_to_sent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- update brief status if currently in draft
  update public.briefs
  set
    status = 'sent',
    status_changed_at = now(),
    status_changed_by = new.shared_by,
    updated_at = now()
  where id = new.brief_id
    and status = 'draft';

  return new;
end;
$$;

comment on function auto_change_status_to_sent is 'Trigger function: Changes brief status to sent when shared';

-- ----------------------------------------------------------------------------
-- reset_status_on_brief_edit
-- resets brief status to 'draft' when content is modified
-- ----------------------------------------------------------------------------
create or replace function reset_status_on_brief_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- check if content, header, or footer changed
  if (new.content is distinct from old.content) or
     (new.header is distinct from old.header) or
     (new.footer is distinct from old.footer) then

    -- reset status to draft
    new.status := 'draft';
    new.status_changed_at := now();
    new.status_changed_by := new.owner_id;
  end if;

  return new;
end;
$$;

comment on function reset_status_on_brief_edit is 'Trigger function: Resets status to draft when brief content is edited';

-- ----------------------------------------------------------------------------
-- reset_status_on_all_recipients_removed
-- resets brief status to 'draft' when all recipients are removed
-- ----------------------------------------------------------------------------
create or replace function reset_status_on_all_recipients_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- check if this was the last recipient
  if not exists (
    select 1 from public.brief_recipients
    where brief_id = old.brief_id
  ) then
    -- reset status to draft
    update public.briefs
    set
      status = 'draft',
      status_changed_at = now(),
      status_changed_by = (select owner_id from public.briefs where id = old.brief_id),
      updated_at = now()
    where id = old.brief_id;
  end if;

  return old;
end;
$$;

comment on function reset_status_on_all_recipients_removed is 'Trigger function: Resets status to draft when all recipients removed';

-- ----------------------------------------------------------------------------
-- update_comment_count_on_insert
-- increments denormalized comment count when comment is added
-- ----------------------------------------------------------------------------
create or replace function update_comment_count_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.briefs
  set comment_count = comment_count + 1
  where id = new.brief_id;

  return new;
end;
$$;

comment on function update_comment_count_on_insert is 'Trigger function: Increments comment count on insert';

-- ----------------------------------------------------------------------------
-- update_comment_count_on_delete
-- decrements denormalized comment count when comment is deleted
-- ----------------------------------------------------------------------------
create or replace function update_comment_count_on_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.briefs
  set comment_count = greatest(0, comment_count - 1)
  where id = old.brief_id;

  return old;
end;
$$;

comment on function update_comment_count_on_delete is 'Trigger function: Decrements comment count on delete';

-- ----------------------------------------------------------------------------
-- archive_before_user_deletion
-- archives user data to audit_log before cascading deletion (gdpr compliance)
-- ----------------------------------------------------------------------------
create or replace function archive_before_user_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- archive user profile
  insert into public.audit_log (user_id, action, entity_type, entity_id, old_data)
  select
    old.id,
    'user_deleted',
    'user',
    old.id,
    jsonb_build_object(
      'email', old.email,
      'role', p.role,
      'created_at', p.created_at
    )
  from public.profiles p
  where p.id = old.id;

  -- archive all user's briefs
  insert into public.audit_log (user_id, action, entity_type, entity_id, old_data)
  select
    old.id,
    'brief_deleted',
    'brief',
    b.id,
    to_jsonb(b.*)
  from public.briefs b
  where b.owner_id = old.id;

  return old;
end;
$$;

comment on function archive_before_user_deletion is 'Trigger function: Archives user data before deletion for GDPR compliance';

-- ----------------------------------------------------------------------------
-- audit_comment_deletion
-- logs comment deletions to audit_log
-- handles cascade delete scenario when user is deleted
-- ----------------------------------------------------------------------------
create or replace function audit_comment_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  -- check if user still exists (handles cascade delete scenario)
  select id into v_user_id
  from auth.users
  where id = old.author_id;

  -- insert audit log with user_id = null if user was deleted
  insert into public.audit_log (user_id, action, entity_type, entity_id, old_data)
  values (
    v_user_id,  -- will be null if user doesn't exist
    'comment_deleted',
    'comment',
    old.id,
    to_jsonb(old.*)
  );

  return old;
end;
$$;

comment on function audit_comment_deletion is 'Trigger function: Logs comment deletion to audit trail. Handles cascade delete by setting user_id to null if user no longer exists.';

-- ----------------------------------------------------------------------------
-- create_profile_for_new_user
-- automatically creates user profile when new user registers via supabase auth
-- extracts role from raw_user_meta_data, defaults to 'client'
-- ----------------------------------------------------------------------------
create or replace function create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- create profile with role from metadata
  insert into public.profiles (id, role)
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data->>'role')::public.user_role,
      'client'::public.user_role
    )
  );

  -- log user registration
  insert into public.audit_log (user_id, action, entity_type, entity_id, new_data)
  values (
    new.id,
    'user_registered',
    'user',
    new.id,
    jsonb_build_object(
      'email', new.email,
      'role', coalesce(new.raw_user_meta_data->>'role', 'client'),
      'created_at', new.created_at
    )
  );

  return new;
end;
$$;

comment on function create_profile_for_new_user is 'Trigger function: Auto-creates profile on user signup with role from metadata';

-- ----------------------------------------------------------------------------
-- auto_update_recipient_id
-- automatically fills recipient_id when user registers with pending email
-- called when new user is created in auth.users
-- ----------------------------------------------------------------------------
create or replace function auto_update_recipient_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- when a new user is created, update any pending invitations with their email
  update public.brief_recipients
  set recipient_id = new.id
  where recipient_email = new.email
    and recipient_id is null;

  return new;
end;
$$;

comment on function auto_update_recipient_id is 'Trigger function: Auto-updates recipient_id when user registers with pending invitation email';

-- ============================================================================
-- verification
-- ============================================================================
-- list all functions
-- select
--   n.nspname as schema,
--   p.proname as function_name,
--   pg_get_function_arguments(p.oid) as arguments,
--   case when p.prosecdef then 'DEFINER' else 'INVOKER' end as security
-- from pg_proc p
-- left join pg_namespace n on p.pronamespace = n.oid
-- where n.nspname = 'public'
-- order by function_name;

-- ============================================================================
-- rollback
-- ============================================================================
-- drop function if exists auto_update_recipient_id() cascade;
-- drop function if exists create_profile_for_new_user() cascade;
-- drop function if exists audit_comment_deletion() cascade;
-- drop function if exists archive_before_user_deletion() cascade;
-- drop function if exists update_comment_count_on_delete() cascade;
-- drop function if exists update_comment_count_on_insert() cascade;
-- drop function if exists reset_status_on_all_recipients_removed() cascade;
-- drop function if exists reset_status_on_brief_edit() cascade;
-- drop function if exists auto_change_status_to_sent() cascade;
-- drop function if exists enforce_recipient_limit() cascade;
-- drop function if exists enforce_creator_brief_limit() cascade;
-- drop function if exists get_user_by_email(text) cascade;
-- drop function if exists user_has_brief_access(uuid) cascade;
-- drop function if exists get_current_user_email() cascade;
