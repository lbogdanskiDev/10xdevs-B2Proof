# Frontend Refactoring Plan - B2Proof

## Executive Summary

This document outlines a comprehensive frontend refactoring plan for the B2Proof application. The analysis identified several areas of code duplication and opportunities for improved code organization while maintaining the existing clean architecture.

**Key Areas Identified:**
1. Brief Form Hooks Consolidation (~80% code similarity)
2. Brief DTO Mapping Function Extraction (repeated 3x in service)
3. API Route Error Handling Utilities
4. Recipient Access Check Helper Extraction
5. Type Definitions Consolidation

---

## 1. Brief Form Hooks Consolidation

### Problem

The `useCreateBriefForm` and `useEditBriefForm` hooks share approximately 80% identical code:
- Same field setters (`setHeader`, `setContent`, `setContentCharCount`, `setFooter`)
- Same validation logic
- Same `canSubmit` calculation
- Same error handling patterns

**Current Files:**
- [useCreateBriefForm.ts](src/components/hooks/useCreateBriefForm.ts)
- [useEditBriefForm.ts](src/components/hooks/useEditBriefForm.ts)

### Solution

Create a base hook `useBriefForm` that encapsulates shared logic, with mode-specific wrappers.

### Implementation

#### Step 1: Create shared brief form hook

Create `src/components/hooks/useBriefForm.ts`:

```typescript
"use client";

import { useState, useCallback, useMemo } from "react";
import type { JSONContent } from "@tiptap/react";
import type { BriefFormErrors, BriefFormData } from "@/lib/types/brief-form.types";
import { CREATE_BRIEF_CONSTANTS } from "@/lib/constants/create-brief.constants";

export interface BriefFormState {
  header: string;
  content: JSONContent | null;
  footer: string;
  contentCharCount: number;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: BriefFormErrors;
}

interface UseBriefFormOptions {
  initialData?: BriefFormData;
  requireDirtyForSubmit?: boolean; // true for edit, false for create
}

interface UseBriefFormReturn {
  formState: BriefFormState;
  setHeader: (value: string) => void;
  setContent: (content: JSONContent) => void;
  setContentCharCount: (count: number) => void;
  setFooter: (value: string) => void;
  setIsSubmitting: (value: boolean) => void;
  setErrors: (errors: BriefFormErrors) => void;
  resetDirty: () => void;
  validateForm: () => boolean;
  canSubmit: boolean;
  getFormData: () => BriefFormData;
}

const createInitialState = (initialData?: BriefFormData): BriefFormState => ({
  header: initialData?.header ?? "",
  content: initialData?.content ?? null,
  footer: initialData?.footer ?? "",
  contentCharCount: 0,
  isDirty: false,
  isSubmitting: false,
  errors: {},
});

export function useBriefForm(options: UseBriefFormOptions = {}): UseBriefFormReturn {
  const { initialData, requireDirtyForSubmit = false } = options;
  const [formState, setFormState] = useState<BriefFormState>(() => createInitialState(initialData));

  // ... shared setters and validation (extracted from current hooks)
  // This consolidates ~150 lines of duplicated code
}
```

#### Step 2: Refactor useCreateBriefForm

```typescript
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBriefForm } from "./useBriefForm";
import { handleBriefApiError } from "@/lib/utils/api-error-handler";

export function useCreateBriefForm() {
  const router = useRouter();
  const form = useBriefForm({ requireDirtyForSubmit: false });

  const handleSubmit = useCallback(async () => {
    // Create-specific submit logic (POST /api/briefs)
  }, [form, router]);

  const handleCancel = useCallback(() => {
    router.push("/briefs");
  }, [router]);

  return {
    ...form,
    handleSubmit,
    handleCancel,
  };
}
```

#### Step 3: Refactor useEditBriefForm

```typescript
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBriefForm } from "./useBriefForm";
import type { EditBriefInitialData } from "@/lib/types/brief-form.types";

export function useEditBriefForm({ initialData }: { initialData: EditBriefInitialData }) {
  const router = useRouter();
  const form = useBriefForm({
    initialData: {
      header: initialData.header,
      content: initialData.content,
      footer: initialData.footer ?? "",
    },
    requireDirtyForSubmit: true,
  });

  const handleSubmit = useCallback(async () => {
    // Edit-specific submit logic (PATCH /api/briefs/:id)
  }, [form, router, initialData]);

  const handleCancel = useCallback(() => {
    router.push(`/briefs/${initialData.id}`);
  }, [router, initialData.id]);

  return {
    ...form,
    handleSubmit,
    handleCancel,
  };
}
```

### Benefits
- Eliminates ~150 lines of duplicated code
- Single source of truth for form validation logic
- Easier maintenance and bug fixes
- Consistent behavior across create/edit flows

---

## 2. Brief DTO Mapping Function Extraction

### Problem

The brief entity to DTO transformation is repeated 3 times in [brief.service.ts](src/lib/services/brief.service.ts):
- Lines 98-108 (`fetchOwnedBriefs`)
- Lines 176-186 (`fetchSharedBriefs`)
- Lines 254-264 (`fetchAllBriefs`)

### Solution

Extract a reusable mapping function.

### Implementation

Add to `src/lib/services/brief.service.ts` (helper section):

```typescript
// ============================================================================
// DTO Mapping Helpers
// ============================================================================

/**
 * Maps a brief database row to BriefListItemDto
 * Handles snake_case to camelCase conversion
 *
 * @param brief - Database row from briefs table
 * @param userId - Current user's ID (for isOwned calculation)
 * @returns BriefListItemDto
 */
function mapBriefToListItemDto(
  brief: BriefEntity,
  userId: string
): BriefListItemDto {
  return {
    id: brief.id,
    ownerId: brief.owner_id,
    header: brief.header,
    footer: brief.footer,
    status: brief.status,
    commentCount: brief.comment_count,
    isOwned: brief.owner_id === userId,
    createdAt: brief.created_at,
    updatedAt: brief.updated_at,
  };
}

/**
 * Maps a brief database row to BriefDetailDto
 * Includes full content for detail view
 *
 * @param brief - Database row from briefs table
 * @param userId - Current user's ID (for isOwned calculation)
 * @returns BriefDetailDto
 */
function mapBriefToDetailDto(
  brief: BriefEntity,
  userId: string
): BriefDetailDto {
  return {
    ...mapBriefToListItemDto(brief, userId),
    content: brief.content,
    statusChangedAt: brief.status_changed_at,
    statusChangedBy: brief.status_changed_by,
  };
}
```

### Usage Example

Replace repeated mapping code:

```typescript
// Before (repeated 3x)
const briefs: BriefListItemDto[] = data.map((brief) => ({
  id: brief.id,
  ownerId: brief.owner_id,
  // ... 8 more fields
}));

// After
const briefs = data.map((brief) => mapBriefToListItemDto(brief, userId));
```

### Benefits
- Single source of truth for DTO mapping
- Easier to update when schema changes
- Reduces risk of inconsistencies between views
- ~30 lines of code eliminated

---

## 3. API Route Error Handling Utilities

### Problem

API route handlers repeat the same error handling patterns:
1. Zod validation error extraction (lines 41-48, 79-86 in routes)
2. Authentication check pattern
3. ApiError handling pattern

### Solution

Create utility functions for common API route patterns.

### Implementation

Create `src/lib/utils/api-route-helpers.ts`:

```typescript
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ErrorReturn, ValidationErrorDetail } from "@/types";
import { ApiError } from "@/lib/errors/api-errors";
import { createSupabaseServerClient } from "@/db/supabase.server";

/**
 * Extracts validation error details from Zod error
 * @param error - Zod validation error
 * @returns Array of field-level error details
 */
export function extractZodErrors(error: ZodError): ValidationErrorDetail[] {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}

/**
 * Creates a validation error response
 * @param error - Zod validation error
 * @param message - Top-level error message
 * @returns NextResponse with 400 status
 */
export function validationErrorResponse(
  error: ZodError,
  message = "Validation failed"
): NextResponse<ErrorReturn> {
  const details = extractZodErrors(error);
  return NextResponse.json<ErrorReturn>({ error: message, details }, { status: 400 });
}

/**
 * Creates an error response from ApiError
 * @param error - ApiError instance
 * @returns NextResponse with appropriate status
 */
export function apiErrorResponse(error: ApiError): NextResponse<ErrorReturn> {
  return NextResponse.json<ErrorReturn>(
    { error: error.message },
    { status: error.statusCode }
  );
}

/**
 * Standard unauthorized response
 */
export function unauthorizedResponse(): NextResponse<ErrorReturn> {
  return NextResponse.json<ErrorReturn>({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Standard internal server error response
 */
export function serverErrorResponse(): NextResponse<ErrorReturn> {
  return NextResponse.json<ErrorReturn>({ error: "Internal server error" }, { status: 500 });
}

/**
 * Gets authenticated user or returns error response
 * @returns Object with user data or error response
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase, response: unauthorizedResponse() };
  }

  return { user, supabase, response: null };
}
```

### Usage Example

```typescript
// Before
if (!validationResult.success) {
  const details = validationResult.error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
  return NextResponse.json<ErrorReturn>({ error: "Validation failed", details }, { status: 400 });
}

// After
if (!validationResult.success) {
  return validationErrorResponse(validationResult.error);
}
```

### Benefits
- Consistent error response format across all routes
- Reduces boilerplate in route handlers
- Easier to update error format globally
- ~50+ lines of duplicated code eliminated across routes

---

## 4. Recipient Access Check Helper Extraction

### Problem

The recipient access check pattern is repeated multiple times in [brief.service.ts](src/lib/services/brief.service.ts):
- Lines 305-311 (`getBriefById`)
- Lines 1036-1042 (`checkBriefAccess`)
- Lines 132-135 (`fetchSharedBriefs`)
- Lines 210-213 (`fetchAllBriefs`)

### Solution

Extract a dedicated helper function for recipient checking.

### Implementation

Add to helper section in `brief.service.ts`:

```typescript
/**
 * Checks if a user is a recipient of a brief
 * Matches by either recipient_id (UUID) or recipient_email
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief
 * @param userId - User's UUID from auth
 * @param userEmail - User's email from auth
 * @returns True if user is a recipient, false otherwise
 */
async function isUserRecipient(
  supabase: SupabaseClient,
  briefId: string,
  userId: string,
  userEmail: string
): Promise<boolean> {
  const { data: recipient } = await supabase
    .from("brief_recipients")
    .select("id")
    .eq("brief_id", briefId)
    .or(`recipient_id.eq.${userId},recipient_email.eq.${userEmail}`)
    .limit(1)
    .maybeSingle();

  return recipient !== null;
}

/**
 * Gets brief IDs shared with a user
 * Used for building filtered queries
 *
 * @param supabase - Supabase client instance
 * @param userId - User's UUID from auth
 * @param userEmail - User's email from auth
 * @returns Array of brief IDs
 */
async function getSharedBriefIds(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("brief_recipients")
    .select("brief_id")
    .or(`recipient_id.eq.${userId},recipient_email.eq.${userEmail}`);

  if (error) {
    console.error("[brief.service] Error fetching shared brief IDs:", error);
    return [];
  }

  return data?.map((r) => r.brief_id) ?? [];
}
```

### Benefits
- Single source of truth for recipient matching logic
- Easier to update matching criteria (e.g., add new fields)
- Reduces cognitive load when reading service code
- ~20 lines of duplicated code eliminated

---

## 5. Type Definitions Consolidation

### Problem

Similar type definitions exist in multiple files:
- `FieldErrors` in [create-brief.types.ts](src/lib/types/create-brief.types.ts)
- `BriefFormErrors` in [brief-form.types.ts](src/lib/types/brief-form.types.ts)
- `CreateBriefResult` vs `BriefSaveResult` (same structure)

### Solution

Consolidate overlapping types into a single file.

### Implementation

#### Step 1: Merge types into brief-form.types.ts

Update `src/lib/types/brief-form.types.ts`:

```typescript
import type { JSONContent } from "@tiptap/react";
import type { BriefDetailDto, BriefStatus } from "@/types";

// ============================================================================
// Form Errors (unified)
// ============================================================================

/**
 * Field-level validation errors for brief forms
 * Used by both create and edit forms
 */
export interface BriefFormErrors {
  header?: string;
  content?: string;
  footer?: string;
  general?: string;
}

/** @deprecated Use BriefFormErrors instead */
export type FieldErrors = BriefFormErrors;

// ============================================================================
// Form Data
// ============================================================================

export interface BriefFormData {
  header: string;
  content: JSONContent | null;
  footer: string;
}

// ============================================================================
// Form Results (unified)
// ============================================================================

/**
 * Result of brief form submission (create or update)
 */
export interface BriefFormResult {
  success: boolean;
  data?: BriefDetailDto;
  error?: string;
  fieldErrors?: BriefFormErrors;
}

/** @deprecated Use BriefFormResult instead */
export type CreateBriefResult = BriefFormResult;
/** @deprecated Use BriefFormResult instead */
export type BriefSaveResult = BriefFormResult;

// ... rest of types
```

#### Step 2: Remove create-brief.types.ts

Re-export necessary types from brief-form.types.ts and deprecate create-brief.types.ts.

### Benefits
- Single source of truth for form-related types
- Reduces confusion about which type to use
- Easier onboarding for new developers
- Smaller bundle size (fewer type definitions)

---

## 6. Pagination Helper Consolidation

### Problem

Pagination calculation (`Math.ceil(count / limit)`) is repeated in multiple places.
A `generatePageNumbers` utility exists but total pages calculation is not centralized.

### Solution

Extend pagination utilities.

### Implementation

Update `src/lib/utils/pagination.ts`:

```typescript
import type { PaginationMetadata } from "@/types";

/**
 * Calculate pagination metadata from count and limit
 *
 * @param total - Total number of items
 * @param page - Current page (1-indexed)
 * @param limit - Items per page
 * @returns PaginationMetadata object
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number
): PaginationMetadata {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Calculate offset for database query
 *
 * @param page - Current page (1-indexed)
 * @param limit - Items per page
 * @returns Offset value for query
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

// ... existing generatePageNumbers function
```

### Benefits
- Consistent pagination calculation
- Reduces risk of off-by-one errors
- Single source of truth for pagination logic

---

## 7. Empty Paginated Response Helper

### Problem

Empty paginated response is constructed repeatedly in service:
```typescript
return {
  data: [],
  pagination: { page, limit, total: 0, totalPages: 0 },
};
```

This appears at least 4 times in brief.service.ts.

### Solution

Create a helper function.

### Implementation

Add to pagination.ts or brief.service.ts:

```typescript
/**
 * Creates an empty paginated response
 *
 * @param page - Current page
 * @param limit - Items per page
 * @returns Empty PaginatedResponse
 */
export function emptyPaginatedResponse<T>(
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data: [],
    pagination: { page, limit, total: 0, totalPages: 0 },
  };
}
```

### Benefits
- Consistent empty response structure
- Reduces boilerplate
- Easier to add default values in the future

---

## Implementation Priority

| Priority | Task | Impact | Effort | Files Affected |
|----------|------|--------|--------|----------------|
| **P1** | Brief Form Hooks Consolidation | High | Medium | 2 hooks + 1 new file |
| **P1** | API Route Error Handling Utilities | High | Low | 8 route files + 1 new utility |
| **P2** | Brief DTO Mapping Extraction | Medium | Low | 1 service file |
| **P2** | Recipient Access Check Helper | Medium | Low | 1 service file |
| **P3** | Type Definitions Consolidation | Low | Low | 2 type files |
| **P3** | Pagination Helper Extension | Low | Low | 1 utility file |
| **P3** | Empty Paginated Response Helper | Low | Low | 1 utility file |

---

## Estimated Code Reduction

| Refactoring | Lines Removed | Lines Added | Net Reduction |
|-------------|---------------|-------------|---------------|
| Form Hooks Consolidation | ~200 | ~80 | ~120 |
| API Error Utilities | ~80 | ~50 | ~30 |
| DTO Mapping Helpers | ~40 | ~25 | ~15 |
| Recipient Check Helper | ~30 | ~20 | ~10 |
| Type Consolidation | ~50 | ~10 | ~40 |
| Pagination Helpers | ~15 | ~20 | -5 |
| **Total** | **~415** | **~205** | **~210** |

---

## Testing Considerations

1. **Form Hooks Refactoring:**
   - Verify create brief flow works unchanged
   - Verify edit brief flow works unchanged
   - Test validation error display
   - Test unsaved changes warning

2. **API Error Utilities:**
   - Verify error response format unchanged
   - Test all HTTP status codes (400, 401, 403, 404, 500)

3. **Service Helpers:**
   - Unit test new helper functions
   - Integration test existing API endpoints

---

## Migration Strategy

1. **Phase 1: Non-breaking additions**
   - Add new utility functions without removing old code
   - Add type aliases with deprecation notices

2. **Phase 2: Gradual replacement**
   - Replace duplicated code with utility calls
   - Update one file at a time with tests

3. **Phase 3: Cleanup**
   - Remove deprecated aliases
   - Remove old type definitions
   - Update documentation

---

## 8. File Naming Convention Fixes

### Problem

The codebase has inconsistent file naming conventions in two directories:

#### 8.1 Hooks Directory - Mixed Naming Convention

**Current State:** 8 hooks use camelCase, 2 hooks use kebab-case

| File (Incorrect) | Should Be |
|------------------|-----------|
| `use-auth.tsx` | `useAuth.ts` |
| `use-brief-count.tsx` | `useBriefCount.ts` |

**Additional Issue:** These files use `.tsx` extension but hooks typically don't contain JSX - should be `.ts`.

**Files with Correct Convention (for reference):**
- `useBriefComments.ts`
- `useBriefRecipients.ts`
- `useBriefStatusChange.ts`
- `useChangePassword.ts`
- `useCreateBriefForm.ts`
- `useDeleteAccount.ts`
- `useEditBriefForm.ts`
- `useUnsavedChangesWarning.ts`

#### 8.2 Constants Directory - Missing Suffix

**Current State:** 3 files have `.constants.ts` suffix, 2 files don't

| File (Incorrect) | Should Be |
|------------------|-----------|
| `brief-status.ts` | `brief-status.constants.ts` |
| `navigation.ts` | `navigation.constants.ts` |

**Files with Correct Convention (for reference):**
- `auth.constants.ts`
- `brief.constants.ts`
- `create-brief.constants.ts`

### Solution

Rename files and update all imports.

### Implementation

#### Step 1: Rename hook files

```bash
# In src/components/hooks/
git mv use-auth.tsx useAuth.ts
git mv use-brief-count.tsx useBriefCount.ts
```

#### Step 2: Update imports for hooks

Files that import `use-auth.tsx`:
- `src/components/layout/DashboardLayoutClient.tsx`
- `src/components/layout/UserMenu.tsx`
- `src/components/profile/ProfilePageClient.tsx`
- `src/app/(dashboard)/layout.tsx`
- Other components using `useAuth()`

```typescript
// Before
import { useAuth } from "@/components/hooks/use-auth";

// After
import { useAuth } from "@/components/hooks/useAuth";
```

Files that import `use-brief-count.tsx`:
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/components/briefs/list/BriefListHeader.tsx`

```typescript
// Before
import { useBriefCount } from "@/components/hooks/use-brief-count";

// After
import { useBriefCount } from "@/components/hooks/useBriefCount";
```

#### Step 3: Rename constants files

```bash
# In src/lib/constants/
git mv brief-status.ts brief-status.constants.ts
git mv navigation.ts navigation.constants.ts
```

#### Step 4: Update imports for constants

Files that import `brief-status.ts`:
- Components using `BRIEF_STATUS_CONFIG`

```typescript
// Before
import { BRIEF_STATUS_CONFIG } from "@/lib/constants/brief-status";

// After
import { BRIEF_STATUS_CONFIG } from "@/lib/constants/brief-status.constants";
```

Files that import `navigation.ts`:
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileNav.tsx`

```typescript
// Before
import { NAVIGATION_ITEMS } from "@/lib/constants/navigation";

// After
import { NAVIGATION_ITEMS } from "@/lib/constants/navigation.constants";
```

### Benefits
- Consistent naming convention across entire codebase
- Easier to find files by pattern
- Clear distinction between file types
- Better IDE autocomplete experience

### Priority

| Priority | Task | Files Affected |
|----------|------|----------------|
| **P0** | Rename `use-auth.tsx` → `useAuth.ts` | ~5-10 imports |
| **P0** | Rename `use-brief-count.tsx` → `useBriefCount.ts` | ~3-5 imports |
| **P0** | Rename `brief-status.ts` → `brief-status.constants.ts` | ~2-3 imports |
| **P0** | Rename `navigation.ts` → `navigation.constants.ts` | ~2-3 imports |

---

## Updated Implementation Priority

| Priority | Task | Impact | Effort | Files Affected |
|----------|------|--------|--------|----------------|
| **P0** | File Naming Convention Fixes | High | Low | 4 files + ~15 imports |
| **P1** | Brief Form Hooks Consolidation | High | Medium | 2 hooks + 1 new file |
| **P1** | API Route Error Handling Utilities | High | Low | 8 route files + 1 new utility |
| **P2** | Brief DTO Mapping Extraction | Medium | Low | 1 service file |
| **P2** | Recipient Access Check Helper | Medium | Low | 1 service file |
| **P3** | Type Definitions Consolidation | Low | Low | 2 type files |
| **P3** | Pagination Helper Extension | Low | Low | 1 utility file |
| **P3** | Empty Paginated Response Helper | Low | Low | 1 utility file |

---

## Notes

- All refactoring preserves existing behavior
- No changes to public API or component props
- TypeScript will catch any breaking changes
- Run `npm run type-check` after each change
- Run full test suite before merging

---

## Implementation Status

### Completed Tasks

| Task | Status | Date | Notes |
|------|--------|------|-------|
| **P1: Brief Form Hooks Consolidation** | ✅ Done | 2025-12-23 | Created `useBriefForm.ts` base hook, refactored `useCreateBriefForm.ts` and `useEditBriefForm.ts` |
| **P1: API Route Error Handling Utilities** | ✅ Done | 2025-12-23 | Added `validateRequestBody` helper, refactored 4 API routes to use consolidated utilities |
| **P0: File Naming Convention Fixes** | ✅ Done | 2025-12-23 | Renamed 4 files to follow conventions, updated 10 imports |
| **P2: Brief DTO Mapping Extraction** | ✅ Done | 2025-12-24 | Created `mappers.ts` with 5 mapping functions, eliminated ~40 lines of duplicated code |
| **P2: Recipient Access Check Helper** | ✅ Done | 2025-12-24 | Created `authorization.utils.ts` with 6 authorization functions, eliminated ~30 lines of duplicated access checks |
| **P3: Type Definitions Consolidation** | ✅ Done | 2025-12-24 | Unified form types in `brief-form.types.ts`, added deprecated aliases in `create-brief.types.ts` |
| **P3: Pagination Helpers (Extension + Empty Response)** | ✅ Done | 2025-12-24 | Extended `query.utils.ts` with `emptyPaginatedResponse`, refactored `comments.service.ts` to use helpers, removed duplicate functions from `pagination.ts` |

### Pending Tasks

| Priority | Task | Status |
|----------|------|--------|
| **ALL** | All refactoring tasks completed | ✅ Done (2025-12-24) |

### Summary

**Total code reduction across all completed tasks:**
- **Lines removed**: ~365 (form hooks + API routes + DTO mappers + authorization + types + pagination)
- **Lines added**: ~405 (base hook + utilities + mappers + authorization helpers + organized types + pagination helpers)
- **Net impact**: +40 lines but with significantly better organization and maintainability

**Key achievements:**
- Single source of truth for form logic, API error handling, DTO mapping, authorization, type definitions, and pagination
- Eliminated code duplication across 16+ files
- Improved code organization with clear separation of concerns
- Zero breaking changes - full backward compatibility maintained (except Type Definitions Consolidation - acceptable for MVP)
- Easier maintenance and future refactoring
- Consistent naming conventions across the codebase
- Better separation between backend utilities (`query.utils.ts`) and frontend utilities (`pagination.ts`)

**Files impacted by refactoring:**
1. **Created**: `useBriefForm.ts`, `mappers.ts`, `authorization.utils.ts`
2. **Extended**: `api-handler.utils.ts`, `query.utils.ts`
3. **Modified**: `useCreateBriefForm.ts`, `useEditBriefForm.ts`, `brief.service.ts`, `comments.service.ts`, `brief-form.types.ts`, `create-brief.types.ts`, `pagination.ts`
4. **Renamed**: `use-auth.tsx` → `useAuth.tsx`, `use-brief-count.tsx` → `useBriefCount.ts`, `brief-status.ts` → `brief-status.constants.ts`, `navigation.ts` → `navigation.constants.ts`
5. **Updated imports**: 10+ component files

### Etap 2 Details

**Files modified:**
- `src/lib/utils/api-handler.utils.ts` - Added `validateRequestBody` helper
- `src/app/api/briefs/[id]/route.ts` - Simplified validation, removed duplicate `logValidationError` calls
- `src/app/api/briefs/[id]/status/route.ts` - Refactored to use `validateRequestBody`
- `src/app/api/briefs/[id]/recipients/route.ts` - Refactored to use `validateRequestBody`
- `src/app/api/briefs/[id]/comments/route.ts` - Refactored to use `validateRequestBody`

**Note:** Routes with complex Zod transforms (content field with TipTap validation) still use `safeParse` directly due to TypeScript type inference limitations.

### Etap 3 Details (P0: File Naming Convention Fixes)

**Files renamed:**
- `src/components/hooks/use-auth.tsx` → `useAuth.tsx` (camelCase convention)
- `src/components/hooks/use-brief-count.tsx` → `useBriefCount.ts` (camelCase + no JSX)
- `src/lib/constants/brief-status.ts` → `brief-status.constants.ts` (added `.constants` suffix)
- `src/lib/constants/navigation.ts` → `navigation.constants.ts` (added `.constants` suffix)

**Files with updated imports (10 total):**
- `src/components/layout/DashboardLayoutClient.tsx`
- `src/components/briefs/shared/BriefStatusBadge.tsx`
- `src/components/briefs/list/BriefListHeader.tsx`
- `src/components/briefs/list/BriefLimitAlert.tsx`
- `src/components/briefs/list/BriefFilters.tsx`
- `src/components/briefs/form/StatusResetAlertDialog.tsx`
- `src/app/(dashboard)/briefs/page.tsx`
- `src/components/hooks/useBriefCount.ts`
- `src/components/layout/BriefCountBadge.tsx`

### Etap 4 Details (P2: Brief DTO Mapping Extraction)

**Files created:**
- `src/lib/utils/mappers.ts` - Centralized DTO mapping functions

**Functions added:**
- `mapBriefToListItem()` - Maps BriefEntity to BriefListItemDto
- `mapBriefToDetail()` - Maps BriefEntity to BriefDetailDto (includes content)
- `mapPartialBriefToDetail()` - Maps partial brief record to BriefDetailDto
- `mapCommentToDto()` - Maps CommentRecord to CommentDto
- `mapRecipientToDto()` - Maps BriefRecipientEntity to BriefRecipientDto

**Files modified:**
- `src/lib/services/brief.service.ts` - Replaced inline mapping with mapper functions

**Code reduction:**
- ~40 lines of duplicated mapping logic eliminated
- Single source of truth for DTO transformations
- Consistent snake_case to camelCase conversion

### Etap 5 Details (P2: Recipient Access Check Helper)

**Files created:**
- `src/lib/utils/authorization.utils.ts` - Centralized authorization helpers

**Functions added:**
- `checkBriefAccess()` - Checks if user has access to brief (owner OR recipient)
- `requireBriefOwner()` - Requires user to be brief owner (throws if not)
- `requireBriefAccess()` - Requires user to have access (throws if not)
- `requireRecipientAccess()` - Requires user to be recipient (NOT owner)
- `isRecipient()` - Checks if user is a recipient
- `requireCommentAuthor()` - Requires user to be comment author

**Files modified:**
- `src/lib/services/brief.service.ts` - Uses authorization helpers instead of inline checks

**Additional improvements:**
- `getBriefIdsForUser()` helper in `brief.service.ts` handles shared brief IDs retrieval
- Better separation of concerns - authorization logic separated from business logic

**Code reduction:**
- ~30 lines of duplicated access check logic eliminated
- Consistent error handling across all authorization checks
- Single source of truth for recipient matching (by ID or email)

### Etap 6 Details (P3: Type Definitions Consolidation)

**Files modified:**
- `src/lib/types/brief-form.types.ts` - Consolidated and organized all form-related types
- `src/lib/types/create-brief.types.ts` - Removed duplicate types and re-exports (breaking change acceptable for MVP)
- `src/components/hooks/useCreateBriefForm.ts` - Updated to use `BriefFormResult` instead of local `CreateBriefResult`
- `src/components/hooks/useEditBriefForm.ts` - Updated to use `BriefFormResult` instead of `BriefSaveResult`

**Type consolidation:**
- `BriefFormErrors` ← unified type (replaced `FieldErrors`, `CreateBriefResult.fieldErrors`, `BriefSaveResult.fieldErrors`)
- `BriefFormResult` ← unified type (replaced `CreateBriefResult` and `BriefSaveResult`)
- **No deprecated aliases** - clean breaking change acceptable for MVP reset before launch

**Organization improvements:**
- Added clear section headers in `brief-form.types.ts`:
  - Form Data
  - Form Errors (unified)
  - Form State
  - Initial Data
  - Form Results (unified)
  - Component Props
  - Helper Functions
- `create-brief.types.ts` now only contains UI-specific component props
- Clean separation between shared types and component-specific props

**Code reduction:**
- ~60 lines eliminated (50 duplicate types + 10 deprecated aliases)
- Single source of truth for form-related types
- Better type organization and discoverability
- Cleaner codebase without legacy compatibility layer

### Etap 7 Details (P3: Pagination Helpers)

**Design Decision:**
- Decided to consolidate pagination helpers in `query.utils.ts` instead of `pagination.ts`
- Rationale: `query.utils.ts` already contained pagination calculation functions and is better suited for database query-related utilities
- `pagination.ts` now only contains UI-specific helper (`generatePageNumbers`)

**Files modified:**
- `src/lib/utils/query.utils.ts` - Added `emptyPaginatedResponse<T>()` function
- `src/lib/utils/pagination.ts` - Removed duplicate pagination calculation functions, kept only UI helper
- `src/lib/services/comments.service.ts` - Refactored to use helpers from `query.utils.ts`

**Functions consolidated in `query.utils.ts`:**
- `calculateOffset(page, limit)` - Calculate database query offset (already existed)
- `calculatePagination(page, limit, total)` - Calculate full pagination metadata (already existed)
- `emptyPagination(page, limit)` - Create empty pagination metadata (already existed)
- `emptyPaginatedResponse<T>(page, limit)` - Create empty paginated response with data array (newly added)

**Refactoring in `comments.service.ts`:**
- Replaced `(page - 1) * limit` with `calculateOffset(page, limit)` (line 125)
- Replaced manual `Math.ceil(total / limit)` calculation with `calculatePagination(page, limit, total)` (line 160)

**Code reduction:**
- ~15 lines of duplicated pagination logic eliminated
- Single source of truth for pagination calculations in `query.utils.ts`
- Consistent pagination handling across all services
- Better separation: `query.utils.ts` for backend/database, `pagination.ts` for UI/frontend
