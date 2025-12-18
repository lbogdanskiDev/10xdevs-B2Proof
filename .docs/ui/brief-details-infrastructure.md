# Brief Details - Part 1: Infrastructure & Types

## Przegląd

Ten dokument opisuje infrastrukturę i typy potrzebne do implementacji widoku szczegółów briefu (`/briefs/[id]`).

## Struktura katalogów

Utwórz następującą strukturę katalogów:

```
src/app/(dashboard)/briefs/[id]/
├── page.tsx
├── not-found.tsx
└── error.tsx

src/components/briefs/
├── BriefHeader.tsx
├── BriefStatusBadge.tsx
├── BriefContentRenderer.tsx
├── BriefActionButtons.tsx
├── OwnerActions.tsx
├── RecipientActions.tsx
├── DeleteBriefDialog.tsx
├── ShareBriefDialog.tsx
├── NeedsModificationDialog.tsx
├── RecipientTable.tsx
├── RecipientAddForm.tsx
├── RecipientLimitIndicator.tsx
├── BriefRecipientsSection.tsx
├── CommentList.tsx
├── CommentItem.tsx
├── CommentForm.tsx
├── CharacterCounter.tsx
└── BriefCommentsSection.tsx

src/components/hooks/
├── useBriefComments.ts
├── useBriefRecipients.ts
└── useBriefStatusChange.ts

src/lib/types/
└── brief-details.types.ts
```

## Typy istniejące (z `src/types.ts`)

Poniższe typy powinny już istnieć lub należy je dodać do `src/types.ts`:

```typescript
// Brief Types
interface BriefDetailDto {
  id: string;
  ownerId: string;
  header: string;
  content: BriefEntity['content']; // TipTap JSON
  footer: string | null;
  status: BriefStatus;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  commentCount: number;
  isOwned: boolean;
  createdAt: string;
  updatedAt: string;
}

type BriefStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'needs_modification';

interface UpdateBriefStatusCommand {
  status: BriefStatus;
  comment?: string;
}

// Recipient Types
interface BriefRecipientDto {
  id: string;
  recipientId: string;
  recipientEmail: string;
  sharedBy: string;
  sharedAt: string;
}

interface ShareBriefCommand {
  email: string;
}

// Comment Types
interface CommentDto {
  id: string;
  briefId: string;
  authorId: string;
  authorEmail: string;
  authorRole: UserRole;
  content: string;
  isOwn: boolean;
  createdAt: string;
}

interface CreateCommentCommand {
  content: string;
}

// Pagination Types
interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Error Types
interface ErrorResponse {
  error: string;
  details?: ValidationErrorDetail[];
}
```

## Nowe typy ViewModel

Utwórz plik `src/lib/types/brief-details.types.ts`:

```typescript
import type { CommentDto, BriefRecipientDto, PaginationMetadata, BriefStatus } from '@/types';

/**
 * ViewModel dla sekcji komentarzy z zarządzaniem stanem
 */
export interface CommentsViewModel {
  comments: CommentDto[];
  pagination: PaginationMetadata;
  isLoading: boolean;
  error: string | null;
}

/**
 * ViewModel dla sekcji odbiorców z zarządzaniem stanem
 */
export interface RecipientsViewModel {
  recipients: BriefRecipientDto[];
  isLoading: boolean;
  error: string | null;
  canAddMore: boolean; // current count < 10
}

/**
 * Propsy dla akcji statusu briefu
 */
export interface BriefStatusActionResult {
  success: boolean;
  error?: string;
  newStatus?: BriefStatus;
}

/**
 * Konfiguracja polling dla komentarzy
 */
export interface CommentPollingConfig {
  enabled: boolean;
  intervalMs: number; // default: 30000 (30s)
}
```

## Custom Hooks

### `useBriefComments`

**Lokalizacja:** `src/components/hooks/useBriefComments.ts`

**Cel:** Zarządzanie stanem komentarzy z automatycznym odświeżaniem i paginacją.

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { CommentDto, PaginatedResponse, PaginationMetadata } from '@/types';

interface UseBriefCommentsProps {
  briefId: string;
  initialData: PaginatedResponse<CommentDto>;
  pollingInterval?: number; // default: 30000ms
}

interface UseBriefCommentsReturn {
  comments: CommentDto[];
  pagination: PaginationMetadata;
  isLoading: boolean;
  error: string | null;
  currentPage: number;

  // Actions
  refresh: () => Promise<void>;
  changePage: (page: number) => Promise<void>;
  addComment: (content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

export function useBriefComments({
  briefId,
  initialData,
  pollingInterval = 30000
}: UseBriefCommentsProps): UseBriefCommentsReturn {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchComments = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/briefs/${briefId}/comments?page=${page}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [briefId]);

  const refresh = useCallback(async () => {
    await fetchComments(currentPage);
  }, [fetchComments, currentPage]);

  const changePage = useCallback(async (page: number) => {
    setCurrentPage(page);
    await fetchComments(page);
  }, [fetchComments]);

  const addComment = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/briefs/${briefId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add comment');
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [briefId, refresh]);

  const deleteComment = useCallback(async (commentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      refresh().catch(console.error); // Silent fail for polling
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [refresh, pollingInterval]);

  return {
    comments: data.data,
    pagination: data.pagination,
    isLoading,
    error,
    currentPage,
    refresh,
    changePage,
    addComment,
    deleteComment,
  };
}
```

### `useBriefRecipients`

**Lokalizacja:** `src/components/hooks/useBriefRecipients.ts`

**Cel:** Zarządzanie stanem odbiorców briefu.

```typescript
import { useState, useCallback } from 'react';
import type { BriefRecipientDto } from '@/types';

interface UseBriefRecipientsProps {
  briefId: string;
  initialRecipients: BriefRecipientDto[];
}

interface UseBriefRecipientsReturn {
  recipients: BriefRecipientDto[];
  isLoading: boolean;
  error: string | null;
  canAddMore: boolean;

  // Actions
  refresh: () => Promise<void>;
  addRecipient: (email: string) => Promise<void>;
  removeRecipient: (recipientId: string) => Promise<void>;
}

export function useBriefRecipients({
  briefId,
  initialRecipients
}: UseBriefRecipientsProps): UseBriefRecipientsReturn {
  const [recipients, setRecipients] = useState(initialRecipients);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = recipients.length < 10;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/briefs/${briefId}/recipients`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipients');
      }
      const result = await response.json();
      setRecipients(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [briefId]);

  const addRecipient = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/briefs/${briefId}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add recipient');
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [briefId, refresh]);

  const removeRecipient = useCallback(async (recipientId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/briefs/${briefId}/recipients/${recipientId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove recipient');
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [briefId, refresh]);

  return {
    recipients,
    isLoading,
    error,
    canAddMore,
    refresh,
    addRecipient,
    removeRecipient,
  };
}
```

### `useBriefStatusChange`

**Lokalizacja:** `src/components/hooks/useBriefStatusChange.ts`

**Cel:** Zarządzanie zmianą statusu briefu przez odbiorcę.

```typescript
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { BriefStatus } from '@/types';

interface UseBriefStatusChangeProps {
  briefId: string;
  onSuccess?: () => void;
}

interface UseBriefStatusChangeReturn {
  isChanging: boolean;
  error: string | null;

  // Actions
  acceptBrief: () => Promise<void>;
  rejectBrief: () => Promise<void>;
  requestModification: (comment: string) => Promise<void>;
}

export function useBriefStatusChange({
  briefId,
  onSuccess
}: UseBriefStatusChangeProps): UseBriefStatusChangeReturn {
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const changeStatus = useCallback(async (status: BriefStatus, comment?: string) => {
    setIsChanging(true);
    setError(null);
    try {
      const response = await fetch(`/api/briefs/${briefId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change status');
      }
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsChanging(false);
    }
  }, [briefId, onSuccess, router]);

  const acceptBrief = useCallback(async () => {
    await changeStatus('accepted');
  }, [changeStatus]);

  const rejectBrief = useCallback(async () => {
    await changeStatus('rejected');
  }, [changeStatus]);

  const requestModification = useCallback(async (comment: string) => {
    await changeStatus('needs_modification', comment);
  }, [changeStatus]);

  return {
    isChanging,
    error,
    acceptBrief,
    rejectBrief,
    requestModification,
  };
}
```

## Zależności do instalacji

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-typography
npm install date-fns
```

## Stałe

Utwórz plik `src/lib/constants/brief.constants.ts`:

```typescript
export const BRIEF_CONSTANTS = {
  MAX_RECIPIENTS: 10,
  MAX_COMMENT_LENGTH: 1000,
  COMMENT_POLLING_INTERVAL: 30000, // 30 seconds
  DEFAULT_COMMENTS_PER_PAGE: 50,
} as const;
```

## Checklist implementacji

- [ ] Utworzyć strukturę katalogów
- [ ] Dodać typy do `src/types.ts` (jeśli brakuje)
- [ ] Utworzyć `src/lib/types/brief-details.types.ts`
- [ ] Utworzyć `src/lib/constants/brief.constants.ts`
- [ ] Zaimplementować `useBriefComments` hook
- [ ] Zaimplementować `useBriefRecipients` hook
- [ ] Zaimplementować `useBriefStatusChange` hook
- [ ] Zainstalować zależności (TipTap, date-fns)

## Następne kroki

Po zakończeniu tej części, przejdź do:
- [Part 2: Brief Header & Status](./brief-details-header.md)
