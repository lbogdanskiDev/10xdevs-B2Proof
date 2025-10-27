-- Test data seed script for GET /api/briefs endpoint
-- This script creates test briefs for the mock user and additional users

-- Mock user ID from DEFAULT_USER_PROFILE
-- '00000000-0000-0000-0000-000000000000'

-- Insert test users (if not exists)
INSERT INTO auth.users (id, email)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'mock.user@example.com'),
  ('11111111-1111-1111-1111-111111111111', 'other.user@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'shared.user@example.com')
ON CONFLICT (id) DO NOTHING;

-- Insert profiles for test users
INSERT INTO profiles (id, role)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'user'),
  ('11111111-1111-1111-1111-111111111111', 'user'),
  ('22222222-2222-2222-2222-222222222222', 'user')
ON CONFLICT (id) DO NOTHING;

-- Insert test briefs OWNED by mock user
-- 5 briefs with different statuses
INSERT INTO briefs (id, owner_id, header, content, footer, status, comment_count, created_at, updated_at)
VALUES
  (
    'brief-owned-draft-001',
    '00000000-0000-0000-0000-000000000000',
    'Draft Brief - Owned by Mock User',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This is a draft brief content"}]}]}',
    'Draft footer',
    'draft',
    0,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  ),
  (
    'brief-owned-sent-001',
    '00000000-0000-0000-0000-000000000000',
    'Sent Brief - Owned by Mock User',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This brief was sent to client"}]}]}',
    'Sent footer',
    'sent',
    2,
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '3 days'
  ),
  (
    'brief-owned-accepted-001',
    '00000000-0000-0000-0000-000000000000',
    'Accepted Brief - Owned by Mock User',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This brief was accepted by client"}]}]}',
    'Accepted footer',
    'accepted',
    5,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '2 days'
  ),
  (
    'brief-owned-rejected-001',
    '00000000-0000-0000-0000-000000000000',
    'Rejected Brief - Owned by Mock User',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This brief was rejected"}]}]}',
    NULL,
    'rejected',
    3,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '6 days'
  ),
  (
    'brief-owned-needs-mod-001',
    '00000000-0000-0000-0000-000000000000',
    'Needs Modification Brief - Owned by Mock User',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Client requested modifications"}]}]}',
    'Needs work',
    'needs_modification',
    8,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert test briefs OWNED by other users but SHARED with mock user
INSERT INTO briefs (id, owner_id, header, content, footer, status, comment_count, created_at, updated_at)
VALUES
  (
    'brief-shared-sent-001',
    '11111111-1111-1111-1111-111111111111',
    'Shared Brief from Other User - Sent',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This brief is shared with mock user"}]}]}',
    'Shared footer',
    'sent',
    1,
    NOW() - INTERVAL '6 days',
    NOW() - INTERVAL '4 days'
  ),
  (
    'brief-shared-draft-001',
    '22222222-2222-2222-2222-222222222222',
    'Shared Brief from Another User - Draft',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Another shared brief"}]}]}',
    NULL,
    'draft',
    0,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
  ),
  (
    'brief-shared-accepted-001',
    '11111111-1111-1111-1111-111111111111',
    'Shared Brief - Accepted',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Shared and accepted brief"}]}]}',
    'Success!',
    'accepted',
    4,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '14 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert brief_recipients to establish sharing relationships
INSERT INTO brief_recipients (id, brief_id, recipient_id, shared_by, shared_at)
VALUES
  (
    'recipient-001',
    'brief-shared-sent-001',
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '5 days'
  ),
  (
    'recipient-002',
    'brief-shared-draft-001',
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    NOW() - INTERVAL '1 day'
  ),
  (
    'recipient-003',
    'brief-shared-accepted-001',
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    NOW() - INTERVAL '14 days'
  )
ON CONFLICT (id) DO NOTHING;

-- Summary of test data:
-- Mock user (00000000-0000-0000-0000-000000000000) has:
-- - 5 owned briefs (draft, sent, accepted, rejected, needs_modification)
-- - 3 shared briefs (sent, draft, accepted)
-- Total: 8 briefs accessible

-- Expected results for different filters:
-- filter=owned: 5 briefs
-- filter=shared: 3 briefs
-- no filter: 8 briefs (owned + shared)
-- status=draft: 2 briefs (1 owned + 1 shared)
-- status=sent: 2 briefs (1 owned + 1 shared)
-- status=accepted: 2 briefs (1 owned + 1 shared)
-- status=rejected: 1 brief (owned only)
-- status=needs_modification: 1 brief (owned only)
