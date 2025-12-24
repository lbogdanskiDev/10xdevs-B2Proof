-- migration: 20251220200000_extensions.sql
-- description: enable required postgresql extensions for the application
-- date: 2025-12-20
-- author: system
--
-- this migration enables extensions required by the b2proof application:
-- - uuid-ossp: uuid generation functions
-- - moddatetime: automatic timestamp update function

-- ============================================================================
-- extensions
-- ============================================================================

-- uuid generation functions (gen_random_uuid, uuid_generate_v4, etc.)
create extension if not exists "uuid-ossp" with schema extensions;

comment on extension "uuid-ossp" is 'Functions to generate universally unique identifiers (UUIDs)';

-- automatic timestamp update function for updated_at columns
create extension if not exists "moddatetime" with schema extensions;

comment on extension "moddatetime" is 'Functions for tracking modification timestamps';

-- ============================================================================
-- verification
-- ============================================================================
-- select extname, extversion from pg_extension where extname in ('uuid-ossp', 'moddatetime');

-- ============================================================================
-- rollback
-- ============================================================================
-- note: extensions are typically not dropped as they may be used by other schemas
-- drop extension if exists "moddatetime";
-- drop extension if exists "uuid-ossp";
