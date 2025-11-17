-- ============================================================================
-- Development Test Data Seed
-- ============================================================================
-- Description: Seed database with test data for development and testing
-- Usage: npx supabase db reset (automatically applies seeds)
--        OR: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seeds/dev-test-data.sql
--
-- WARNING: This file is for DEVELOPMENT/TESTING only - DO NOT run in production!
-- ============================================================================

-- ============================================================================
-- TEST USERS
-- ============================================================================
-- Create 5 test users with profiles

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'mock.user@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'john.creator@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'jane.client@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'bob.reviewer@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'alice.admin@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

-- Create profiles for test users
INSERT INTO profiles (id, role)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'creator'),  -- mock user is creator
  ('11111111-1111-1111-1111-111111111111', 'creator'),  -- john is creator
  ('22222222-2222-2222-2222-222222222222', 'client'),   -- jane is client
  ('33333333-3333-3333-3333-333333333333', 'client'),   -- bob is client
  ('44444444-4444-4444-4444-444444444444', 'creator')   -- alice is creator
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST BRIEFS
-- ============================================================================
-- Create 5 briefs with different statuses and owners
-- Note: Using specific UUIDs for briefs to reference them later in recipients and comments

INSERT INTO briefs (id, owner_id, header, content, footer, status, comment_count, created_at, updated_at)
VALUES
  -- Brief 1: Draft owned by mock user, no recipients, no comments
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '00000000-0000-0000-0000-000000000000',
    'Q1 2025 Marketing Strategy',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Marketing Strategy Overview"}]},{"type":"paragraph","content":[{"type":"text","text":"This document outlines our marketing strategy for Q1 2025. We will focus on digital channels and content marketing."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Key Objectives"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Increase brand awareness by 30%"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Generate 500 qualified leads"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Launch new product campaign"}]}]}]}]}',
    'Draft - Not ready for review',
    'draft',
    0,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  ),

  -- Brief 2: Sent owned by john, shared with mock user and jane, has comments
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'Website Redesign Proposal',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Website Redesign Project"}]},{"type":"paragraph","content":[{"type":"text","text":"We propose a complete redesign of the company website to improve user experience and conversion rates."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Scope"}]},{"type":"paragraph","content":[{"type":"text","text":"The redesign will include:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"New modern UI/UX design"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Mobile-first responsive layout"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Improved navigation structure"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Performance optimization"}]}]}]}]}',
    'Please review and provide feedback by Friday',
    'sent',
    3,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '2 days'
  ),

  -- Brief 3: Accepted owned by mock user, shared with bob, has comments
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    'Mobile App Development Brief',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Mobile Application Development"}]},{"type":"paragraph","content":[{"type":"text","text":"Proposal for developing a native mobile application for iOS and Android platforms."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Features"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"User authentication and profiles"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Real-time notifications"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"In-app messaging"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Analytics dashboard"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Timeline"}]},{"type":"paragraph","content":[{"type":"text","text":"Estimated completion: 6 months"}]}]}',
    'Approved for development - Start ASAP',
    'accepted',
    5,
    NOW() - INTERVAL '14 days',
    NOW() - INTERVAL '1 day'
  ),

  -- Brief 4: Rejected owned by alice, shared with multiple users, has comments
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    'Social Media Campaign - Summer 2025',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Summer Social Media Campaign"}]},{"type":"paragraph","content":[{"type":"text","text":"Comprehensive social media campaign targeting Gen Z audience for summer season."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Platforms"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Instagram - Primary channel"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"TikTok - Video content"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Twitter - Community engagement"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Budget"}]},{"type":"paragraph","content":[{"type":"text","text":"Proposed budget: $50,000"}]}]}',
    NULL,
    'rejected',
    4,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '8 days'
  ),

  -- Brief 5: Needs modification owned by john, shared with jane and bob, many comments
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '11111111-1111-1111-1111-111111111111',
    'Annual Report 2024',
    '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Annual Report 2024"}]},{"type":"paragraph","content":[{"type":"text","text":"Comprehensive annual report highlighting company achievements, financial performance, and future outlook."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Sections"}]},{"type":"orderedList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Executive Summary"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Financial Highlights"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Operational Review"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Sustainability Initiatives"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Future Outlook"}]}]}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Note:"},{" type":"text","text":" This is a draft version requiring significant revisions based on stakeholder feedback."}]}]}',
    'Major revisions needed - see comments',
    'needs_modification',
    8,
    NOW() - INTERVAL '12 days',
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- BRIEF RECIPIENTS
-- ============================================================================
-- Share briefs with various users (0-3 recipients per brief)

INSERT INTO brief_recipients (brief_id, recipient_id, recipient_email, shared_by, shared_at)
VALUES
  -- Brief 1 (draft): No recipients

  -- Brief 2 (sent): Shared with mock user and jane
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    'mock.user@example.com',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '6 days'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'jane.client@example.com',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '6 days'
  ),

  -- Brief 3 (accepted): Shared with bob
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'bob.reviewer@example.com',
    '00000000-0000-0000-0000-000000000000',
    NOW() - INTERVAL '13 days'
  ),

  -- Brief 4 (rejected): Shared with mock user, john, and bob
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '00000000-0000-0000-0000-000000000000',
    'mock.user@example.com',
    '44444444-4444-4444-4444-444444444444',
    NOW() - INTERVAL '9 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'john.creator@example.com',
    '44444444-4444-4444-4444-444444444444',
    NOW() - INTERVAL '9 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '33333333-3333-3333-3333-333333333333',
    'bob.reviewer@example.com',
    '44444444-4444-4444-4444-444444444444',
    NOW() - INTERVAL '9 days'
  ),

  -- Brief 5 (needs mod): Shared with jane and bob
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    'jane.client@example.com',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '11 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '33333333-3333-3333-3333-333333333333',
    'bob.reviewer@example.com',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '11 days'
  ),

  -- Example of pending invitation (user not yet registered)
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    NULL,
    'pending.user@example.com',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '3 days'
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
-- Add comments to briefs (0-8 comments per brief)

INSERT INTO comments (brief_id, author_id, content, created_at)
VALUES
  -- Brief 1 (draft): No comments

  -- Brief 2 (sent): 3 comments
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '00000000-0000-0000-0000-000000000000',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This looks great! I especially like the mobile-first approach."}]}]}',
    NOW() - INTERVAL '5 days'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Can we add a section about accessibility compliance? It''s important for our users."}]}]}',
    NOW() - INTERVAL '4 days'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Good point! I''ll add accessibility requirements to the scope. Thanks for the feedback!"}]}]}',
    NOW() - INTERVAL '3 days'
  ),

  -- Brief 3 (accepted): 5 comments
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The timeline seems ambitious. Do we have the resources?"}]}]}',
    NOW() - INTERVAL '12 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Yes, we''ve already allocated a team of 5 developers. The timeline is realistic."}]}]}',
    NOW() - INTERVAL '11 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"What about the analytics dashboard? That seems like a complex feature."}]}]}',
    NOW() - INTERVAL '10 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '00000000-0000-0000-0000-000000000000',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"We''ll use a third-party analytics SDK to speed up development. Good question!"}]}]}',
    NOW() - INTERVAL '9 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Approved!"},{" type":"text","text":" Let''s proceed with the development."}]}]}',
    NOW() - INTERVAL '2 days'
  ),

  -- Brief 4 (rejected): 4 comments
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The budget seems too high for the proposed activities."}]}]}',
    NOW() - INTERVAL '9 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '00000000-0000-0000-0000-000000000000',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"I agree. We should focus on fewer platforms with better content quality."}]}]}',
    NOW() - INTERVAL '9 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '33333333-3333-3333-3333-333333333333',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The Gen Z targeting is good, but the execution plan needs more detail."}]}]}',
    NOW() - INTERVAL '8 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"After review, we''re going in a different direction. Thanks for the effort though!"}]}]}',
    NOW() - INTERVAL '8 days'
  ),

  -- Brief 5 (needs mod): 8 comments (most active)
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The executive summary needs to be more concise. Too wordy right now."}]}]}',
    NOW() - INTERVAL '10 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '33333333-3333-3333-3333-333333333333',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Financial highlights section is missing key metrics like EBITDA and revenue growth."}]}]}',
    NOW() - INTERVAL '9 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '11111111-1111-1111-1111-111111111111',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Good catches! I''ll revise both sections this week."}]}]}',
    NOW() - INTERVAL '8 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Can we add more visualizations? Charts and graphs would make the data more digestible."}]}]}',
    NOW() - INTERVAL '7 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '33333333-3333-3333-3333-333333333333',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"The sustainability section is weak. We need more specific initiatives and measurable outcomes."}]}]}',
    NOW() - INTERVAL '5 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '11111111-1111-1111-1111-111111111111',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Working on updated version with all feedback. Should be ready by end of week."}]}]}',
    NOW() - INTERVAL '3 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Also, please review the legal compliance section with the legal team before finalizing."}]}]}',
    NOW() - INTERVAL '2 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '33333333-3333-3333-3333-333333333333',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"italic"}],"text":"Looking forward to the next version!"},{" type":"text","text":" This has potential to be our best annual report yet."}]}]}',
    NOW() - INTERVAL '2 hours'
  );

-- ============================================================================
-- TEST DATA SUMMARY
-- ============================================================================
--
-- USERS (5):
-- 1. mock.user@example.com (creator)
-- 2. john.creator@example.com (creator)
-- 3. jane.client@example.com (client)
-- 4. bob.reviewer@example.com (client)
-- 5. alice.admin@example.com (creator)
--
-- BRIEFS (5):
-- 1. brief-001-draft (draft, mock user, 0 recipients, 0 comments)
-- 2. brief-002-sent (sent, john, 2 recipients, 3 comments)
-- 3. brief-003-accepted (accepted, mock user, 1 recipient, 5 comments)
-- 4. brief-004-rejected (rejected, alice, 3 recipients, 4 comments)
-- 5. brief-005-needs-mod (needs_modification, john, 3 recipients + 1 pending, 8 comments)
--
-- RECIPIENTS (9 total):
-- - Brief 1: 0 recipients
-- - Brief 2: 2 recipients (mock user, jane)
-- - Brief 3: 1 recipient (bob)
-- - Brief 4: 3 recipients (mock user, john, bob)
-- - Brief 5: 3 recipients (jane, bob, pending.user@example.com)
--
-- COMMENTS (20 total):
-- - Brief 1: 0 comments
-- - Brief 2: 3 comments
-- - Brief 3: 5 comments
-- - Brief 4: 4 comments
-- - Brief 5: 8 comments
--
-- ============================================================================
