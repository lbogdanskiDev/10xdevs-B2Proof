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
