-- migration: 20251220200007_seed_data.sql
-- description: seed database with test data for development
-- date: 2025-12-20
-- author: system
--
-- warning: this file is optional and should only be run in development/staging environments
-- do not run this in production!
--
-- this migration creates test users and data for development purposes:
-- - 3 test users (1 creator, 2 clients)
-- - 8 briefs with various statuses
-- - brief sharing relationships
-- - sample comments (commented out)

-- ============================================================================
-- warning
-- ============================================================================
-- this file creates test users and data for development purposes only.
-- do not run this in production!
--
-- test users will have the password: TestPassword123

-- ============================================================================
-- test users
-- ============================================================================

-- note: users must be created via supabase auth in production
-- these inserts are for local development with supabase local

-- insert mock users into auth.users (required for foreign key constraints)
-- note: all token fields must be empty strings (not null) for supabase auth to work
insert into auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role,
  instance_id,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  reauthentication_token
)
values
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'creator@test.com',
    crypt('TestPassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '00000000-0000-0000-0000-000000000000'::uuid,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"role": "creator"}'::jsonb,
    false,
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ),
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'client1@test.com',
    crypt('TestPassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '00000000-0000-0000-0000-000000000000'::uuid,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"role": "client"}'::jsonb,
    false,
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ),
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'client2@test.com',
    crypt('TestPassword123', gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '00000000-0000-0000-0000-000000000000'::uuid,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"role": "client"}'::jsonb,
    false,
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

-- ============================================================================
-- test profiles
-- ============================================================================

-- insert profiles for test users
-- note: trigger may not fire with ON CONFLICT DO NOTHING, so we insert explicitly
insert into profiles (id, role, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000'::uuid, 'creator', now(), now()),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'client', now(), now()),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'client', now(), now())
on conflict (id) do update set role = excluded.role;

-- ============================================================================
-- test briefs
-- ============================================================================

-- insert test briefs owned by creator user (5 briefs with different statuses)
insert into briefs (id, owner_id, header, content, footer, status, comment_count, created_at, updated_at)
values
  (
    'aaaaaaaa-0001-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Website Redesign Project',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"We need to redesign our company website to improve user experience."}]}]}'::jsonb,
    'Contact: creator@test.com',
    'draft',
    0,
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  (
    'aaaaaaaa-0002-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Mobile App Development',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Developing a mobile application for iOS and Android platforms."}]}]}'::jsonb,
    'Timeline: 3 months',
    'sent',
    2,
    now() - interval '4 days',
    now() - interval '3 days'
  ),
  (
    'aaaaaaaa-0003-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Brand Identity Design',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Create a comprehensive brand identity package including logo and guidelines."}]}]}'::jsonb,
    'Budget: $5000',
    'accepted',
    5,
    now() - interval '10 days',
    now() - interval '2 days'
  ),
  (
    'aaaaaaaa-0004-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'E-commerce Platform',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Building an e-commerce platform with payment integration."}]}]}'::jsonb,
    null,
    'rejected',
    3,
    now() - interval '7 days',
    now() - interval '6 days'
  ),
  (
    'aaaaaaaa-0005-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Marketing Campaign',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Digital marketing campaign for Q1 product launch."}]}]}'::jsonb,
    'Review needed',
    'needs_modification',
    8,
    now() - interval '3 days',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- ============================================================================
-- test brief recipients (sharing relationships)
-- ============================================================================

-- share briefs with clients
insert into brief_recipients (id, brief_id, recipient_id, recipient_email, shared_by, shared_at)
values
  -- brief 2 (sent) shared with client1
  (
    'cccccccc-0001-0000-0000-000000000001'::uuid,
    'aaaaaaaa-0002-0000-0000-000000000002'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'client1@test.com',
    '00000000-0000-0000-0000-000000000000'::uuid,
    now() - interval '3 days'
  ),
  -- brief 3 (accepted) shared with client2
  (
    'cccccccc-0002-0000-0000-000000000002'::uuid,
    'aaaaaaaa-0003-0000-0000-000000000003'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'client2@test.com',
    '00000000-0000-0000-0000-000000000000'::uuid,
    now() - interval '8 days'
  ),
  -- brief 4 (rejected) shared with client1
  (
    'cccccccc-0003-0000-0000-000000000003'::uuid,
    'aaaaaaaa-0004-0000-0000-000000000004'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'client1@test.com',
    '00000000-0000-0000-0000-000000000000'::uuid,
    now() - interval '6 days'
  ),
  -- brief 5 (needs_modification) shared with both clients
  (
    'cccccccc-0004-0000-0000-000000000004'::uuid,
    'aaaaaaaa-0005-0000-0000-000000000005'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'client1@test.com',
    '00000000-0000-0000-0000-000000000000'::uuid,
    now() - interval '2 days'
  ),
  (
    'cccccccc-0005-0000-0000-000000000005'::uuid,
    'aaaaaaaa-0005-0000-0000-000000000005'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'client2@test.com',
    '00000000-0000-0000-0000-000000000000'::uuid,
    now() - interval '2 days'
  ),
  -- pending invitation (no recipient_id yet)
  (
    'cccccccc-0006-0000-0000-000000000006'::uuid,
    'aaaaaaaa-0002-0000-0000-000000000002'::uuid,
    null,
    'pending@example.com',
    '00000000-0000-0000-0000-000000000000'::uuid,
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- ============================================================================
-- test comments (optional)
-- ============================================================================

/*
-- uncomment to add sample comments
insert into comments (id, brief_id, author_id, content, created_at)
values
  (
    'dddddddd-0001-0000-0000-000000000001'::uuid,
    'aaaaaaaa-0002-0000-0000-000000000002'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'This looks great! Can we discuss the timeline?',
    now() - interval '2 days'
  ),
  (
    'dddddddd-0002-0000-0000-000000000002'::uuid,
    'aaaaaaaa-0002-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Absolutely! I estimate 3-4 months for the full project.',
    now() - interval '2 days' + interval '1 hour'
  ),
  (
    'dddddddd-0003-0000-0000-000000000003'::uuid,
    'aaaaaaaa-0003-0000-0000-000000000003'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'The brand guidelines look perfect. Approved!',
    now() - interval '3 days'
  )
on conflict (id) do nothing;
*/

-- ============================================================================
-- test data summary
-- ============================================================================
--
-- users:
-- - creator@test.com (creator role) - id: 00000000-0000-0000-0000-000000000000
-- - client1@test.com (client role) - id: 11111111-1111-1111-1111-111111111111
-- - client2@test.com (client role) - id: 22222222-2222-2222-2222-222222222222
--
-- briefs (all owned by creator):
-- - aaaaaaaa-0001: draft (not shared)
-- - aaaaaaaa-0002: sent (shared with client1 + pending invitation)
-- - aaaaaaaa-0003: accepted (shared with client2)
-- - aaaaaaaa-0004: rejected (shared with client1)
-- - aaaaaaaa-0005: needs_modification (shared with both clients)
--
-- expected api results for creator:
-- get /api/briefs              -> 5 briefs (all owned)
-- get /api/briefs?status=draft -> 1 brief
--
-- expected api results for client1:
-- get /api/briefs              -> 3 briefs (shared: 0002, 0004, 0005)
-- get /api/briefs?status=sent  -> 1 brief (0002)
--
-- expected api results for client2:
-- get /api/briefs              -> 2 briefs (shared: 0003, 0005)

-- ============================================================================
-- verification
-- ============================================================================
-- select * from profiles order by role;
-- select id, header, status, comment_count from briefs order by created_at;
-- select br.*, b.header from brief_recipients br join briefs b on br.brief_id = b.id;

-- ============================================================================
-- cleanup (development only)
-- ============================================================================
-- to remove all test data:
-- delete from comments where author_id in ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
-- delete from brief_recipients where shared_by = '00000000-0000-0000-0000-000000000000';
-- delete from briefs where owner_id = '00000000-0000-0000-0000-000000000000';
-- delete from profiles where id in ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
-- delete from auth.users where id in ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
