# Brief Details - Part 5: Comments Section

## Przegląd

Ten dokument opisuje implementację sekcji komentarzy z automatycznym odświeżaniem (polling co 30s), paginacją server-side oraz formularzem dodawania nowych komentarzy.

## Komponenty do implementacji

```
BriefCommentsSection (Client Component)
└── Card
    ├── CardHeader
    │   ├── h2
    │   └── Button (refresh)
    └── CardContent
        ├── CommentList
        │   └── CommentItem[]
        │       ├── div (author info + role badge)
        │       ├── p (content)
        │       ├── span (date)
        │       └── Button (delete - conditional)
        ├── Pagination
        └── CommentForm
            ├── Textarea (1000 char limit)
            ├── CharacterCounter
            └── Button (Submit)
```

---

## CommentItem

**Lokalizacja:** `src/components/briefs/CommentItem.tsx`

**Typ:** Client Component

**Opis:** Pojedynczy komentarz z informacjami o autorze, datą, treścią i opcjonalnym przyciskiem usunięcia.

### Propsy

```typescript
interface CommentItemProps {
  comment: CommentDto;
  onDelete: (commentId: string) => Promise<void>;
}
```

### Implementacja

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CommentDto } from '@/types';

interface CommentItemProps {
  comment: CommentDto;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentItem({ comment, onDelete }: CommentItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const roleLabel = comment.authorRole === 'creator' ? 'Creator' : 'Client';
  const roleVariant = comment.authorRole === 'creator' ? 'default' : 'secondary';

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{comment.authorEmail}</span>
          <Badge variant={roleVariant} className="text-xs">
            {roleLabel}
          </Badge>
        </div>

        {comment.isOwn && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete comment"
            className="h-8 w-8"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
        )}
      </div>

      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>

      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
      </span>
    </div>
  );
}
```

---

## CommentList

**Lokalizacja:** `src/components/briefs/CommentList.tsx`

**Typ:** Client Component

**Opis:** Lista komentarzy wyświetlana chronologicznie (newest first).

### Propsy

```typescript
interface CommentListProps {
  comments: CommentDto[];
  onDelete: (commentId: string) => Promise<void>;
}
```

### Implementacja

```typescript
'use client';

import { CommentItem } from './CommentItem';
import type { CommentDto } from '@/types';

interface CommentListProps {
  comments: CommentDto[];
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentList({ comments, onDelete }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No comments yet. Be the first to comment!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
```

---

## CommentForm

**Lokalizacja:** `src/components/briefs/CommentForm.tsx`

**Typ:** Client Component

**Opis:** Formularz dodawania nowego komentarza z licznikiem znaków.

### Propsy

```typescript
interface CommentFormProps {
  briefId: string;
  onSubmit: (content: string) => Promise<void>;
}
```

### Implementacja

```typescript
'use client';

import { useState, FormEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CharacterCounter } from './CharacterCounter';
import { Loader2, Send } from 'lucide-react';
import { BRIEF_CONSTANTS } from '@/lib/constants/brief.constants';

interface CommentFormProps {
  briefId: string;
  onSubmit: (content: string) => Promise<void>;
}

export function CommentForm({ briefId, onSubmit }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedContent = content.trim();
  const isValid =
    trimmedContent.length > 0 &&
    trimmedContent.length <= BRIEF_CONSTANTS.MAX_COMMENT_LENGTH;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedContent);
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        disabled={isSubmitting}
        className="resize-none"
      />

      <div className="flex items-center justify-between">
        <CharacterCounter
          current={trimmedContent.length}
          max={BRIEF_CONSTANTS.MAX_COMMENT_LENGTH}
        />

        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Add Comment
        </Button>
      </div>
    </form>
  );
}
```

---

## BriefCommentsSection

**Lokalizacja:** `src/components/briefs/BriefCommentsSection.tsx`

**Typ:** Client Component

**Opis:** Sekcja wyświetlająca listę komentarzy z paginacją i formularzem dodawania nowych komentarzy. Wspiera automatyczne odświeżanie co 30s oraz manualne odświeżanie.

### Propsy

```typescript
interface BriefCommentsSectionProps {
  briefId: string;
  initialComments: PaginatedResponse<CommentDto>;
}
```

### Implementacja

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { CommentList } from './CommentList';
import { CommentForm } from './CommentForm';
import { useBriefComments } from '@/components/hooks/useBriefComments';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Loader2 } from 'lucide-react';
import type { CommentDto, PaginatedResponse } from '@/types';

interface BriefCommentsSectionProps {
  briefId: string;
  initialComments: PaginatedResponse<CommentDto>;
}

export function BriefCommentsSection({
  briefId,
  initialComments,
}: BriefCommentsSectionProps) {
  const { toast } = useToast();
  const {
    comments,
    pagination,
    isLoading,
    currentPage,
    refresh,
    changePage,
    addComment,
    deleteComment,
  } = useBriefComments({
    briefId,
    initialData: initialComments,
  });

  const handleAddComment = async (content: string) => {
    try {
      await addComment(content);
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      toast({
        title: 'Comment deleted',
        description: 'Your comment has been removed.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete comment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch {
      // Silent fail for manual refresh - polling will retry
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Comments ({pagination.total})</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Refresh comments"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        <CommentList comments={comments} onDelete={handleDeleteComment} />

        {pagination.totalPages > 1 && (
          <CommentsPagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={changePage}
            isLoading={isLoading}
          />
        )}

        <div className="border-t pt-6">
          <CommentForm briefId={briefId} onSubmit={handleAddComment} />
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-component for pagination
interface CommentsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

function CommentsPagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}: CommentsPaginationProps) {
  const pages = generatePageNumbers(currentPage, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(currentPage - 1)}
            aria-disabled={currentPage <= 1 || isLoading}
            className={currentPage <= 1 || isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>

        {pages.map((page, index) => (
          <PaginationItem key={index}>
            {page === '...' ? (
              <span className="px-2">...</span>
            ) : (
              <PaginationLink
                onClick={() => onPageChange(page as number)}
                isActive={currentPage === page}
                className={isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(currentPage + 1)}
            aria-disabled={currentPage >= totalPages || isLoading}
            className={currentPage >= totalPages || isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

// Helper function to generate page numbers with ellipsis
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, '...', total];
  }

  if (current >= total - 2) {
    return [1, '...', total - 3, total - 2, total - 1, total];
  }

  return [1, '...', current - 1, current, current + 1, '...', total];
}
```

---

## API Endpoints

### GET /api/briefs/:id/comments

**Kiedy:** Initial load + polling co 30s + manual refresh + pagination

**Query params:**

- `page?: number` (default: 1)
- `limit?: number` (default: 50)

**Response (200 OK):**

```typescript
{
  data: CommentDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### POST /api/briefs/:id/comments

**Kiedy:** User submits CommentForm

**Request:**

```typescript
{
  content: string;
} // 1-1000 characters
```

**Response (201 Created):**

```typescript
CommentDto;
```

### DELETE /api/comments/:id

**Kiedy:** User deletes own comment

**Response (204 No Content):** Empty body

**Uwaga:** Usunięcie bez potwierdzenia (zgodnie z US-013)

---

## Polling mechanism

### Auto-refresh co 30s

Hook `useBriefComments` automatycznie odświeża komentarze co 30 sekund:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    refresh().catch(console.error); // Silent fail
  }, pollingInterval);

  return () => clearInterval(interval);
}, [refresh, pollingInterval]);
```

### Zachowanie podczas polling

- **Błąd podczas polling:** Silent fail (nie wyświetlaj toast)
- **Logowanie:** `console.error` dla debugging
- **Kontynuacja:** Polling kontynuuje (retry następny interval)
- **Manual refresh:** Wyświetla loading state, ale nie toast przy błędzie

---

## Walidacja

### CommentForm

| Pole    | Walidacja                                           |
| ------- | --------------------------------------------------- |
| Content | Wymagany, 1-1000 znaków (trimmed)                   |
| Button  | Disabled gdy pusty, przekroczony limit, lub loading |

### API Validation

| Błąd          | Komunikat                                       |
| ------------- | ----------------------------------------------- |
| Empty content | "Comment must be between 1 and 1000 characters" |
| Too long      | "Comment must be between 1 and 1000 characters" |
| No access     | "You do not have access to this brief"          |

---

## Warunki renderowania

| Element       | Warunek                                   |
| ------------- | ----------------------------------------- |
| `CommentList` | Zawsze (pusta lista pokazuje empty state) |
| `Pagination`  | `pagination.totalPages > 1`               |
| `CommentForm` | Zawsze                                    |
| Delete button | `comment.isOwn === true`                  |

---

## Interakcje użytkownika

1. **Dodanie komentarza**
   - Wpisanie tekstu w textarea
   - Kliknięcie "Add Comment"
   - Wywołanie `POST /api/briefs/:id/comments`
   - Sukces → Toast + czyszczenie textarea + refresh listy

2. **Usunięcie własnego komentarza**
   - Kliknięcie ikony Trash (bez potwierdzenia)
   - Wywołanie `DELETE /api/comments/:id`
   - Sukces → Toast + refresh listy

3. **Odświeżenie listy (manual)**
   - Kliknięcie ikony RefreshCw
   - Loading state na przycisku
   - Fetch najnowszych komentarzy

4. **Odświeżenie listy (auto)**
   - Automatycznie co 30 sekund
   - Silent - bez widocznej indykacji

5. **Zmiana strony paginacji**
   - Kliknięcie numeru strony lub Previous/Next
   - Fetch komentarzy dla nowej strony
   - Scroll do góry sekcji (opcjonalne)

---

## Loading states

### Initial load

Skeleton loader dla listy komentarzy (implementowany w głównym komponencie strony).

### Pagination / Refresh

```typescript
<CommentList>
  {isLoading && (
    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )}
  {/* comments */}
</CommentList>
```

### Submit form

```typescript
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  ) : (
    <Send className="mr-2 h-4 w-4" />
  )}
  Add Comment
</Button>
```

---

## Accessibility

### ARIA Labels

```typescript
<Button aria-label="Refresh comments">
  <RefreshCw />
</Button>

<Button aria-label="Delete comment">
  <Trash2 />
</Button>
```

### Keyboard Navigation

- Tab do nawigacji między elementami
- Enter do submit formularza
- Arrow keys do nawigacji w pagination

### Live Regions

Opcjonalnie można dodać `aria-live` dla dynamicznych aktualizacji:

```typescript
<div aria-live="polite" className="sr-only">
  {isLoading ? 'Loading comments...' : `${comments.length} comments loaded`}
</div>
```

---

## Performance

### Memoization

```typescript
import { memo, useCallback } from "react";

// Memoizacja CommentItem
export const CommentItem = memo(function CommentItem({ comment, onDelete }: CommentItemProps) {
  // ...
});

// useCallback dla event handlers
const handleDeleteComment = useCallback(
  async (commentId: string) => {
    await deleteComment(commentId);
  },
  [deleteComment]
);
```

### Debounce dla CharacterCounter

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const debouncedLength = useDebouncedValue(content.length, 100);

<CharacterCounter current={debouncedLength} max={maxLength} />
```

---

## Checklist implementacji

- [ ] Zaimplementować `CommentItem`
- [ ] Zaimplementować `CommentList`
- [ ] Zaimplementować `CommentForm`
- [ ] Zaimplementować `BriefCommentsSection`
- [ ] Dodać komponent Pagination do projektu (shadcn/ui)
- [ ] Przetestować dodawanie komentarzy
- [ ] Przetestować usuwanie komentarzy
- [ ] Przetestować paginację
- [ ] Przetestować auto-refresh (polling co 30s)
- [ ] Przetestować manual refresh
- [ ] Przetestować limit 1000 znaków
- [ ] Przetestować empty state

---

## Zależności od innych części

- **Wymaga:** [Part 1: Infrastructure](./brief-details-infrastructure.md) - typy, `useBriefComments` hook
- **Wymaga:** [Part 2: Header](./brief-details-header.md) - `CharacterCounter`
- **Używane przez:** [Part 6: Main Page](./brief-details-page.md)

## Następne kroki

Po zakończeniu tej części, przejdź do:

- [Part 6: Main Page & Error Handling](./brief-details-page.md)
