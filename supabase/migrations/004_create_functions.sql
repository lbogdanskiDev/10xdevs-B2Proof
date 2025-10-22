-- Migration: 004_create_functions.sql
-- Description: Create helper functions for RLS policies and triggers
-- Date: 2025-01-15
-- Author: System

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- user_has_brief_access
-- Checks if the current user can access a specific brief
-- Used by RLS policies for SELECT, UPDATE operations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION user_has_brief_access(brief_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    -- User is the owner
    SELECT 1 FROM public.briefs
    WHERE id = brief_id
      AND owner_id = auth.uid()

    UNION

    -- User is a recipient
    SELECT 1 FROM public.brief_recipients
    WHERE brief_recipients.brief_id = user_has_brief_access.brief_id
      AND recipient_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION user_has_brief_access IS 'Returns true if current user owns or has been granted access to the brief';

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- enforce_creator_brief_limit
-- Prevents creators from exceeding 20 brief limit
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_creator_brief_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_role_val public.user_role;
  brief_count INTEGER;
BEGIN
  -- Get user's role
  SELECT role INTO user_role_val
  FROM public.profiles
  WHERE id = NEW.owner_id;

  -- Only enforce limit for creators
  IF user_role_val = 'creator' THEN
    -- Count existing briefs
    SELECT COUNT(*) INTO brief_count
    FROM public.briefs
    WHERE owner_id = NEW.owner_id;

    -- Check limit
    IF brief_count >= 20 THEN
      RAISE EXCEPTION 'Brief limit of 20 reached for creator users';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_creator_brief_limit IS 'Trigger function: Enforces 20 brief limit for creators';

-- ----------------------------------------------------------------------------
-- enforce_recipient_limit
-- Prevents briefs from having more than 10 recipients
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_recipient_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  recipient_count INTEGER;
BEGIN
  -- Count existing recipients for this brief
  SELECT COUNT(*) INTO recipient_count
  FROM public.brief_recipients
  WHERE brief_id = NEW.brief_id;

  -- Check limit
  IF recipient_count >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 recipients per brief exceeded';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_recipient_limit IS 'Trigger function: Enforces 10 recipient limit per brief';

-- ----------------------------------------------------------------------------
-- auto_change_status_to_sent
-- Automatically changes brief status to 'sent' when first recipient is added
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_change_status_to_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update brief status if currently in draft
  UPDATE public.briefs
  SET
    status = 'sent',
    status_changed_at = NOW(),
    status_changed_by = NEW.shared_by,
    updated_at = NOW()
  WHERE id = NEW.brief_id
    AND status = 'draft';

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_change_status_to_sent IS 'Trigger function: Changes brief status to sent when shared';

-- ----------------------------------------------------------------------------
-- reset_status_on_brief_edit
-- Resets brief status to 'draft' when content is modified
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reset_status_on_brief_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if content, header, or footer changed
  IF (NEW.content IS DISTINCT FROM OLD.content) OR
     (NEW.header IS DISTINCT FROM OLD.header) OR
     (NEW.footer IS DISTINCT FROM OLD.footer) THEN

    -- Reset status to draft
    NEW.status := 'draft';
    NEW.status_changed_at := NOW();
    NEW.status_changed_by := NEW.owner_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION reset_status_on_brief_edit IS 'Trigger function: Resets status to draft when brief content is edited';

-- ----------------------------------------------------------------------------
-- reset_status_on_all_recipients_removed
-- Resets brief status to 'draft' when all recipients are removed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reset_status_on_all_recipients_removed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if this was the last recipient
  IF NOT EXISTS (
    SELECT 1 FROM public.brief_recipients
    WHERE brief_id = OLD.brief_id
  ) THEN
    -- Reset status to draft
    UPDATE public.briefs
    SET
      status = 'draft',
      status_changed_at = NOW(),
      status_changed_by = (SELECT owner_id FROM public.briefs WHERE id = OLD.brief_id),
      updated_at = NOW()
    WHERE id = OLD.brief_id;
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION reset_status_on_all_recipients_removed IS 'Trigger function: Resets status to draft when all recipients removed';

-- ----------------------------------------------------------------------------
-- update_comment_count_on_insert
-- Increments denormalized comment count when comment is added
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_comment_count_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.briefs
  SET comment_count = comment_count + 1
  WHERE id = NEW.brief_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_comment_count_on_insert IS 'Trigger function: Increments comment count on insert';

-- ----------------------------------------------------------------------------
-- update_comment_count_on_delete
-- Decrements denormalized comment count when comment is deleted
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_comment_count_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.briefs
  SET comment_count = GREATEST(0, comment_count - 1)
  WHERE id = OLD.brief_id;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION update_comment_count_on_delete IS 'Trigger function: Decrements comment count on delete';

-- ----------------------------------------------------------------------------
-- archive_before_user_deletion
-- Archives user data to audit_log before cascading deletion (GDPR compliance)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION archive_before_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Archive user profile
  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_data)
  SELECT
    OLD.id,
    'user_deleted',
    'user',
    OLD.id,
    jsonb_build_object(
      'email', OLD.email,
      'role', p.role,
      'created_at', p.created_at
    )
  FROM public.profiles p
  WHERE p.id = OLD.id;

  -- Archive all user's briefs
  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_data)
  SELECT
    OLD.id,
    'brief_deleted',
    'brief',
    b.id,
    to_jsonb(b.*)
  FROM public.briefs b
  WHERE b.owner_id = OLD.id;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION archive_before_user_deletion IS 'Trigger function: Archives user data before deletion for GDPR compliance';

-- ----------------------------------------------------------------------------
-- audit_comment_deletion
-- Logs comment deletions to audit_log
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_comment_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, old_data)
  VALUES (
    OLD.author_id,
    'comment_deleted',
    'comment',
    OLD.id,
    to_jsonb(OLD.*)
  );

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION audit_comment_deletion IS 'Trigger function: Logs comment deletion to audit trail';

-- ----------------------------------------------------------------------------
-- create_profile_for_new_user
-- Automatically creates user profile when new user registers via Supabase Auth
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Create profile with role from metadata
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'client'::public.user_role
    )
  );

  -- Log user registration
  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    NEW.id,
    'user_registered',
    'user',
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'role', COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
      'created_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION create_profile_for_new_user IS 'Trigger function: Auto-creates profile on user signup with role from metadata';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- List all functions
-- SELECT
--   n.nspname as schema,
--   p.proname as function_name,
--   pg_get_function_arguments(p.oid) as arguments,
--   t.typname as return_type,
--   CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END as security
-- FROM pg_proc p
-- LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
-- LEFT JOIN pg_type t ON p.prorettype = t.oid
-- WHERE n.nspname = 'public'
--   AND p.proname LIKE '%brief%' OR p.proname LIKE '%user%' OR p.proname LIKE '%comment%'
-- ORDER BY function_name;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP FUNCTION IF EXISTS create_profile_for_new_user() CASCADE;
-- DROP FUNCTION IF EXISTS audit_comment_deletion() CASCADE;
-- DROP FUNCTION IF EXISTS archive_before_user_deletion() CASCADE;
-- DROP FUNCTION IF EXISTS update_comment_count_on_delete() CASCADE;
-- DROP FUNCTION IF EXISTS update_comment_count_on_insert() CASCADE;
-- DROP FUNCTION IF EXISTS reset_status_on_all_recipients_removed() CASCADE;
-- DROP FUNCTION IF EXISTS reset_status_on_brief_edit() CASCADE;
-- DROP FUNCTION IF EXISTS auto_change_status_to_sent() CASCADE;
-- DROP FUNCTION IF EXISTS enforce_recipient_limit() CASCADE;
-- DROP FUNCTION IF EXISTS enforce_creator_brief_limit() CASCADE;
-- DROP FUNCTION IF EXISTS user_has_brief_access(UUID) CASCADE;
