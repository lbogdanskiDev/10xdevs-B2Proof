# Database Schema - B2Proof

## Overview

This schema is designed for a PostgreSQL database using Supabase as the backend. It supports a brief management system where creators can create, share, and manage project briefs, and clients can review and respond to them.

## Tables

### 1. profiles

Extends Supabase Auth users with additional role information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | User ID from Supabase Auth |
| role | user_role | NOT NULL | User role: 'creator' or 'client' |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Profile creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `id` REFERENCES `auth.users(id)` ON DELETE CASCADE

**Indexes:**
- PRIMARY KEY index on `id`

---

### 2. briefs

Main entity storing project briefs created by users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() | Unique brief identifier |
| owner_id | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Brief creator |
| header | TEXT | NOT NULL, CHECK (char_length(header) <= 200 AND char_length(header) > 0) | Brief title (max 200 chars) |
| content | JSONB | NOT NULL | TipTap document structure |
| footer | TEXT | NULL, CHECK (footer IS NULL OR char_length(footer) <= 200) | Optional footer (max 200 chars) |
| status | brief_status | NOT NULL DEFAULT 'draft' | Current brief status |
| status_changed_at | TIMESTAMPTZ | NULL | When status was last changed |
| status_changed_by | UUID | NULL, REFERENCES auth.users(id) ON DELETE SET NULL | Who changed the status |
| comment_count | INTEGER | NOT NULL DEFAULT 0, CHECK (comment_count >= 0) | Denormalized comment count |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Last update timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `owner_id` REFERENCES `auth.users(id)` ON DELETE CASCADE
- FOREIGN KEY: `status_changed_by` REFERENCES `auth.users(id)` ON DELETE SET NULL
- CHECK: `char_length(header) <= 200 AND char_length(header) > 0`
- CHECK: `footer IS NULL OR char_length(footer) <= 200`
- CHECK: `comment_count >= 0`

**Indexes:**
- PRIMARY KEY index on `id`
- Index on `(owner_id, updated_at DESC)` for user's brief list with pagination
- Index on `(status, updated_at DESC)` for filtering by status
- Index on `owner_id` for ownership checks

---

### 3. brief_recipients

Junction table tracking brief sharing with full audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() | Unique recipient record ID |
| brief_id | UUID | NOT NULL, REFERENCES briefs(id) ON DELETE CASCADE | Brief being shared |
| recipient_id | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User receiving access |
| shared_by | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Who shared the brief |
| shared_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | When access was granted |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `brief_id` REFERENCES `briefs(id)` ON DELETE CASCADE
- FOREIGN KEY: `recipient_id` REFERENCES `auth.users(id)` ON DELETE CASCADE
- FOREIGN KEY: `shared_by` REFERENCES `auth.users(id)` ON DELETE CASCADE
- UNIQUE: `(brief_id, recipient_id)` to prevent duplicate shares

**Indexes:**
- PRIMARY KEY index on `id`
- UNIQUE index on `(brief_id, recipient_id)`
- Index on `recipient_id` for finding briefs shared with user
- Index on `brief_id` for finding recipients of a brief

---

### 4. comments

User comments on briefs for collaboration and discussion.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() | Unique comment identifier |
| brief_id | UUID | NOT NULL, REFERENCES briefs(id) ON DELETE CASCADE | Brief being commented on |
| author_id | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Comment author |
| content | TEXT | NOT NULL, CHECK (char_length(content) <= 1000 AND char_length(content) > 0) | Comment text (max 1000 chars) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation timestamp |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `brief_id` REFERENCES `briefs(id)` ON DELETE CASCADE
- FOREIGN KEY: `author_id` REFERENCES `auth.users(id)` ON DELETE CASCADE
- CHECK: `char_length(content) <= 1000 AND char_length(content) > 0`

**Indexes:**
- PRIMARY KEY index on `id`
- Index on `(brief_id, created_at DESC)` for chronological comment display
- Index on `author_id` for user's comment history

---

### 5. audit_log

Universal audit trail for tracking critical operations and deletions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() | Unique log entry identifier |
| user_id | UUID | NULL, REFERENCES auth.users(id) ON DELETE SET NULL | User who performed action |
| action | audit_action | NOT NULL | Type of action performed |
| entity_type | TEXT | NOT NULL | Entity affected (e.g., 'brief', 'comment', 'user') |
| entity_id | UUID | NOT NULL | ID of affected entity |
| old_data | JSONB | NULL | State before change (for updates/deletes) |
| new_data | JSONB | NULL | State after change (for inserts/updates) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | When action occurred |

**Constraints:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `auth.users(id)` ON DELETE SET NULL

**Indexes:**
- PRIMARY KEY index on `id`
- Index on `(entity_type, entity_id)` for entity history lookup
- Index on `(user_id, created_at DESC)` for user activity history
- Index on `created_at DESC` for recent activity queries

---

## Enums

### user_role
```sql
CREATE TYPE user_role AS ENUM ('creator', 'client');
```

### brief_status
```sql
CREATE TYPE brief_status AS ENUM (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'needs_modification'
);
```

### audit_action
```sql
CREATE TYPE audit_action AS ENUM (
  'user_registered',
  'user_deleted',
  'brief_created',
  'brief_updated',
  'brief_deleted',
  'brief_shared',
  'brief_unshared',
  'brief_status_changed',
  'comment_created',
  'comment_deleted'
);
```

---

## Relationships

### One-to-One
- `profiles.id` ↔ `auth.users.id` (extends Supabase Auth user)

### One-to-Many
- `auth.users.id` → `briefs.owner_id` (user owns multiple briefs)
- `auth.users.id` → `briefs.status_changed_by` (user can change status of multiple briefs)
- `briefs.id` → `comments.brief_id` (brief has multiple comments)
- `auth.users.id` → `comments.author_id` (user authors multiple comments)
- `auth.users.id` → `brief_recipients.recipient_id` (user receives multiple briefs)
- `auth.users.id` → `brief_recipients.shared_by` (user shares multiple briefs)
- `auth.users.id` → `audit_log.user_id` (user performs multiple actions)

### Many-to-Many
- `briefs` ↔ `auth.users` through `brief_recipients` (briefs can be shared with multiple users, users can receive multiple briefs)

---

## Triggers

### 1. update_updated_at_column
**Purpose:** Automatically update `updated_at` timestamp on row modification
**Tables:** `profiles`, `briefs`
**Timing:** BEFORE UPDATE
**Function:** Uses `moddatetime` extension

---

### 2. enforce_creator_brief_limit
**Purpose:** Enforce 20 brief limit for users with 'creator' role
**Table:** `briefs`
**Timing:** BEFORE INSERT
**Logic:**
```sql
IF (SELECT role FROM profiles WHERE id = NEW.owner_id) = 'creator' THEN
  IF (SELECT COUNT(*) FROM briefs WHERE owner_id = NEW.owner_id) >= 20 THEN
    RAISE EXCEPTION 'Brief limit of 20 reached for creator users';
  END IF;
END IF;
```

---

### 3. enforce_recipient_limit
**Purpose:** Enforce limit of 10 recipients per brief
**Table:** `brief_recipients`
**Timing:** BEFORE INSERT
**Logic:**
```sql
IF (SELECT COUNT(*) FROM brief_recipients WHERE brief_id = NEW.brief_id) >= 10 THEN
  RAISE EXCEPTION 'Maximum of 10 recipients per brief exceeded';
END IF;
```

---

### 4. auto_change_status_to_sent
**Purpose:** Automatically change brief status from 'draft' to 'sent' when first recipient is added
**Table:** `brief_recipients`
**Timing:** AFTER INSERT
**Logic:**
```sql
UPDATE briefs
SET
  status = 'sent',
  status_changed_at = NOW(),
  status_changed_by = NEW.shared_by,
  updated_at = NOW()
WHERE
  id = NEW.brief_id
  AND status = 'draft';
```

---

### 5. reset_status_on_brief_edit
**Purpose:** Reset brief status to 'draft' when content/header/footer is modified
**Table:** `briefs`
**Timing:** BEFORE UPDATE
**Logic:**
```sql
IF (NEW.content IS DISTINCT FROM OLD.content) OR
   (NEW.header IS DISTINCT FROM OLD.header) OR
   (NEW.footer IS DISTINCT FROM OLD.footer) THEN
  NEW.status := 'draft';
  NEW.status_changed_at := NOW();
  NEW.status_changed_by := NEW.owner_id;
END IF;
```

---

### 6. reset_status_on_all_recipients_removed
**Purpose:** Reset brief status to 'draft' when all recipients lose access
**Table:** `brief_recipients`
**Timing:** AFTER DELETE
**Logic:**
```sql
IF NOT EXISTS (SELECT 1 FROM brief_recipients WHERE brief_id = OLD.brief_id) THEN
  UPDATE briefs
  SET
    status = 'draft',
    status_changed_at = NOW(),
    status_changed_by = (SELECT owner_id FROM briefs WHERE id = OLD.brief_id),
    updated_at = NOW()
  WHERE id = OLD.brief_id;
END IF;
```

---

### 7. update_comment_count_on_insert
**Purpose:** Increment comment_count when comment is added
**Table:** `comments`
**Timing:** AFTER INSERT
**Logic:**
```sql
UPDATE briefs
SET comment_count = comment_count + 1
WHERE id = NEW.brief_id;
```

---

### 8. update_comment_count_on_delete
**Purpose:** Decrement comment_count when comment is deleted
**Table:** `comments`
**Timing:** AFTER DELETE
**Logic:**
```sql
UPDATE briefs
SET comment_count = GREATEST(0, comment_count - 1)
WHERE id = OLD.brief_id;
```

---

### 9. archive_before_user_deletion
**Purpose:** Archive user data to audit_log before cascading deletion
**Table:** `auth.users`
**Timing:** BEFORE DELETE
**Logic:**
```sql
-- Archive user profile
INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_data)
SELECT OLD.id, 'user_deleted', 'user', OLD.id,
  jsonb_build_object(
    'email', OLD.email,
    'role', p.role,
    'created_at', p.created_at
  )
FROM profiles p WHERE p.id = OLD.id;

-- Archive all user briefs
INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_data)
SELECT OLD.id, 'brief_deleted', 'brief', b.id,
  to_jsonb(b.*)
FROM briefs b WHERE b.owner_id = OLD.id;
```

---

### 10. audit_comment_deletion
**Purpose:** Log comment deletions to audit_log
**Table:** `comments`
**Timing:** BEFORE DELETE
**Logic:**
```sql
INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_data)
VALUES (
  OLD.author_id,
  'comment_deleted',
  'comment',
  OLD.id,
  to_jsonb(OLD.*)
);
```

---

### 11. create_profile_for_new_user
**Purpose:** Automatically create user profile when new user registers via Supabase Auth
**Table:** `auth.users`
**Timing:** AFTER INSERT
**Logic:**
```sql
-- Function to create profile from auth.users metadata
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'client'::user_role
    )
  );

  -- Log user registration to audit log
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

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();
```

**Notes:**
- Role is extracted from `raw_user_meta_data->>'role'` passed during signup
- Defaults to `'client'` if no role is specified
- Profile creation happens automatically, no API endpoint needed
- Uses `SECURITY DEFINER` to run with elevated privileges (required for inserting into `public.profiles` from `auth.users` trigger)
- Also logs user registration to audit log

---

## Row Level Security (RLS) Policies

All tables have RLS enabled. Policies are defined separately for each operation (SELECT, INSERT, UPDATE, DELETE).

### profiles

**SELECT:**
- **Policy:** `profiles_select_own`
- **Rule:** `auth.uid() = id`
- **Description:** Users can view their own profile

**UPDATE:**
- **Policy:** `profiles_update_own`
- **Rule:** `auth.uid() = id`
- **Description:** Users can update their own profile

**INSERT:**
- **Policy:** `profiles_insert_own`
- **Rule:** `auth.uid() = id`
- **Description:** Users can create their own profile during registration

**DELETE:**
- **Policy:** `profiles_delete_own`
- **Rule:** `auth.uid() = id`
- **Description:** Users can delete their own profile

---

### briefs

**Helper Function:**
```sql
CREATE FUNCTION user_has_brief_access(brief_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM briefs b
    WHERE b.id = brief_id AND b.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM brief_recipients br
    WHERE br.brief_id = brief_id AND br.recipient_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**SELECT:**
- **Policy:** `briefs_select_accessible`
- **Rule:** `user_has_brief_access(id)`
- **Description:** Users can view briefs they own or have been shared with

**INSERT:**
- **Policy:** `briefs_insert_as_creator`
- **Rule:** `auth.uid() = owner_id AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'creator'`
- **Description:** Only creators can create briefs

**UPDATE:**
- **Policy:** `briefs_update_own`
- **Rule:** `auth.uid() = owner_id`
- **Description:** Only brief owner can update brief content/header/footer

- **Policy:** `briefs_update_status_by_client`
- **Rule:**
```sql
user_has_brief_access(id)
AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'client'
AND status_changed_by = auth.uid()
AND status IN ('accepted', 'rejected', 'needs_modification')
```
- **Description:** Clients with access can change status to accepted/rejected/needs_modification

**DELETE:**
- **Policy:** `briefs_delete_own`
- **Rule:** `auth.uid() = owner_id`
- **Description:** Only brief owner can delete brief

---

### brief_recipients

**SELECT:**
- **Policy:** `brief_recipients_select_accessible`
- **Rule:**
```sql
EXISTS (
  SELECT 1 FROM briefs b
  WHERE b.id = brief_id AND b.owner_id = auth.uid()
) OR recipient_id = auth.uid()
```
- **Description:** Brief owners and recipients can view sharing information

**INSERT:**
- **Policy:** `brief_recipients_insert_as_owner`
- **Rule:**
```sql
EXISTS (
  SELECT 1 FROM briefs b
  WHERE b.id = brief_id AND b.owner_id = auth.uid()
) AND shared_by = auth.uid()
```
- **Description:** Only brief owner can share brief

**DELETE:**
- **Policy:** `brief_recipients_delete_as_owner`
- **Rule:**
```sql
EXISTS (
  SELECT 1 FROM briefs b
  WHERE b.id = brief_id AND b.owner_id = auth.uid()
)
```
- **Description:** Only brief owner can revoke access

---

### comments

**SELECT:**
- **Policy:** `comments_select_accessible`
- **Rule:** `user_has_brief_access(brief_id)`
- **Description:** Users with brief access can view comments

**INSERT:**
- **Policy:** `comments_insert_on_accessible`
- **Rule:** `user_has_brief_access(brief_id) AND author_id = auth.uid()`
- **Description:** Users with brief access can add comments

**DELETE:**
- **Policy:** `comments_delete_own`
- **Rule:** `author_id = auth.uid()`
- **Description:** Users can delete their own comments

---

### audit_log

**SELECT:**
- **Policy:** `audit_log_select_admin_only`
- **Rule:** `FALSE` (or admin check if admin role exists)
- **Description:** Audit log is write-only for regular users

**No INSERT/UPDATE/DELETE policies for users** - only triggers can write to this table.

---

## Indexes Summary

### profiles
- `id` (PRIMARY KEY - automatic)

### briefs
- `id` (PRIMARY KEY - automatic)
- `(owner_id, updated_at DESC)` - for user's brief list with pagination
- `(status, updated_at DESC)` - for filtering by status
- `owner_id` - for ownership checks

### brief_recipients
- `id` (PRIMARY KEY - automatic)
- `(brief_id, recipient_id)` (UNIQUE - automatic)
- `recipient_id` - for finding briefs shared with user
- `brief_id` - for finding recipients of a brief

### comments
- `id` (PRIMARY KEY - automatic)
- `(brief_id, created_at DESC)` - for chronological comment display
- `author_id` - for user's comment history

### audit_log
- `id` (PRIMARY KEY - automatic)
- `(entity_type, entity_id)` - for entity history lookup
- `(user_id, created_at DESC)` - for user activity history
- `created_at DESC` - for recent activity queries

---

## Design Decisions & Rationale

### 1. Supabase Auth Integration
- Leverages Supabase's built-in `auth.users` table for authentication
- `profiles` table extends auth with application-specific data (role)
- Session management fully handled by Supabase Auth

### 2. JSONB for TipTap Content
- Stores full document structure: `{type: "doc", content: [...]}`
- Provides flexibility for rich text features
- Enables potential JSON querying if needed in future

### 3. Denormalized comment_count
- Eliminates need for COUNT() aggregation on brief lists
- Maintained by triggers for consistency
- Significant performance improvement for pagination

### 4. Status Workflow Automation
- Triggers enforce business rules at database level
- Prevents invalid state transitions
- Reduces application logic complexity

### 5. Hard Delete with Audit Trail
- Simplifies queries (no soft delete filtering)
- Audit log preserves history for compliance
- Satisfies GDPR right to deletion

### 6. Row Level Security
- Database-level authorization prevents data leaks
- Granular policies per operation type
- Helper functions encapsulate complex access logic

### 7. Character Limits via CHECK Constraints
- Database enforces limits (header: 200, content: 10000, footer: 200, comment: 1000)
- Prevents invalid data at persistence layer
- Uses `char_length()` for accurate Unicode counting

### 8. Composite Indexes
- `(owner_id, updated_at DESC)` optimizes brief list pagination
- `(brief_id, created_at DESC)` optimizes comment chronological display
- Supports common query patterns identified in PRD

### 9. Cascading Deletes
- User deletion cascades to briefs, comments, recipients
- Brief deletion cascades to comments and recipients
- Maintains referential integrity automatically

### 10. Migration Structure
- Separate numbered files for clear dependency order
- Enables rollback and version control
- Facilitates team collaboration and review

### 11. Automatic Profile Creation
- Trigger automatically creates profile when user signs up via Supabase Auth
- Extracts role from `raw_user_meta_data` passed during registration
- Defaults to 'client' role if not specified
- Eliminates need for separate profile creation API endpoint
- Ensures every authenticated user has a profile immediately after signup

---

## Outstanding Considerations

### 1. Audit Log Data Format
- `old_data` and `new_data` will use `to_jsonb(row.*)` for full row serialization
- Provides complete audit trail without custom serialization logic

### 2. Status Change Permissions
- Creators can only change status via editing (which resets to 'draft')
- Clients can change to: 'accepted', 'rejected', 'needs_modification'
- Enforced via RLS policies and triggers

### 3. Comment Requirement for 'needs_modification'
- Application layer should validate this requirement
- Database does not enforce (to avoid circular dependency complexity)
- Consider adding CHECK constraint if business rule is critical

### 4. Index on audit_log(entity_type, entity_id)
- Recommended and included in schema
- Enables efficient entity history queries
- Critical for GDPR data access requests

### 5. TipTap Content Validation
- Database stores as JSONB without schema validation
- Application layer should validate document structure
- Consider adding CHECK constraint with `jsonb_typeof()` if needed

---

## Migration File Structure

Recommended migration order:

1. `001_create_enums.sql` - Create all ENUM types
2. `002_create_tables.sql` - Create all tables with constraints
3. `003_create_indexes.sql` - Create all indexes
4. `004_create_functions.sql` - Create helper functions for RLS and triggers
5. `005_create_triggers.sql` - Create all triggers
6. `006_create_rls_policies.sql` - Enable RLS and create policies
7. `007_seed_data.sql` (optional) - Initial test data

---

## Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "moddatetime";    -- Auto-update updated_at
```

---

## GDPR Compliance

### Right to Access
- Users can query their own data via RLS policies
- `audit_log` tracks all operations on user data
- Query audit_log for complete user activity history

### Right to Deletion
- Account deletion triggers cascade delete
- All user data archived to `audit_log` before deletion
- Email becomes available for re-registration
- Satisfies "right to be forgotten"

### Data Minimization
- Only essential fields stored
- No unnecessary personal data collection
- Profile limited to: id, role, timestamps

---

## Performance Considerations

### Expected Query Patterns
1. **Brief List (Paginated):** Uses `(owner_id, updated_at DESC)` index
2. **Shared Briefs:** Uses `recipient_id` index on `brief_recipients`
3. **Comment Display:** Uses `(brief_id, created_at DESC)` index
4. **Access Check:** `user_has_brief_access()` function with indexed lookups

### Optimization Strategies
- Denormalized `comment_count` eliminates subquery
- Composite indexes match ORDER BY clauses
- RLS helper functions use SECURITY DEFINER for plan caching
- JSONB for flexible content without ALTER TABLE operations

### Monitoring Recommendations
- Track query performance on brief list (most frequent)
- Monitor trigger execution time (especially comment count updates)
- Review RLS policy performance under load
- Consider materialized view for dashboard metrics (post-MVP)
