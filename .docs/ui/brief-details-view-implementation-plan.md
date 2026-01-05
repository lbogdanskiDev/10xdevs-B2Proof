# Plan implementacji widoku szczegółów briefu

## 1. Przegląd

Widok szczegółów briefu (`/briefs/[id]`) to główny widok aplikacji umożliwiający wyświetlenie pełnej treści briefu oraz wykonywanie akcji zależnych od roli użytkownika (właściciel/odbiorca). Widok wyświetla: nagłówek briefu, treść w formacie TipTap (read-only), opcjonalny stopkę, status, akcje dostępne dla użytkownika, listę odbiorców (tylko dla właściciela) oraz sekcję komentarzy z paginacją. Widok jest renderowany po stronie serwera (Server Component) z dynamicznymi elementami interaktywnymi w postaci Client Components.

## 2. Routing widoku

**Ścieżka:** `/briefs/[id]`

**Lokalizacja pliku:** `src/app/(dashboard)/briefs/[id]/page.tsx`

**Typ:** Server Component (domyślny w Next.js 15 App Router)

**Autoryzacja:** Użytkownik musi być właścicielem briefu lub odbiorą (recipient). Weryfikacja wykonywana na poziomie API.

## 3. Struktura komponentów

```
BriefDetailsPage (Server Component)
├── BriefHeader (Client Component)
│   ├── Card
│   │   ├── CardHeader
│   │   │   ├── h1 (header text)
│   │   │   └── div (status + date)
│   │   │       ├── BriefStatusBadge
│   │   │       └── span (updated date)
│   │   └── CardContent
│   │       └── BriefActionButtons (conditional)
│   │           ├── OwnerActions (if isOwned)
│   │           │   ├── Button (Edit)
│   │           │   ├── DeleteBriefDialog
│   │           │   └── ShareBriefDialog
│   │           └── RecipientActions (if !isOwned && status === 'sent')
│   │               ├── Button (Accept)
│   │               ├── Button (Reject)
│   │               └── NeedsModificationDialog
├── BriefContentSection (Server Component)
│   └── Card
│       └── CardContent
│           └── BriefContentRenderer (Client Component - TipTap read-only)
├── BriefFooterSection (Server Component - conditional)
│   └── Card
│       └── CardContent
│           └── p (footer text)
├── BriefRecipientsSection (Client Component - conditional, only if isOwned)
│   └── Card
│       ├── CardHeader
│       │   ├── h2
│       │   └── RecipientLimitIndicator
│       └── CardContent
│           ├── RecipientTable
│           │   └── Table
│           │       ├── TableHeader
│           │       └── TableBody
│           │           └── RecipientRow[] (with delete action)
│           └── RecipientAddForm
│               ├── Input (email)
│               └── Button (Add)
└── BriefCommentsSection (Client Component)
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

## 4. Szczegóły komponentów

### BriefDetailsPage (Server Component)

**Opis:** Główny komponent strony odpowiedzialny za pobranie danych briefu z API i przekazanie ich do komponentów potomnych. Renderowany po stronie serwera.

**Główne elementy:**

- Wywołanie `fetch()` do `GET /api/briefs/:id` w funkcji async component
- Warunkowe renderowanie sekcji w zależności od `isOwned` i `status`
- Layout kontenerowy z odpowiednimi odstępami (spacing)

**Obsługiwane interakcje:** Brak (Server Component)

**Walidacja:** Walidacja UUID w URL (Next.js automatycznie przekazuje params)

**Typy:**

- `BriefDetailDto` (z API response)
- `params: { id: string }` (Next.js route params)

**Propsy:**

```typescript
interface BriefDetailsPageProps {
  params: Promise<{ id: string }>;
}
```

---

### BriefHeader (Client Component)

**Opis:** Wyświetla nagłówek briefu, status badge, datę ostatniej aktualizacji i przyciski akcji zależne od roli użytkownika.

**Główne elementy:**

- `Card`, `CardHeader`, `CardContent` (Shadcn/ui)
- `h1` z nagłówkiem briefu (`font-semibold`)
- `BriefStatusBadge` z przekazanym statusem
- `span` z datą aktualizacji (format: relative time lub ISO)
- Warunkowe renderowanie `OwnerActions` lub `RecipientActions`

**Obsługiwane interakcje:**

- Kliknięcie przycisku "Edit" → przekierowanie do `/briefs/[id]/edit`
- Kliknięcie przycisku "Delete" → otwarcie `DeleteBriefDialog`
- Kliknięcie przycisku "Share" → otwarcie `ShareBriefDialog`
- Kliknięcie przycisku "Accept" → wywołanie `PATCH /api/briefs/:id/status` z `{ status: 'accepted' }`
- Kliknięcie przycisku "Reject" → wywołanie `PATCH /api/briefs/:id/status` z `{ status: 'rejected' }`
- Kliknięcie przycisku "Needs Modification" → otwarcie `NeedsModificationDialog`

**Walidacja:** Brak (przyciski są disabled podczas ładowania)

**Typy:**

- `BriefDetailDto`
- `BriefStatus`

**Propsy:**

```typescript
interface BriefHeaderProps {
  brief: BriefDetailDto;
  onStatusChange?: () => void; // callback po zmianie statusu
}
```

---

### BriefStatusBadge (Client Component)

**Opis:** Badge wyświetlający aktualny status briefu z odpowiednim kolorem i tekstem.

**Główne elementy:**

- `Badge` (Shadcn/ui) z wariantami zależnymi od statusu:
  - `draft` → variant: "secondary"
  - `sent` → variant: "default"
  - `accepted` → variant: "success" (custom)
  - `rejected` → variant: "destructive"
  - `needs_modification` → variant: "warning" (custom)

**Obsługiwane interakcje:** Brak (tylko wyświetlanie)

**Walidacja:** Brak

**Typy:**

- `BriefStatus`

**Propsy:**

```typescript
interface BriefStatusBadgeProps {
  status: BriefStatus;
}
```

---

### OwnerActions (Client Component)

**Opis:** Grupa przycisków akcji dostępnych dla właściciela briefu.

**Główne elementy:**

- `Button` "Edit" → `variant="outline"`
- `DeleteBriefDialog` (wrapper z triggerem)
- `ShareBriefDialog` (wrapper z triggerem)

**Obsługiwane interakcje:**

- Edit → `useRouter().push('/briefs/[id]/edit')`
- Delete → otwarcie AlertDialog z potwierdzeniem
- Share → otwarcie Dialog z formularzem

**Walidacja:** Brak (przyciski są warunkowe)

**Typy:**

- `BriefDetailDto`

**Propsy:**

```typescript
interface OwnerActionsProps {
  brief: BriefDetailDto;
  onDelete?: () => void;
}
```

---

### RecipientActions (Client Component)

**Opis:** Grupa przycisków akcji dostępnych dla odbiorcy briefu (tylko gdy status === 'sent').

**Główne elementy:**

- `Button` "Accept" → `variant="default"`
- `Button` "Reject" → `variant="outline"`
- `NeedsModificationDialog` (wrapper z triggerem)

**Obsługiwane interakcje:**

- Accept → wywołanie API `PATCH /api/briefs/:id/status` z `{ status: 'accepted' }`
- Reject → wywołanie API `PATCH /api/briefs/:id/status` z `{ status: 'rejected' }`
- Needs Modification → otwarcie dwuetapowego dialogu z wymaganym komentarzem

**Walidacja:**

- Przyciski widoczne tylko gdy `status === 'sent'`
- Przyciski disabled gdy trwa request do API

**Typy:**

- `BriefDetailDto`
- `UpdateBriefStatusCommand`

**Propsy:**

```typescript
interface RecipientActionsProps {
  briefId: string;
  onStatusChange?: () => void;
}
```

---

### DeleteBriefDialog (Client Component)

**Opis:** AlertDialog z potwierdzeniem usunięcia briefu. Wyświetla komunikat: "Are you sure? This will delete all comments and cannot be undone."

**Główne elementy:**

- `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent` (Shadcn/ui)
- `AlertDialogHeader` z tytułem i opisem
- `AlertDialogFooter` z przyciskami "Cancel" i "Delete"

**Obsługiwane interakcje:**

- Cancel → zamknięcie dialogu
- Delete → wywołanie `DELETE /api/briefs/:id`, przekierowanie do `/briefs` po sukcesie

**Walidacja:** Brak

**Typy:** Brak (używa tylko `briefId: string`)

**Propsy:**

```typescript
interface DeleteBriefDialogProps {
  briefId: string;
  trigger: React.ReactNode;
}
```

---

### ShareBriefDialog (Client Component)

**Opis:** Dialog umożliwiający dodanie odbiorcy briefu przez email. Wyświetla aktualną listę odbiorców z możliwością usunięcia dostępu.

**Główne elementy:**

- `Dialog`, `DialogTrigger`, `DialogContent` (Shadcn/ui)
- `DialogHeader` z tytułem
- `RecipientTable` (lista aktualnych odbiorców)
- `RecipientAddForm` (formularz dodawania)
- `RecipientLimitIndicator` (np. "2/10")

**Obsługiwane interakcje:**

- Dodanie odbiorcy → wywołanie `POST /api/briefs/:id/recipients` z `{ email }`
- Usunięcie odbiorcy → wywołanie `DELETE /api/briefs/:id/recipients/:recipientId`

**Walidacja:**

- Email musi być w poprawnym formacie
- Limit 10 odbiorców

**Typy:**

- `BriefRecipientDto[]`
- `ShareBriefCommand`

**Propsy:**

```typescript
interface ShareBriefDialogProps {
  briefId: string;
  recipients: BriefRecipientDto[];
  trigger: React.ReactNode;
  onRecipientsChange?: () => void;
}
```

---

### NeedsModificationDialog (Client Component)

**Opis:** Dwuetapowy dialog do zgłoszenia potrzeby modyfikacji briefu. Wymaga podania komentarza.

**Główne elementy:**

- `Dialog`, `DialogTrigger`, `DialogContent` (Shadcn/ui)
- `DialogHeader` z tytułem
- `Textarea` dla komentarza (1000 znaków)
- `CharacterCounter`
- `DialogFooter` z przyciskami "Cancel" i "Submit"

**Obsługiwane interakcje:**

- Submit → wywołanie `PATCH /api/briefs/:id/status` z `{ status: 'needs_modification', comment }`

**Walidacja:**

- Komentarz wymagany (1-1000 znaków)
- Przycisk Submit disabled gdy komentarz pusty lub przekroczony limit

**Typy:**

- `UpdateBriefStatusCommand`

**Propsy:**

```typescript
interface NeedsModificationDialogProps {
  briefId: string;
  trigger: React.ReactNode;
  onSubmit?: () => void;
}
```

---

### BriefContentRenderer (Client Component)

**Opis:** Komponent renderujący treść briefu w formacie TipTap JSON w trybie read-only z wykorzystaniem Tailwind Typography.

**Główne elementy:**

- TipTap `EditorContent` w trybie `editable={false}`
- Klasy CSS: `prose dark:prose-invert` (Tailwind Typography)
- Konfiguracja TipTap z dozwolonymi rozszerzeniami (zgodnie z tech stack)

**Obsługiwane interakcje:** Brak (read-only)

**Walidacja:** Brak

**Typy:**

- `BriefEntity['content']` (TipTap JSON structure)

**Propsy:**

```typescript
interface BriefContentRendererProps {
  content: BriefEntity["content"];
}
```

---

### BriefFooterSection (Server Component)

**Opis:** Opcjonalna sekcja wyświetlająca stopkę briefu. Renderowana tylko gdy `footer !== null`.

**Główne elementy:**

- `Card`, `CardContent` (Shadcn/ui)
- `p` z klasą `text-muted-foreground`

**Obsługiwane interakcje:** Brak

**Walidacja:** Warunkowe renderowanie (gdy `footer !== null`)

**Typy:**

- `string | null`

**Propsy:**

```typescript
interface BriefFooterSectionProps {
  footer: string | null;
}
```

---

### BriefRecipientsSection (Client Component)

**Opis:** Sekcja wyświetlająca listę odbiorców briefu i formularz dodawania nowych odbiorców. Widoczna tylko dla właściciela.

**Główne elementy:**

- `Card`, `CardHeader`, `CardContent` (Shadcn/ui)
- `h2` z tytułem "Recipients"
- `RecipientLimitIndicator` (np. "2/10")
- `RecipientTable` z listą odbiorców
- `RecipientAddForm` z inputem email i przyciskiem "Add"

**Obsługiwane interakcje:**

- Dodanie odbiorcy → `POST /api/briefs/:id/recipients`
- Usunięcie odbiorcy → `DELETE /api/briefs/:id/recipients/:recipientId`
- Refresh listy po każdej zmianie

**Walidacja:**

- Email w poprawnym formacie
- Limit 10 odbiorców
- Recipient już nie istnieje na liście

**Typy:**

- `BriefRecipientDto[]`
- `ShareBriefCommand`

**Propsy:**

```typescript
interface BriefRecipientsSectionProps {
  briefId: string;
  initialRecipients: BriefRecipientDto[];
}
```

---

### RecipientTable (Client Component)

**Opis:** Tabela wyświetlająca listę odbiorców briefu z możliwością usunięcia dostępu.

**Główne elementy:**

- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` (Shadcn/ui)
- Kolumny: Email, Shared At, Actions
- Przycisk usunięcia z ikoną `Trash2` (Lucide React)

**Obsługiwane interakcje:**

- Kliknięcie Trash icon → wywołanie `DELETE /api/briefs/:id/recipients/:recipientId`

**Walidacja:**

- Usunięcie ostatniego odbiorcy zmienia status briefu na 'draft' (obsługiwane przez API)

**Typy:**

- `BriefRecipientDto[]`

**Propsy:**

```typescript
interface RecipientTableProps {
  recipients: BriefRecipientDto[];
  onRemove: (recipientId: string) => Promise<void>;
}
```

---

### RecipientAddForm (Client Component)

**Opis:** Formularz dodawania nowego odbiorcy briefu przez email.

**Główne elementy:**

- `Input` typu email z placeholder "client@example.com"
- `Button` "Add" z ikoną `Plus` (Lucide React)
- Stan dla email input
- Stan loading podczas request

**Obsługiwane interakcje:**

- Submit → wywołanie `POST /api/briefs/:id/recipients` z `{ email }`
- Czyszczenie inputu po sukcesie

**Walidacja:**

- Email w poprawnym formacie (HTML5 email validation)
- Nie może być pusty
- Button disabled podczas loading

**Typy:**

- `ShareBriefCommand`

**Propsy:**

```typescript
interface RecipientAddFormProps {
  briefId: string;
  currentCount: number;
  maxCount: number;
  onAdd: (email: string) => Promise<void>;
}
```

---

### RecipientLimitIndicator (Client Component)

**Opis:** Wskaźnik pokazujący aktualną liczbę odbiorców i limit.

**Główne elementy:**

- `span` z tekstem "X/10 recipients"
- Warunkowa kolorystyka (np. warning gdy blisko limitu)

**Obsługiwane interakcje:** Brak

**Walidacja:** Brak

**Typy:** Brak

**Propsy:**

```typescript
interface RecipientLimitIndicatorProps {
  current: number;
  max: number;
}
```

---

### BriefCommentsSection (Client Component)

**Opis:** Sekcja wyświetlająca listę komentarzy z paginacją i formularzem dodawania nowych komentarzy. Wspiera odświeżanie co 30s oraz manualne odświeżanie.

**Główne elementy:**

- `Card`, `CardHeader`, `CardContent` (Shadcn/ui)
- `h2` z tytułem "Comments"
- `Button` "Refresh" (manual refresh)
- `CommentList` z komentarzami
- `Pagination` (server-side)
- `CommentForm`

**Obsługiwane interakcje:**

- Automatyczne odświeżanie co 30s (useEffect z intervalem)
- Manualne odświeżanie (przycisk)
- Zmiana strony paginacji → fetch nowej strony
- Dodanie komentarza → `POST /api/briefs/:id/comments`
- Usunięcie komentarza → `DELETE /api/comments/:id`

**Walidacja:**

- Paginacja: `page >= 1`, `limit` między 1 a 100

**Typy:**

- `PaginatedResponse<CommentDto>`
- `CreateCommentCommand`

**Propsy:**

```typescript
interface BriefCommentsSectionProps {
  briefId: string;
  initialComments: PaginatedResponse<CommentDto>;
}
```

---

### CommentList (Client Component)

**Opis:** Lista komentarzy wyświetlana chronologicznie (newest first).

**Główne elementy:**

- Lista `CommentItem[]`
- Informacja gdy brak komentarzy ("No comments yet")

**Obsługiwane interakcje:** Przekazywane do `CommentItem`

**Walidacja:** Brak

**Typy:**

- `CommentDto[]`

**Propsy:**

```typescript
interface CommentListProps {
  comments: CommentDto[];
  onDelete: (commentId: string) => Promise<void>;
}
```

---

### CommentItem (Client Component)

**Opis:** Pojedynczy komentarz z informacjami o autorze, datą, treścią i opcjonalnym przyciskiem usunięcia.

**Główne elementy:**

- `div` container z paddingiem i borderem
- `div` z informacją o autorze (email + role badge)
- `Badge` z rolą autora (creator/client)
- `p` z treścią komentarza
- `span` z datą utworzenia (relative time)
- `Button` usunięcia (tylko gdy `isOwn === true`)

**Obsługiwane interakcje:**

- Kliknięcie Delete → wywołanie `DELETE /api/comments/:id` bez potwierdzenia

**Walidacja:**

- Przycisk Delete widoczny tylko gdy `isOwn === true`

**Typy:**

- `CommentDto`

**Propsy:**

```typescript
interface CommentItemProps {
  comment: CommentDto;
  onDelete: (commentId: string) => Promise<void>;
}
```

---

### CommentForm (Client Component)

**Opis:** Formularz dodawania nowego komentarza z licznikiem znaków.

**Główne elementy:**

- `Textarea` z limitem 1000 znaków
- `CharacterCounter` pokazujący "X/1000"
- `Button` "Add Comment"
- Stan dla treści komentarza
- Stan loading

**Obsługiwane interakcje:**

- Submit → wywołanie `POST /api/briefs/:id/comments` z `{ content }`
- Czyszczenie textarea po sukcesie

**Walidacja:**

- Treść wymagana (1-1000 znaków)
- Button disabled gdy pusty lub przekroczony limit lub loading

**Typy:**

- `CreateCommentCommand`

**Propsy:**

```typescript
interface CommentFormProps {
  briefId: string;
  onSubmit: (content: string) => Promise<void>;
}
```

---

### CharacterCounter (Client Component)

**Opis:** Licznik znaków wyświetlający aktualną liczbę znaków i limit.

**Główne elementy:**

- `span` z tekstem "X/1000"
- Warunkowa kolorystyka (np. red gdy przekroczony limit)

**Obsługiwane interakcje:** Brak

**Walidacja:** Brak (tylko wizualna informacja)

**Typy:** Brak

**Propsy:**

```typescript
interface CharacterCounterProps {
  current: number;
  max: number;
}
```

---

## 5. Typy

### Typy istniejące (z `src/types.ts`)

```typescript
// Brief Types
interface BriefDetailDto {
  id: string;
  ownerId: string;
  header: string;
  content: BriefEntity["content"]; // TipTap JSON
  footer: string | null;
  status: BriefStatus;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  commentCount: number;
  isOwned: boolean;
  createdAt: string;
  updatedAt: string;
}

type BriefStatus = "draft" | "sent" | "accepted" | "rejected" | "needs_modification";

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

### Nowe typy ViewModel (do utworzenia w `src/lib/types/brief-details.types.ts`)

```typescript
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

## 6. Zarządzanie stanem

### Strategia zarządzania stanem

Widok wykorzystuje hybrydowe podejście do zarządzania stanem:

1. **Server Component (BriefDetailsPage):** Initial data fetching (SSR)
2. **Client Components:** Local state management z React hooks
3. **No global state:** Każdy Client Component zarządza swoim stanem lokalnie
4. **No optimistic updates:** Wszystkie zmiany wymagają potwierdzenia z serwera

### Custom Hooks

#### `useBriefComments`

**Lokalizacja:** `src/components/hooks/useBriefComments.ts`

**Cel:** Zarządzanie stanem komentarzy z automatycznym odświeżaniem i paginacją.

```typescript
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
  pollingInterval = 30000,
}: UseBriefCommentsProps): UseBriefCommentsReturn {
  // State management
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [briefId, currentPage]);

  // Implementation methods...
}
```

#### `useBriefRecipients`

**Lokalizacja:** `src/components/hooks/useBriefRecipients.ts`

**Cel:** Zarządzanie stanem odbiorców briefu.

```typescript
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

export function useBriefRecipients({ briefId, initialRecipients }: UseBriefRecipientsProps): UseBriefRecipientsReturn {
  const [recipients, setRecipients] = useState(initialRecipients);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = recipients.length < 10;

  // Implementation methods...
}
```

#### `useBriefStatusChange`

**Lokalizacja:** `src/components/hooks/useBriefStatusChange.ts`

**Cel:** Zarządzanie zmianą statusu briefu przez odbiorcę.

```typescript
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

export function useBriefStatusChange({ briefId, onSuccess }: UseBriefStatusChangeProps): UseBriefStatusChangeReturn {
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Implementation methods...
}
```

## 7. Integracja API

### Endpoints wykorzystywane przez widok

#### 1. GET /api/briefs/:id

**Kiedy:** Initial page load (Server Component)

**Request:**

- Method: GET
- Headers: `Authorization: Bearer {token}` (development: mock)
- Path params: `id: string` (UUID)

**Response (200 OK):**

```typescript
BriefDetailDto;
```

**Response (403 Forbidden):**

```typescript
{
  error: "You don't have permission to view this brief";
}
```

**Response (404 Not Found):**

```typescript
{
  error: "Brief not found";
}
```

**Obsługa błędów:**

- 403 → Toast notification + przekierowanie do `/briefs`
- 404 → Next.js `notFound()` → `not-found.tsx`
- 500 → Error boundary → `error.tsx`

---

#### 2. PATCH /api/briefs/:id/status

**Kiedy:** Recipient actions (Accept/Reject/Needs Modification)

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
UpdateBriefStatusWithCommentResponseDto;
```

**Walidacja przed wysłaniem:**

- Status musi być jednym z: 'accepted', 'rejected', 'needs_modification'
- Komentarz wymagany dla 'needs_modification' (1-1000 znaków)

---

#### 3. DELETE /api/briefs/:id

**Kiedy:** Owner clicks Delete button in DeleteBriefDialog

**Request:**

- Method: DELETE
- Headers: `Authorization: Bearer {token}`
- Path params: `id: string` (UUID)

**Response (204 No Content):**

- Empty body

**Po sukcesie:**

- Toast: "Brief deleted successfully"
- Przekierowanie do `/briefs`

---

#### 4. GET /api/briefs/:id/recipients

**Kiedy:** Initial load (Server Component) + refresh w `useBriefRecipients`

**Request:**

- Method: GET
- Headers: `Authorization: Bearer {token}`
- Path params: `id: string` (UUID)

**Response (200 OK):**

```typescript
{ data: BriefRecipientDto[] }
```

---

#### 5. POST /api/briefs/:id/recipients

**Kiedy:** Owner adds new recipient w RecipientAddForm

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

**Response (409 Conflict):**

```typescript
{
  error: "User already has access to this brief";
}
```

**Response (403 Forbidden):**

```typescript
{
  error: "Maximum of 10 recipients per brief exceeded";
}
```

---

#### 6. DELETE /api/briefs/:id/recipients/:recipientId

**Kiedy:** Owner removes recipient access

**Request:**

- Method: DELETE
- Headers: `Authorization: Bearer {token}`
- Path params: `id: string`, `recipientId: string`

**Response (204 No Content):**

- Empty body

**Uwaga:** Usunięcie ostatniego odbiorcy resetuje status briefu do 'draft' (obsługiwane przez API)

---

#### 7. GET /api/briefs/:id/comments

**Kiedy:** Initial load + polling co 30s + manual refresh + pagination

**Request:**

- Method: GET
- Headers: `Authorization: Bearer {token}`
- Path params: `id: string` (UUID)
- Query params: `page?: number`, `limit?: number` (default: 50)

**Response (200 OK):**

```typescript
PaginatedResponse<CommentDto>;
```

---

#### 8. POST /api/briefs/:id/comments

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

**Walidacja przed wysłaniem:**

- Content wymagany (1-1000 znaków)
- Trimmed (usunięcie whitespace)

---

#### 9. DELETE /api/comments/:id

**Kiedy:** User deletes own comment

**Request:**

- Method: DELETE
- Headers: `Authorization: Bearer {token}`
- Path params: `id: string` (UUID)

**Response (204 No Content):**

- Empty body

**Uwaga:** Usunięcie bez potwierdzenia (zgodnie z US-013)

---

## 8. Interakcje użytkownika

### Właściciel briefu (isOwned === true)

1. **Edycja briefu**
   - Kliknięcie "Edit" → przekierowanie do `/briefs/[id]/edit`
   - Jeśli status !== 'draft' → wyświetlenie ostrzeżenia przed edycją

2. **Usunięcie briefu**
   - Kliknięcie "Delete" → otwarcie AlertDialog
   - Potwierdzenie → wywołanie `DELETE /api/briefs/:id`
   - Sukces → Toast + przekierowanie do `/briefs`

3. **Udostępnianie briefu**
   - Kliknięcie "Share" → otwarcie ShareBriefDialog
   - Wyświetlenie listy odbiorców
   - Dodanie odbiorcy: input email + "Add" → `POST /api/briefs/:id/recipients`
   - Usunięcie odbiorcy: Trash icon → `DELETE /api/briefs/:id/recipients/:recipientId` (bez potwierdzenia)

4. **Komentarze**
   - Dodanie komentarza: textarea + "Add Comment" → `POST /api/briefs/:id/comments`
   - Usunięcie własnego komentarza: Delete icon → `DELETE /api/comments/:id` (bez potwierdzenia)
   - Manual refresh: przycisk "Refresh"
   - Auto-refresh: co 30s w tle
   - Paginacja: zmiana strony → fetch nowej strony

---

### Odbiorca briefu (!isOwned && status === 'sent')

1. **Akceptacja briefu**
   - Kliknięcie "Accept" → `PATCH /api/briefs/:id/status` z `{ status: 'accepted' }`
   - Sukces → Toast + odświeżenie strony (status badge update)

2. **Odrzucenie briefu**
   - Kliknięcie "Reject" → `PATCH /api/briefs/:id/status` z `{ status: 'rejected' }`
   - Sukces → Toast + odświeżenie strony

3. **Zgłoszenie potrzeby modyfikacji**
   - Kliknięcie "Needs Modification" → otwarcie NeedsModificationDialog
   - Wymagany komentarz (1-1000 znaków)
   - Submit → `PATCH /api/briefs/:id/status` z `{ status: 'needs_modification', comment }`
   - Sukces → Toast + odświeżenie strony + komentarz dodany do listy

4. **Komentarze**
   - Takie same jak dla właściciela

---

### Wszyscy użytkownicy

1. **Przewijanie treści briefu**
   - Scroll w BriefContentRenderer (read-only TipTap)

2. **Kopiowanie tekstu**
   - Możliwość zaznaczenia i skopiowania treści briefu

3. **Responsywność**
   - Mobile-first design
   - Adaptacyjne layouty dla różnych rozdzielczości

---

## 9. Warunki i walidacja

### Warunki renderowania komponentów

#### BriefHeader

- Zawsze renderowany

#### OwnerActions

- **Warunek:** `isOwned === true`
- **Komponenty:** Edit, Delete, Share buttons

#### RecipientActions

- **Warunek:** `!isOwned && status === 'sent'`
- **Komponenty:** Accept, Reject, Needs Modification buttons
- **Uwaga:** Przyciski nie są widoczne gdy:
  - Brief w statusie 'draft', 'accepted', 'rejected', 'needs_modification'
  - Użytkownik jest właścicielem

#### BriefFooterSection

- **Warunek:** `footer !== null && footer !== ''`

#### BriefRecipientsSection

- **Warunek:** `isOwned === true`
- **Uwaga:** Widoczne tylko dla właściciela

#### CommentItem Delete Button

- **Warunek:** `comment.isOwn === true`
- **Uwaga:** Tylko autor może usunąć swój komentarz

---

### Walidacja formularzy

#### RecipientAddForm

- **Email:**
  - Wymagany
  - Poprawny format email (HTML5 validation)
  - Nie może być pusty
- **Limit:**
  - Aktualnych odbiorców < 10
  - Button disabled gdy `recipients.length >= 10`

#### CommentForm

- **Content:**
  - Wymagany
  - Trimmed (usunięcie whitespace na początku i końcu)
  - Min: 1 znak
  - Max: 1000 znaków
  - Button disabled gdy pusty lub przekroczony limit

#### NeedsModificationDialog

- **Comment:**
  - Wymagany
  - Trimmed
  - Min: 1 znak
  - Max: 1000 znaków
  - Submit disabled gdy pusty lub przekroczony limit

---

### Warunki API

#### PATCH /api/briefs/:id/status

- **Pre-conditions:**
  - Użytkownik musi być odbiorcą (nie właścicielem)
  - Brief musi być w statusie 'sent'
  - Dla 'needs_modification': wymagany komentarz (1-1000 znaków)
- **Post-conditions:**
  - Status zmieniony
  - Dla 'needs_modification': komentarz dodany do listy
  - `statusChangedAt` i `statusChangedBy` zaktualizowane

#### POST /api/briefs/:id/recipients

- **Pre-conditions:**
  - Użytkownik musi być właścicielem
  - Email musi być w systemie
  - Aktualnych odbiorców < 10
  - Użytkownik nie ma już dostępu
- **Post-conditions:**
  - Odbiorca dodany
  - Jeśli status był 'draft' → zmieniony na 'sent'

#### DELETE /api/briefs/:id/recipients/:recipientId

- **Pre-conditions:**
  - Użytkownik musi być właścicielem
  - Odbiorca musi istnieć
- **Post-conditions:**
  - Odbiorca usunięty
  - Jeśli to był ostatni odbiorca → status zmieniony na 'draft'

---

## 10. Obsługa błędów

### Strategie obsługi błędów

#### Server Component (BriefDetailsPage)

**403 Forbidden:**

- Przekierowanie do `/briefs` z Toast notification
- Implementacja: `redirect('/briefs')` + query param dla toast

**404 Not Found:**

- Wywołanie Next.js `notFound()` function
- Renderowanie `not-found.tsx` w tym samym segmencie

**500 Internal Server Error:**

- Error boundary → renderowanie `error.tsx`
- Możliwość retry

---

#### Client Components

**Network errors:**

- Wyświetlenie Toast notification z komunikatem błędu
- Zachowanie poprzedniego stanu (no optimistic updates)
- Możliwość retry (np. przycisk "Try Again")

**Validation errors (400):**

- Wyświetlenie szczegółowych błędów walidacji pod odpowiednimi polami
- Format: `details[].field` + `details[].message`

**Authorization errors (403):**

- Toast notification: "You don't have permission to perform this action"
- Opcjonalne przekierowanie do listy briefów

**Conflict errors (409):**

- Toast notification z opisem konfliktu
- Np. "User already has access to this brief"

---

### Scenariusze błędów i obsługa

#### RecipientAddForm

**Email nie istnieje (400):**

```typescript
Toast: "User with email 'client@example.com' not found";
```

**Limit odbiorców przekroczony (403):**

```typescript
Toast: "Maximum of 10 recipients per brief exceeded"
Button disabled gdy recipients.length >= 10
```

**Odbiorca już dodany (409):**

```typescript
Toast: "User already has access to this brief";
```

---

#### CommentForm

**Błąd walidacji (400):**

```typescript
Toast: "Comment must be between 1 and 1000 characters";
```

**Brak dostępu (403):**

```typescript
Toast: "You do not have access to this brief"
Redirect: /briefs
```

---

#### RecipientActions (Accept/Reject/Needs Modification)

**Brief nie w statusie 'sent' (403):**

```typescript
Toast: "This brief is not available for review"
Buttons hidden (conditional rendering)
```

**Użytkownik jest właścicielem (403):**

```typescript
Toast: "Only recipients can change brief status"
Buttons hidden (conditional rendering)
```

**Próba zmiany z 'accepted' (403):**

```typescript
Toast: "Cannot change status of accepted brief"
Buttons hidden (conditional rendering)
```

---

#### DeleteBriefDialog

**Użytkownik nie jest właścicielem (403):**

```typescript
Toast: "Only the brief owner can delete the brief";
```

**Brief nie istnieje (404):**

```typescript
Toast: "Brief not found"
Redirect: /briefs
```

---

#### Auto-refresh komentarzy

**Błąd podczas polling:**

- Silent fail (nie wyświetlaj toast przy każdym błędzie)
- Logowanie do console.error
- Kontynuacja polling (retry następny interval)

---

### Loading states

**Przyciski akcji:**

- Disabled state podczas request
- Loading spinner w przycisku
- Tekst zmieniony na "Loading..."

**Formularze:**

- Disabled inputs podczas submit
- Loading spinner w przycisku submit

**Paginacja komentarzy:**

- Skeleton loader dla listy komentarzy
- Disabled pagination controls

**Refresh komentarzy:**

- Loading spinner w przycisku "Refresh"
- Disabled podczas request

---

## 11. Kroki implementacji

### Faza 1: Infrastruktura i typy (1-2h)

1. Utworzenie struktury katalogów:

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
   ```

2. Utworzenie pliku z typami ViewModel:

   ```typescript
   // src/lib/types/brief-details.types.ts
   ```

3. Instalacja dodatkowych pakiet (jeśli potrzebne):
   ```bash
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-typography
   npm install date-fns # dla formatowania dat
   ```

---

### Faza 2: Komponenty atomowe (2-3h)

4. Implementacja `BriefStatusBadge`:
   - Mapping statusu na warianty Badge
   - Mapping statusu na teksty wyświetlane
   - Testy różnych statusów

5. Implementacja `CharacterCounter`:
   - Wyświetlanie "X/MAX"
   - Kolorystyka (warning gdy blisko limitu, error gdy przekroczony)

6. Implementacja `RecipientLimitIndicator`:
   - Wyświetlanie "X/10 recipients"
   - Kolorystyka zależna od progu

7. Implementacja `BriefContentRenderer`:
   - Konfiguracja TipTap w trybie read-only
   - Dozwolone rozszerzenia zgodnie z tech stack
   - Tailwind Typography styling (prose, dark:prose-invert)
   - Testy renderowania różnych struktur JSON

---

### Faza 3: Custom Hooks (3-4h)

8. Implementacja `useBriefComments`:
   - State management (data, loading, error)
   - Auto-refresh co 30s (useEffect + interval)
   - Manual refresh function
   - Pagination (changePage)
   - Add comment (POST /api/briefs/:id/comments)
   - Delete comment (DELETE /api/comments/:id)
   - Error handling z toast notifications

9. Implementacja `useBriefRecipients`:
   - State management (recipients, loading, error)
   - Refresh function (GET /api/briefs/:id/recipients)
   - Add recipient (POST /api/briefs/:id/recipients)
   - Remove recipient (DELETE /api/briefs/:id/recipients/:recipientId)
   - canAddMore computed value
   - Error handling

10. Implementacja `useBriefStatusChange`:
    - State management (isChanging, error)
    - acceptBrief function
    - rejectBrief function
    - requestModification function
    - Error handling z toast notifications
    - Callback onSuccess dla refresh

---

### Faza 4: Komponenty formularzy i dialogów (3-4h)

11. Implementacja `CommentForm`:
    - Textarea z controlled state
    - CharacterCounter integration
    - Submit handler z walidacją (1-1000 chars)
    - Loading state
    - Clear textarea po sukcesie

12. Implementacja `RecipientAddForm`:
    - Email input z HTML5 validation
    - Submit handler z walidacją
    - Loading state
    - Disabled gdy limit reached

13. Implementacja `DeleteBriefDialog`:
    - AlertDialog z potwierdzeniem
    - Komunikat: "Are you sure? This will delete all comments and cannot be undone."
    - Delete handler (DELETE /api/briefs/:id)
    - Redirect po sukcesie
    - Error handling

14. Implementacja `ShareBriefDialog`:
    - Dialog z listą odbiorców i formularzem
    - Integration z RecipientTable i RecipientAddForm
    - useBriefRecipients hook
    - Refresh po zmianach

15. Implementacja `NeedsModificationDialog`:
    - Dialog dwuetapowy (info + form)
    - Textarea dla komentarza
    - CharacterCounter
    - Submit handler z walidacją
    - useBriefStatusChange hook

---

### Faza 5: Komponenty listowe (2-3h)

16. Implementacja `CommentItem`:
    - Layout z author info, role badge, content, date
    - Conditional delete button (isOwn)
    - Delete handler bez potwierdzenia
    - Date formatting (relative time)

17. Implementacja `CommentList`:
    - Map przez comments array
    - Empty state ("No comments yet")
    - onDelete callback propagation

18. Implementacja `RecipientTable`:
    - Table z kolumnami: Email, Shared At, Actions
    - Trash icon dla każdego wiersza
    - onRemove callback
    - Empty state gdy brak odbiorców

---

### Faza 6: Komponenty akcji (2-3h)

19. Implementacja `OwnerActions`:
    - Edit button → useRouter().push('/briefs/[id]/edit')
    - DeleteBriefDialog trigger
    - ShareBriefDialog trigger
    - Layout (flex row, gap)

20. Implementacja `RecipientActions`:
    - Accept button → useBriefStatusChange.acceptBrief()
    - Reject button → useBriefStatusChange.rejectBrief()
    - NeedsModificationDialog trigger
    - Loading states
    - Conditional rendering (status === 'sent')

21. Implementacja `BriefActionButtons`:
    - Wrapper komponent
    - Conditional rendering:
      - OwnerActions gdy isOwned === true
      - RecipientActions gdy !isOwned && status === 'sent'

---

### Faza 7: Komponenty sekcyjne (3-4h)

22. Implementacja `BriefHeader`:
    - Card layout
    - h1 z header text
    - Status badge + updated date
    - BriefActionButtons integration
    - Responsive design

23. Implementacja `BriefRecipientsSection`:
    - Conditional rendering (tylko gdy isOwned)
    - Card z h2 "Recipients"
    - RecipientLimitIndicator
    - RecipientTable
    - RecipientAddForm
    - useBriefRecipients hook integration

24. Implementacja `BriefCommentsSection`:
    - Card z h2 "Comments"
    - Refresh button (manual)
    - CommentList
    - Pagination component (Shadcn/ui)
    - CommentForm
    - useBriefComments hook integration
    - Auto-refresh (polling co 30s)

---

### Faza 8: Główny komponent strony (2-3h)

25. Implementacja `BriefDetailsPage` (Server Component):
    - Async component function
    - Await params (Next.js 15)
    - Fetch brief data: `GET /api/briefs/:id`
    - Error handling:
      - 403 → redirect('/briefs') z toast
      - 404 → notFound()
      - 500 → throw error (caught by error.tsx)
    - Przekazanie danych do komponentów

26. Implementacja `BriefFooterSection`:
    - Conditional rendering (footer !== null)
    - Card z text-muted-foreground

27. Implementacja `BriefContentSection`:
    - Card wrapper
    - BriefContentRenderer integration

---

### Faza 9: Error boundaries i edge cases (2h)

28. Implementacja `not-found.tsx`:
    - Custom 404 page dla /briefs/[id]
    - Link "Back to Briefs"

29. Implementacja `error.tsx`:
    - Error boundary z retry button
    - Wyświetlenie komunikatu błędu

30. Edge cases testing:
    - Brief bez komentarzy
    - Brief bez odbiorców
    - Brief bez stopki
    - Puste strony paginacji
    - Network errors podczas polling
    - Concurrent requests

---

### Faza 10: Styling i responsywność (2-3h)

31. Responsive layout:
    - Mobile-first approach
    - Breakpoints dla tablet i desktop
    - Stack layout na mobile, grid na desktop

32. Dark mode support:
    - Wszystkie komponenty wspierają dark mode
    - Tailwind dark: prefix

33. Accessibility (ARIA):
    - Heading hierarchy (h1, h2)
    - ARIA labels dla buttons
    - Focus management po akcjach
    - Keyboard navigation

34. Typography:
    - Tailwind Typography dla BriefContentRenderer
    - Consistent font sizes i weights

---

### Faza 11: Testing i optymalizacja (3-4h)

35. Manual testing:
    - Wszystkie user stories (US-005, US-007, US-008, US-009, US-010, US-011, US-012, US-013, US-014, US-017)
    - Owner flows
    - Recipient flows
    - Error scenarios

36. Performance optimization:
    - Lazy loading dialogów (React.lazy)
    - Memoization komponentów (React.memo)
    - useCallback dla event handlers
    - Debounce dla character counter

37. Code review:
    - Zgodność z ESLint rules
    - Accessibility check
    - TypeScript strict mode
    - No console.log w produkcji

---

### Faza 12: Dokumentacja i finalizacja (1h)

38. Dodanie komentarzy w kodzie:
    - JSDoc dla komponentów
    - Wyjaśnienie złożonej logiki

39. Update README:
    - Dodanie opisu widoku
    - Instrukcje developmentowe

40. Final testing:
    - Smoke test całego flow
    - Cross-browser testing (Chrome, Firefox, Safari)
    - Mobile testing (iOS, Android)

---

## Podsumowanie

**Szacowany czas implementacji:** 30-40 godzin

**Priorytet komponentów:**

1. **Krytyczne:** BriefDetailsPage, BriefHeader, BriefContentRenderer, BriefStatusBadge
2. **Wysokie:** CommentList, CommentForm, useBriefComments
3. **Średnie:** RecipientActions, OwnerActions, dialogi
4. **Niskie:** Styling, edge cases, optymalizacja

**Kolejność implementacji:**

1. Typy i infrastructure
2. Atomic components
3. Custom hooks
4. Form components
5. Section components
6. Main page component
7. Error handling
8. Styling i accessibility
9. Testing
10. Documentation

**Kluczowe wyzwania:**

- TipTap read-only configuration
- Polling mechanism z cleanup
- Warunkowe renderowanie (isOwned, status)
- Error handling bez optimistic updates
- Server/Client Components separation
