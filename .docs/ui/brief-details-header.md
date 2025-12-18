# Brief Details - Part 2: Header & Status

## Przegląd

Ten dokument opisuje implementację nagłówka briefu, badge'a statusu oraz przycisków akcji dla właściciela i odbiorcy.

## Komponenty do implementacji

```
BriefHeader (Client Component)
├── Card
│   ├── CardHeader
│   │   ├── h1 (header text)
│   │   └── div (status + date)
│   │       ├── BriefStatusBadge
│   │       └── span (updated date)
│   └── CardContent
│       └── BriefActionButtons (conditional)
│           ├── OwnerActions (if isOwned)
│           │   ├── Button (Edit)
│           │   ├── DeleteBriefDialog
│           │   └── ShareBriefDialog
│           └── RecipientActions (if !isOwned && status === 'sent')
│               ├── Button (Accept)
│               ├── Button (Reject)
│               └── NeedsModificationDialog
```

---

## BriefStatusBadge

**Lokalizacja:** `src/components/briefs/BriefStatusBadge.tsx`

**Typ:** Client Component

**Opis:** Badge wyświetlający aktualny status briefu z odpowiednim kolorem i tekstem.

### Propsy

```typescript
interface BriefStatusBadgeProps {
  status: BriefStatus;
}
```

### Implementacja

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import type { BriefStatus } from '@/types';

interface BriefStatusBadgeProps {
  status: BriefStatus;
}

const statusConfig: Record<BriefStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  accepted: { label: 'Accepted', variant: 'default' }, // Use custom green styling
  rejected: { label: 'Rejected', variant: 'destructive' },
  needs_modification: { label: 'Needs Modification', variant: 'outline' }, // Use custom yellow styling
};

export function BriefStatusBadge({ status }: BriefStatusBadgeProps) {
  const config = statusConfig[status];

  // Custom classes for success/warning variants not in default Badge
  const customClasses = {
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    needs_modification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  };

  const customClass = customClasses[status as keyof typeof customClasses];

  return (
    <Badge
      variant={customClass ? 'outline' : config.variant}
      className={customClass}
    >
      {config.label}
    </Badge>
  );
}
```

---

## BriefHeader

**Lokalizacja:** `src/components/briefs/BriefHeader.tsx`

**Typ:** Client Component

**Opis:** Wyświetla nagłówek briefu, status badge, datę ostatniej aktualizacji i przyciski akcji.

### Propsy

```typescript
interface BriefHeaderProps {
  brief: BriefDetailDto;
  onStatusChange?: () => void;
}
```

### Implementacja

```typescript
'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { BriefStatusBadge } from './BriefStatusBadge';
import { BriefActionButtons } from './BriefActionButtons';
import { formatDistanceToNow } from 'date-fns';
import type { BriefDetailDto } from '@/types';

interface BriefHeaderProps {
  brief: BriefDetailDto;
  onStatusChange?: () => void;
}

export function BriefHeader({ brief, onStatusChange }: BriefHeaderProps) {
  const formattedDate = formatDistanceToNow(new Date(brief.updatedAt), { addSuffix: true });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl font-semibold">{brief.header}</h1>
          <div className="flex items-center gap-2">
            <BriefStatusBadge status={brief.status} />
            <span className="text-sm text-muted-foreground">
              Updated {formattedDate}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <BriefActionButtons brief={brief} onStatusChange={onStatusChange} />
      </CardContent>
    </Card>
  );
}
```

---

## BriefActionButtons

**Lokalizacja:** `src/components/briefs/BriefActionButtons.tsx`

**Typ:** Client Component

**Opis:** Wrapper renderujący odpowiednie przyciski akcji w zależności od roli użytkownika.

### Propsy

```typescript
interface BriefActionButtonsProps {
  brief: BriefDetailDto;
  onStatusChange?: () => void;
}
```

### Implementacja

```typescript
'use client';

import { OwnerActions } from './OwnerActions';
import { RecipientActions } from './RecipientActions';
import type { BriefDetailDto } from '@/types';

interface BriefActionButtonsProps {
  brief: BriefDetailDto;
  onStatusChange?: () => void;
}

export function BriefActionButtons({ brief, onStatusChange }: BriefActionButtonsProps) {
  if (brief.isOwned) {
    return <OwnerActions brief={brief} />;
  }

  if (brief.status === 'sent') {
    return <RecipientActions briefId={brief.id} onStatusChange={onStatusChange} />;
  }

  return null;
}
```

---

## OwnerActions

**Lokalizacja:** `src/components/briefs/OwnerActions.tsx`

**Typ:** Client Component

**Opis:** Grupa przycisków akcji dostępnych dla właściciela briefu.

### Propsy

```typescript
interface OwnerActionsProps {
  brief: BriefDetailDto;
  onDelete?: () => void;
}
```

### Implementacja

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Share2 } from 'lucide-react';
import { DeleteBriefDialog } from './DeleteBriefDialog';
import { ShareBriefDialog } from './ShareBriefDialog';
import type { BriefDetailDto } from '@/types';

interface OwnerActionsProps {
  brief: BriefDetailDto;
  onDelete?: () => void;
}

export function OwnerActions({ brief, onDelete }: OwnerActionsProps) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`/briefs/${brief.id}/edit`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleEdit}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Button>

      <DeleteBriefDialog
        briefId={brief.id}
        trigger={
          <Button variant="outline">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        }
      />

      <ShareBriefDialog
        briefId={brief.id}
        recipients={[]} // Initial recipients, will be fetched by dialog
        trigger={
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        }
      />
    </div>
  );
}
```

---

## RecipientActions

**Lokalizacja:** `src/components/briefs/RecipientActions.tsx`

**Typ:** Client Component

**Opis:** Grupa przycisków akcji dostępnych dla odbiorcy briefu (tylko gdy status === 'sent').

### Propsy

```typescript
interface RecipientActionsProps {
  briefId: string;
  onStatusChange?: () => void;
}
```

### Implementacja

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle } from 'lucide-react';
import { NeedsModificationDialog } from './NeedsModificationDialog';
import { useBriefStatusChange } from '@/components/hooks/useBriefStatusChange';
import { useToast } from '@/components/ui/use-toast';

interface RecipientActionsProps {
  briefId: string;
  onStatusChange?: () => void;
}

export function RecipientActions({ briefId, onStatusChange }: RecipientActionsProps) {
  const { toast } = useToast();
  const { isChanging, acceptBrief, rejectBrief, requestModification } = useBriefStatusChange({
    briefId,
    onSuccess: onStatusChange,
  });

  const handleAccept = async () => {
    try {
      await acceptBrief();
      toast({
        title: 'Brief accepted',
        description: 'The brief has been accepted successfully.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to accept the brief. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    try {
      await rejectBrief();
      toast({
        title: 'Brief rejected',
        description: 'The brief has been rejected.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reject the brief. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleNeedsModification = async (comment: string) => {
    try {
      await requestModification(comment);
      toast({
        title: 'Modification requested',
        description: 'Your feedback has been sent to the brief owner.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to request modification. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handleAccept} disabled={isChanging}>
        <Check className="mr-2 h-4 w-4" />
        Accept
      </Button>

      <Button variant="outline" onClick={handleReject} disabled={isChanging}>
        <X className="mr-2 h-4 w-4" />
        Reject
      </Button>

      <NeedsModificationDialog
        briefId={briefId}
        trigger={
          <Button variant="outline" disabled={isChanging}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Needs Modification
          </Button>
        }
        onSubmit={handleNeedsModification}
      />
    </div>
  );
}
```

---

## DeleteBriefDialog

**Lokalizacja:** `src/components/briefs/DeleteBriefDialog.tsx`

**Typ:** Client Component

**Opis:** AlertDialog z potwierdzeniem usunięcia briefu.

### Propsy

```typescript
interface DeleteBriefDialogProps {
  briefId: string;
  trigger: React.ReactNode;
}
```

### Implementacja

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

interface DeleteBriefDialogProps {
  briefId: string;
  trigger: React.ReactNode;
}

export function DeleteBriefDialog({ briefId, trigger }: DeleteBriefDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/briefs/${briefId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete brief');
      }

      toast({
        title: 'Brief deleted',
        description: 'The brief has been deleted successfully.',
      });

      router.push('/briefs');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete the brief. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete all comments and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## NeedsModificationDialog

**Lokalizacja:** `src/components/briefs/NeedsModificationDialog.tsx`

**Typ:** Client Component

**Opis:** Dialog do zgłoszenia potrzeby modyfikacji briefu z wymaganym komentarzem.

### Propsy

```typescript
interface NeedsModificationDialogProps {
  briefId: string;
  trigger: React.ReactNode;
  onSubmit: (comment: string) => Promise<void>;
}
```

### Implementacja

```typescript
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CharacterCounter } from './CharacterCounter';
import { BRIEF_CONSTANTS } from '@/lib/constants/brief.constants';

interface NeedsModificationDialogProps {
  briefId: string;
  trigger: React.ReactNode;
  onSubmit: (comment: string) => Promise<void>;
}

export function NeedsModificationDialog({
  briefId,
  trigger,
  onSubmit,
}: NeedsModificationDialogProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const trimmedComment = comment.trim();
  const isValid = trimmedComment.length > 0 && trimmedComment.length <= BRIEF_CONSTANTS.MAX_COMMENT_LENGTH;

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedComment);
      setComment('');
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Modification</DialogTitle>
          <DialogDescription>
            Please provide feedback on what changes are needed. This comment will be added to the brief.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            placeholder="Describe the modifications needed..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={isSubmitting}
          />
          <CharacterCounter
            current={trimmedComment.length}
            max={BRIEF_CONSTANTS.MAX_COMMENT_LENGTH}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## CharacterCounter

**Lokalizacja:** `src/components/briefs/CharacterCounter.tsx`

**Typ:** Client Component

**Opis:** Licznik znaków wyświetlający aktualną liczbę znaków i limit.

### Propsy

```typescript
interface CharacterCounterProps {
  current: number;
  max: number;
}
```

### Implementacja

```typescript
'use client';

import { cn } from '@/lib/utils';

interface CharacterCounterProps {
  current: number;
  max: number;
}

export function CharacterCounter({ current, max }: CharacterCounterProps) {
  const isOverLimit = current > max;
  const isNearLimit = current > max * 0.9;

  return (
    <span
      className={cn(
        'text-sm',
        isOverLimit && 'text-destructive font-medium',
        !isOverLimit && isNearLimit && 'text-yellow-600 dark:text-yellow-400',
        !isOverLimit && !isNearLimit && 'text-muted-foreground'
      )}
    >
      {current}/{max}
    </span>
  );
}
```

---

## Interakcje użytkownika

### Właściciel briefu (isOwned === true)

1. **Edycja briefu**
   - Kliknięcie "Edit" → przekierowanie do `/briefs/[id]/edit`

2. **Usunięcie briefu**
   - Kliknięcie "Delete" → otwarcie AlertDialog
   - Potwierdzenie → wywołanie `DELETE /api/briefs/:id`
   - Sukces → Toast + przekierowanie do `/briefs`

3. **Udostępnianie briefu**
   - Kliknięcie "Share" → otwarcie ShareBriefDialog
   - (Szczegóły w [Part 4: Recipients](./brief-details-recipients.md))

### Odbiorca briefu (!isOwned && status === 'sent')

1. **Akceptacja briefu**
   - Kliknięcie "Accept" → `PATCH /api/briefs/:id/status` z `{ status: 'accepted' }`
   - Sukces → Toast + odświeżenie strony

2. **Odrzucenie briefu**
   - Kliknięcie "Reject" → `PATCH /api/briefs/:id/status` z `{ status: 'rejected' }`
   - Sukces → Toast + odświeżenie strony

3. **Zgłoszenie potrzeby modyfikacji**
   - Kliknięcie "Needs Modification" → otwarcie NeedsModificationDialog
   - Wymagany komentarz (1-1000 znaków)
   - Submit → `PATCH /api/briefs/:id/status` z `{ status: 'needs_modification', comment }`

---

## Warunki renderowania

| Komponent | Warunek |
|-----------|---------|
| `OwnerActions` | `isOwned === true` |
| `RecipientActions` | `!isOwned && status === 'sent'` |
| `BriefActionButtons` | Zawsze renderowany (puste gdy brak akcji) |

---

## API Endpoints

### PATCH /api/briefs/:id/status

**Request:**
```typescript
// Accept
{ status: 'accepted' }

// Reject
{ status: 'rejected' }

// Needs Modification
{
  status: 'needs_modification',
  comment: string // 1-1000 characters
}
```

**Response (200 OK):**
```typescript
UpdateBriefStatusWithCommentResponseDto
```

### DELETE /api/briefs/:id

**Response (204 No Content):** Empty body

---

## Checklist implementacji

- [ ] Zaimplementować `BriefStatusBadge`
- [ ] Zaimplementować `CharacterCounter`
- [ ] Zaimplementować `BriefHeader`
- [ ] Zaimplementować `BriefActionButtons`
- [ ] Zaimplementować `OwnerActions`
- [ ] Zaimplementować `RecipientActions`
- [ ] Zaimplementować `DeleteBriefDialog`
- [ ] Zaimplementować `NeedsModificationDialog`
- [ ] Dodać komponenty AlertDialog do projektu (shadcn/ui)
- [ ] Przetestować wszystkie akcje właściciela
- [ ] Przetestować wszystkie akcje odbiorcy

---

## Zależności od innych części

- **Wymaga:** [Part 1: Infrastructure](./brief-details-infrastructure.md) - typy, hooki
- **Używane przez:** [Part 6: Main Page](./brief-details-page.md)

## Następne kroki

Po zakończeniu tej części, przejdź do:
- [Part 3: Brief Content & Footer](./brief-details-content.md)
