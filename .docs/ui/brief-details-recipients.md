# Brief Details - Part 4: Recipients Section

## Przegląd

Ten dokument opisuje implementację sekcji zarządzania odbiorcami briefu. Sekcja jest widoczna tylko dla właściciela briefu (`isOwned === true`).

## Komponenty do implementacji

```
BriefRecipientsSection (Client Component - conditional, only if isOwned)
└── Card
    ├── CardHeader
    │   ├── h2
    │   └── RecipientLimitIndicator
    └── CardContent
        ├── RecipientTable
        │   └── Table
        │       ├── TableHeader
        │       └── TableBody
        │           └── RecipientRow[] (with delete action)
        └── RecipientAddForm
            ├── Input (email)
            └── Button (Add)

ShareBriefDialog (używany w OwnerActions)
└── Dialog
    ├── DialogHeader
    └── DialogContent
        ├── RecipientTable
        ├── RecipientAddForm
        └── RecipientLimitIndicator
```

---

## RecipientLimitIndicator

**Lokalizacja:** `src/components/briefs/RecipientLimitIndicator.tsx`

**Typ:** Client Component

**Opis:** Wskaźnik pokazujący aktualną liczbę odbiorców i limit.

### Propsy

```typescript
interface RecipientLimitIndicatorProps {
  current: number;
  max: number;
}
```

### Implementacja

```typescript
'use client';

import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

interface RecipientLimitIndicatorProps {
  current: number;
  max: number;
}

export function RecipientLimitIndicator({ current, max }: RecipientLimitIndicatorProps) {
  const isNearLimit = current >= max * 0.8;
  const isAtLimit = current >= max;

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-sm',
        isAtLimit && 'text-destructive',
        !isAtLimit && isNearLimit && 'text-yellow-600 dark:text-yellow-400',
        !isAtLimit && !isNearLimit && 'text-muted-foreground'
      )}
    >
      <Users className="h-4 w-4" />
      <span>
        {current}/{max} recipients
      </span>
    </div>
  );
}
```

---

## RecipientTable

**Lokalizacja:** `src/components/briefs/RecipientTable.tsx`

**Typ:** Client Component

**Opis:** Tabela wyświetlająca listę odbiorców briefu z możliwością usunięcia dostępu.

### Propsy

```typescript
interface RecipientTableProps {
  recipients: BriefRecipientDto[];
  onRemove: (recipientId: string) => Promise<void>;
  isLoading?: boolean;
}
```

### Implementacja

```typescript
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { BriefRecipientDto } from '@/types';

interface RecipientTableProps {
  recipients: BriefRecipientDto[];
  onRemove: (recipientId: string) => Promise<void>;
  isLoading?: boolean;
}

export function RecipientTable({ recipients, onRemove, isLoading }: RecipientTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (recipientId: string) => {
    setRemovingId(recipientId);
    try {
      await onRemove(recipientId);
    } finally {
      setRemovingId(null);
    }
  };

  if (recipients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No recipients yet. Add someone to share this brief.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Shared</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recipients.map((recipient) => (
          <TableRow key={recipient.id}>
            <TableCell className="font-medium">
              {recipient.recipientEmail}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(recipient.sharedAt), { addSuffix: true })}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(recipient.id)}
                disabled={isLoading || removingId === recipient.id}
                aria-label={`Remove ${recipient.recipientEmail}`}
              >
                {removingId === recipient.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## RecipientAddForm

**Lokalizacja:** `src/components/briefs/RecipientAddForm.tsx`

**Typ:** Client Component

**Opis:** Formularz dodawania nowego odbiorcy briefu przez email.

### Propsy

```typescript
interface RecipientAddFormProps {
  briefId: string;
  currentCount: number;
  maxCount: number;
  onAdd: (email: string) => Promise<void>;
}
```

### Implementacja

```typescript
'use client';

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface RecipientAddFormProps {
  briefId: string;
  currentCount: number;
  maxCount: number;
  onAdd: (email: string) => Promise<void>;
}

export function RecipientAddForm({
  briefId,
  currentCount,
  maxCount,
  onAdd,
}: RecipientAddFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const canAdd = currentCount < maxCount;
  const isValidEmail = email.trim() !== '' && email.includes('@');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!canAdd || !isValidEmail) return;

    setIsSubmitting(true);
    try {
      await onAdd(email.trim());
      setEmail('');
      toast({
        title: 'Recipient added',
        description: `${email} now has access to this brief.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add recipient.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="email"
        placeholder="client@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={!canAdd || isSubmitting}
        className="flex-1"
      />
      <Button
        type="submit"
        disabled={!canAdd || !isValidEmail || isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </>
        )}
      </Button>
    </form>
  );
}
```

---

## BriefRecipientsSection

**Lokalizacja:** `src/components/briefs/BriefRecipientsSection.tsx`

**Typ:** Client Component

**Opis:** Sekcja wyświetlająca listę odbiorców briefu i formularz dodawania nowych odbiorców.

### Propsy

```typescript
interface BriefRecipientsSectionProps {
  briefId: string;
  initialRecipients: BriefRecipientDto[];
}
```

### Implementacja

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecipientTable } from './RecipientTable';
import { RecipientAddForm } from './RecipientAddForm';
import { RecipientLimitIndicator } from './RecipientLimitIndicator';
import { useBriefRecipients } from '@/components/hooks/useBriefRecipients';
import { BRIEF_CONSTANTS } from '@/lib/constants/brief.constants';
import type { BriefRecipientDto } from '@/types';

interface BriefRecipientsSectionProps {
  briefId: string;
  initialRecipients: BriefRecipientDto[];
}

export function BriefRecipientsSection({
  briefId,
  initialRecipients,
}: BriefRecipientsSectionProps) {
  const {
    recipients,
    isLoading,
    addRecipient,
    removeRecipient,
  } = useBriefRecipients({
    briefId,
    initialRecipients,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recipients</CardTitle>
        <RecipientLimitIndicator
          current={recipients.length}
          max={BRIEF_CONSTANTS.MAX_RECIPIENTS}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <RecipientTable
          recipients={recipients}
          onRemove={removeRecipient}
          isLoading={isLoading}
        />
        <RecipientAddForm
          briefId={briefId}
          currentCount={recipients.length}
          maxCount={BRIEF_CONSTANTS.MAX_RECIPIENTS}
          onAdd={addRecipient}
        />
      </CardContent>
    </Card>
  );
}
```

---

## ShareBriefDialog

**Lokalizacja:** `src/components/briefs/ShareBriefDialog.tsx`

**Typ:** Client Component

**Opis:** Dialog umożliwiający zarządzanie odbiorcami briefu. Używany w `OwnerActions`.

### Propsy

```typescript
interface ShareBriefDialogProps {
  briefId: string;
  recipients: BriefRecipientDto[];
  trigger: React.ReactNode;
  onRecipientsChange?: () => void;
}
```

### Implementacja

```typescript
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RecipientTable } from './RecipientTable';
import { RecipientAddForm } from './RecipientAddForm';
import { RecipientLimitIndicator } from './RecipientLimitIndicator';
import { useBriefRecipients } from '@/components/hooks/useBriefRecipients';
import { BRIEF_CONSTANTS } from '@/lib/constants/brief.constants';
import type { BriefRecipientDto } from '@/types';

interface ShareBriefDialogProps {
  briefId: string;
  recipients: BriefRecipientDto[];
  trigger: React.ReactNode;
  onRecipientsChange?: () => void;
}

export function ShareBriefDialog({
  briefId,
  recipients: initialRecipients,
  trigger,
  onRecipientsChange,
}: ShareBriefDialogProps) {
  const {
    recipients,
    isLoading,
    addRecipient,
    removeRecipient,
  } = useBriefRecipients({
    briefId,
    initialRecipients,
  });

  const handleAdd = async (email: string) => {
    await addRecipient(email);
    onRecipientsChange?.();
  };

  const handleRemove = async (recipientId: string) => {
    await removeRecipient(recipientId);
    onRecipientsChange?.();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Share Brief</DialogTitle>
            <RecipientLimitIndicator
              current={recipients.length}
              max={BRIEF_CONSTANTS.MAX_RECIPIENTS}
            />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <RecipientTable
            recipients={recipients}
            onRemove={handleRemove}
            isLoading={isLoading}
          />

          <RecipientAddForm
            briefId={briefId}
            currentCount={recipients.length}
            maxCount={BRIEF_CONSTANTS.MAX_RECIPIENTS}
            onAdd={handleAdd}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## API Endpoints

### GET /api/briefs/:id/recipients

**Kiedy:** Initial load + refresh

**Response (200 OK):**

```typescript
{
  data: BriefRecipientDto[]
}
```

### POST /api/briefs/:id/recipients

**Kiedy:** Owner adds new recipient

**Request:**

```typescript
{
  email: string;
}
```

**Response (201 Created):**

```typescript
ShareBriefResponseDto;
```

**Błędy:**

- `400` - User with email not found
- `403` - Maximum of 10 recipients per brief exceeded
- `409` - User already has access to this brief

### DELETE /api/briefs/:id/recipients/:recipientId

**Kiedy:** Owner removes recipient access

**Response (204 No Content):** Empty body

**Side effects:**

- Usunięcie ostatniego odbiorcy resetuje status briefu do 'draft'

---

## Warunki renderowania

| Komponent                | Warunek                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `BriefRecipientsSection` | `isOwned === true`                                         |
| `ShareBriefDialog`       | `isOwned === true` (jako część OwnerActions)               |
| `RecipientAddForm`       | `recipients.length < 10` (przycisk Add disabled gdy limit) |

---

## Walidacja

### RecipientAddForm

| Pole  | Walidacja                                          |
| ----- | -------------------------------------------------- |
| Email | Wymagany, poprawny format (HTML5 email validation) |
| Limit | `currentCount < maxCount` (10)                     |

### API Response Errors

| Kod | Komunikat                                     | Obsługa                 |
| --- | --------------------------------------------- | ----------------------- |
| 400 | "User with email 'X' not found"               | Toast notification      |
| 403 | "Maximum of 10 recipients per brief exceeded" | Toast + disabled button |
| 409 | "User already has access to this brief"       | Toast notification      |

---

## Interakcje użytkownika

1. **Dodanie odbiorcy**
   - Wpisanie email w input
   - Kliknięcie "Add" lub Enter
   - Wywołanie `POST /api/briefs/:id/recipients`
   - Sukces → Toast + czyszczenie inputu + refresh listy

2. **Usunięcie odbiorcy**
   - Kliknięcie ikony Trash przy odbiorcy
   - Wywołanie `DELETE /api/briefs/:id/recipients/:recipientId` (bez potwierdzenia)
   - Sukces → refresh listy
   - Uwaga: usunięcie ostatniego odbiorcy zmienia status na 'draft'

3. **Dialog Share**
   - Kliknięcie "Share" w OwnerActions
   - Otwarcie dialogu z listą odbiorców
   - Możliwość dodawania/usuwania odbiorców w dialogu

---

## Accessibility

### Labele ARIA

```typescript
<Button
  aria-label={`Remove ${recipient.recipientEmail}`}
  // ...
>
  <Trash2 />
</Button>
```

### Focus Management

- Po dodaniu odbiorcy, focus pozostaje na input email
- Po usunięciu odbiorcy, focus przesuwa się do następnego wiersza lub inputa

### Keyboard Navigation

- Tab do nawigacji między elementami
- Enter do submit formularza
- Escape do zamknięcia dialogu

---

## Obsługa błędów

### Network errors

```typescript
try {
  await addRecipient(email);
} catch (error) {
  toast({
    title: "Error",
    description: error instanceof Error ? error.message : "Failed to add recipient.",
    variant: "destructive",
  });
}
```

### Specific error handling

```typescript
const handleAdd = async (email: string) => {
  try {
    await addRecipient(email);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("not found")) {
      toast({
        title: "User not found",
        description: `No user with email "${email}" exists in the system.`,
        variant: "destructive",
      });
    } else if (message.includes("already has access")) {
      toast({
        title: "Already shared",
        description: `${email} already has access to this brief.`,
        variant: "destructive",
      });
    } else if (message.includes("Maximum")) {
      toast({
        title: "Limit reached",
        description: "You cannot add more than 10 recipients.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to add recipient. Please try again.",
        variant: "destructive",
      });
    }
  }
};
```

---

## Checklist implementacji

- [ ] Zaimplementować `RecipientLimitIndicator`
- [ ] Zaimplementować `RecipientTable`
- [ ] Zaimplementować `RecipientAddForm`
- [ ] Zaimplementować `BriefRecipientsSection`
- [ ] Zaimplementować `ShareBriefDialog`
- [ ] Dodać komponenty Table do projektu (shadcn/ui)
- [ ] Przetestować dodawanie odbiorców
- [ ] Przetestować usuwanie odbiorców
- [ ] Przetestować limit 10 odbiorców
- [ ] Przetestować obsługę błędów (user not found, already shared)
- [ ] Przetestować zmianę statusu na 'draft' po usunięciu ostatniego odbiorcy

---

## Zależności od innych części

- **Wymaga:** [Part 1: Infrastructure](./brief-details-infrastructure.md) - typy, `useBriefRecipients` hook
- **Wymaga:** [Part 2: Header](./brief-details-header.md) - `ShareBriefDialog` używany w `OwnerActions`
- **Używane przez:** [Part 6: Main Page](./brief-details-page.md)

## Następne kroki

Po zakończeniu tej części, przejdź do:

- [Part 5: Comments Section](./brief-details-comments.md)
