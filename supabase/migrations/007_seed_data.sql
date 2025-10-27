-- Migration: 007_seed_data.sql
-- Description: Seed database with test data for development
-- Date: 2025-01-15
-- Author: System
-- NOTE: This file is OPTIONAL and should only be run in development/staging environments

-- ============================================================================
-- WARNING
-- ============================================================================
-- This file creates test users and data for development purposes only.
-- DO NOT RUN THIS IN PRODUCTION!
--
-- Before running, ensure you have the Supabase service role key.
-- Test users will have the password: TestPassword123

-- ============================================================================
-- TEST USERS
-- ============================================================================

-- Note: Users must be created via Supabase Auth, not directly in auth.users
-- This is a reference of what needs to be created via the API or Supabase Dashboard

-- Test Creator User:
-- Email: creator@test.com
-- Password: TestPassword123
-- Role: creator
-- Create via: supabase.auth.signUp({ email: 'creator@test.com', password: 'TestPassword123', options: { data: { role: 'creator' } } })

-- Test Client User 1:
-- Email: client1@test.com
-- Password: TestPassword123
-- Role: client

-- Test Client User 2:
-- Email: client2@test.com
-- Password: TestPassword123
-- Role: client

-- ============================================================================
-- SEED DATA INSTRUCTIONS
-- ============================================================================

-- To seed test users:
-- 1. Use Supabase Dashboard > Authentication > Users > Add User
--    OR
-- 2. Use Supabase Auth API via your application
--    OR
-- 3. Use the SQL below (requires setting user IDs manually after auth creation)

-- ============================================================================
-- SAMPLE BRIEFS (After creating test users)
-- ============================================================================

-- Replace UUIDs below with actual user IDs after creating test users

-- Sample Brief 1: Draft status
/*
INSERT INTO briefs (owner_id, header, content, footer, status)
VALUES (
  'REPLACE-WITH-CREATOR-USER-ID',
  'Website Redesign Project',
  '{
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "We need to redesign our company website to improve user experience and modernize the design."
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [
          {
            "type": "text",
            "text": "Objectives"
          }
        ]
      },
      {
        "type": "bulletList",
        "content": [
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "Improve mobile responsiveness"
                  }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "Update color scheme and typography"
                  }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "Optimize page load speed"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }'::jsonb,
  'Contact: john.creator@company.com',
  'draft'
);
*/

-- Sample Brief 2: Sent status (with recipient)
/*
-- First, insert the brief
INSERT INTO briefs (id, owner_id, header, content, status)
VALUES (
  'BRIEF-2-UUID',
  'REPLACE-WITH-CREATOR-USER-ID',
  'Mobile App Development Brief',
  '{
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "We are looking to develop a mobile application for iOS and Android platforms."
          }
        ]
      },
      {
        "type": "heading",
        "attrs": { "level": 2 },
        "content": [
          {
            "type": "text",
            "text": "Key Features"
          }
        ]
      },
      {
        "type": "orderedList",
        "content": [
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "User authentication and profiles"
                  }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "Real-time notifications"
                  }
                ]
              }
            ]
          },
          {
            "type": "listItem",
            "content": [
              {
                "type": "paragraph",
                "content": [
                  {
                    "type": "text",
                    "text": "Offline mode with data sync"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }'::jsonb,
  'draft'
);

-- Then share it with a client (this will trigger status change to 'sent')
INSERT INTO brief_recipients (brief_id, recipient_id, shared_by)
VALUES (
  'BRIEF-2-UUID',
  'REPLACE-WITH-CLIENT1-USER-ID',
  'REPLACE-WITH-CREATOR-USER-ID'
);
*/

-- Sample Brief 3: Accepted status
/*
INSERT INTO briefs (id, owner_id, header, content, status, status_changed_by)
VALUES (
  'BRIEF-3-UUID',
  'REPLACE-WITH-CREATOR-USER-ID',
  'Brand Identity Design',
  '{
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          {
            "type": "text",
            "text": "Create a comprehensive brand identity package including logo, color palette, and typography guidelines."
          }
        ]
      }
    ]
  }'::jsonb,
  'accepted',
  'REPLACE-WITH-CLIENT2-USER-ID'
);

-- Share with client
INSERT INTO brief_recipients (brief_id, recipient_id, shared_by)
VALUES (
  'BRIEF-3-UUID',
  'REPLACE-WITH-CLIENT2-USER-ID',
  'REPLACE-WITH-CREATOR-USER-ID'
);
*/

-- ============================================================================
-- SAMPLE COMMENTS
-- ============================================================================

/*
-- Comment on Brief 2
INSERT INTO comments (brief_id, author_id, content)
VALUES (
  'BRIEF-2-UUID',
  'REPLACE-WITH-CLIENT1-USER-ID',
  'This looks great! Can we discuss the timeline for development?'
);

-- Reply from creator
INSERT INTO comments (brief_id, author_id, content)
VALUES (
  'BRIEF-2-UUID',
  'REPLACE-WITH-CREATOR-USER-ID',
  'Absolutely! I estimate 3-4 months for the full project. Let me know if that works for you.'
);

-- Another comment from client
INSERT INTO comments (brief_id, author_id, content)
VALUES (
  'BRIEF-2-UUID',
  'REPLACE-WITH-CLIENT1-USER-ID',
  'That timeline works perfectly. Should we schedule a kickoff meeting?'
);
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check created users (profiles)
-- SELECT id, role, created_at FROM profiles ORDER BY created_at;

-- Check briefs
-- SELECT id, header, status, comment_count, created_at FROM briefs ORDER BY created_at;

-- Check brief sharing
-- SELECT
--   b.header,
--   br.recipient_id,
--   br.shared_at
-- FROM briefs b
-- JOIN brief_recipients br ON b.id = br.brief_id
-- ORDER BY b.header;

-- Check comments
-- SELECT
--   b.header,
--   c.content,
--   c.author_id,
--   c.created_at
-- FROM comments c
-- JOIN briefs b ON c.brief_id = b.id
-- ORDER BY b.header, c.created_at;

-- ============================================================================
-- CLEANUP (Development Only)
-- ============================================================================

-- To remove all seed data:
/*
DELETE FROM comments WHERE brief_id IN (SELECT id FROM briefs WHERE header LIKE '%Test%' OR header LIKE '%Sample%');
DELETE FROM brief_recipients WHERE brief_id IN (SELECT id FROM briefs WHERE header LIKE '%Test%' OR header LIKE '%Sample%');
DELETE FROM briefs WHERE header LIKE '%Test%' OR header LIKE '%Sample%';
-- Delete test users via Supabase Dashboard
*/

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. User creation MUST be done via Supabase Auth (not direct SQL inserts)
--    This ensures proper password hashing and triggers profile creation
--
-- 2. Use the Supabase Dashboard or Auth API for user creation:
--    - Dashboard: Authentication > Users > Add User
--    - API: supabase.auth.signUp()
--
-- 3. After creating users, copy their UUIDs and replace placeholders above
--
-- 4. Consider using a script or API endpoint to seed data programmatically
--    instead of manual SQL for easier repeatability
--
-- 5. Environment variable for easy toggle:
--    - Set SEED_DATA=true in .env.local for development
--    - Use conditional seeding in application code

-- ============================================================================
-- TEST DATA FOR GET /api/briefs ENDPOINT
-- ============================================================================
-- This section adds test data for the mock user from DEFAULT_USER_PROFILE
-- Mock user ID: 00000000-0000-0000-0000-000000000000

-- Insert mock users into auth.users (required for foreign key constraints)
-- Note: In production, users are created via Supabase Auth API
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
VALUES
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'mock.user@example.com',
    crypt('TestPassword123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  ),
  (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'other.user@example.com',
    crypt('TestPassword123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  ),
  (
    '22222222-2222-2222-2222-222222222222'::uuid,
    'shared.user@example.com',
    crypt('TestPassword123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert profiles for test users (triggered automatically in production)
INSERT INTO profiles (id, role)
VALUES
  ('00000000-0000-0000-0000-000000000000'::uuid, 'creator'),
  ('11111111-1111-1111-1111-111111111111'::uuid, 'creator'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'creator')
ON CONFLICT (id) DO NOTHING;

-- Insert test briefs OWNED by mock user (5 briefs with different statuses)
INSERT INTO briefs (id, owner_id, header, content, footer, status, comment_count, created_at, updated_at)
VALUES
  (
    'aaaaaaaa-0001-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Draft Brief - Owned by Mock User',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This is a draft brief content"}]}]}'::jsonb,
    'Draft footer',
    'draft',
    0,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  ),
  (
    'aaaaaaaa-0002-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Sent Brief - Owned by Mock User',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This brief was sent to client"}]}]}'::jsonb,
    'Sent footer',
    'sent',
    2,
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '3 days'
  ),
  (
    'aaaaaaaa-0003-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Accepted Brief - Owned by Mock User',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This brief was accepted by client"}]}]}'::jsonb,
    'Accepted footer',
    'accepted',
    5,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    'aaaaaaaa-0004-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Rejected Brief - Owned by Mock User',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This brief was rejected"}]}]}'::jsonb,
    NULL,
    'rejected',
    3,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '6 days'
  ),
  (
    'aaaaaaaa-0005-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Needs Modification Brief - Owned by Mock User',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Client requested modifications"}]}]}'::jsonb,
    'Needs work',
    'needs_modification',
    8,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 day'
  ),
  -- Briefs owned by OTHER users (to be shared with mock user)
  (
    'bbbbbbbb-0001-0000-0000-000000000001'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Shared Brief from Other User - Sent',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This brief is shared with mock user"}]}]}'::jsonb,
    'Shared footer',
    'sent',
    1,
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '4 days'
  ),
  (
    'bbbbbbbb-0002-0000-0000-000000000002'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    'Shared Brief from Another User - Draft',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Another shared brief"}]}]}'::jsonb,
    NULL,
    'draft',
    0,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
  ),
  (
    'bbbbbbbb-0003-0000-0000-000000000003'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    'Shared Brief - Accepted',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Shared and accepted brief"}]}]}'::jsonb,
    'Success!',
    'accepted',
    4,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '14 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert brief_recipients to establish sharing relationships
-- These make briefs owned by other users accessible to mock user
INSERT INTO brief_recipients (id, brief_id, recipient_id, shared_by, shared_at)
VALUES
  (
    'cccccccc-0001-0000-0000-000000000001'::uuid,
    'bbbbbbbb-0001-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    NOW() - INTERVAL '5 days'
  ),
  (
    'cccccccc-0002-0000-0000-000000000002'::uuid,
    'bbbbbbbb-0002-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    NOW() - INTERVAL '1 day'
  ),
  (
    'cccccccc-0003-0000-0000-000000000003'::uuid,
    'bbbbbbbb-0003-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    '11111111-1111-1111-1111-111111111111'::uuid,
    NOW() - INTERVAL '14 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Test data summary for mock user (00000000-0000-0000-0000-000000000000):
-- - 5 owned briefs: draft(1), sent(1), accepted(1), rejected(1), needs_modification(1)
-- - 3 shared briefs: sent(1), draft(1), accepted(1)
-- Total: 8 briefs accessible
--
-- Expected API results:
-- GET /api/briefs                     -> 8 briefs (all)
-- GET /api/briefs?filter=owned        -> 5 briefs (owned only)
-- GET /api/briefs?filter=shared       -> 3 briefs (shared only)
-- GET /api/briefs?status=draft        -> 2 briefs (1 owned + 1 shared)
-- GET /api/briefs?status=sent         -> 2 briefs (1 owned + 1 shared)
-- GET /api/briefs?status=accepted     -> 2 briefs (1 owned + 1 shared)
-- GET /api/briefs?status=rejected     -> 1 brief (owned)
-- GET /api/briefs?status=needs_modification -> 1 brief (owned)
