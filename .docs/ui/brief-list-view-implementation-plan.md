# Plan implementacji widoku Lista briefów (`/briefs`)

## 1. Przegląd

Widok listy briefów jest głównym widokiem aplikacji B2Proof dla zalogowanych użytkowników. Wyświetla paginowaną listę briefów użytkownika (własnych i udostępnionych mu) z możliwością filtrowania według właściciela i statusu. Widok obsługuje dwa typy użytkowników - creatorów (którzy mogą tworzyć nowe briefy) i klientów (którzy mogą tylko przeglądać udostępnione im briefy). Kluczowe funkcjonalności obejmują:

- Wyświetlanie licznika briefów dla creatorów (np. "15/20")
- Ostrzeżenie o zbliżającym się limicie briefów
- Responsywny grid z kartami briefów
- Filtrowanie według własności (owned/shared) i statusu
- Server-side pagination z deep linking przez URL params
- Nawigacja do szczegółów briefu przez kliknięcie karty

## 2. Routing widoku

**Ścieżka:** `/briefs`

**Struktura plików:**
```
src/app/(dashboard)/
├── layout.tsx                 # Layout dashboardu z nawigacją
└── briefs/
    ├── page.tsx               # Główna strona listy briefów (Server Component)
    ├── loading.tsx            # Skeleton loading state
    └── error.tsx              # Error boundary z retry
```

**Parametry URL (searchParams):**
- `page` - numer strony (domyślnie: 1)
- `filter` - filtr własności: `"owned"` | `"shared"` (opcjonalnie)
- `status` - filtr statusu: `"draft"` | `"sent"` | `"accepted"` | `"rejected"` | `"needs_modification"` (opcjonalnie)

**Przykłady URL:**
- `/briefs` - wszystkie briefy, strona 1
- `/briefs?page=2&filter=owned` - własne briefy, strona 2
- `/briefs?filter=shared&status=sent` - udostępnione briefy ze statusem "sent"

## 3. Struktura komponentów

```
BriefsPage (Server Component)
├── BriefListHeader
│   ├── Tytuł "Briefs"
│   ├── BriefCountBadge (tylko creator)
│   └── NewBriefButton (tylko creator, disabled gdy limit)
├── BriefLimitAlert (warunkowy, gdy count ≥ 18)
├── BriefFilters (Client Component)
│   ├── Tabs (All / Owned / Shared)
│   └── StatusSelect
├── Suspense boundary
│   └── BriefListContent
│       ├── BriefList | BriefEmptyState
│       │   └── BriefCard[] (jako Link)
│       │       ├── Header (truncated)
│       │       ├── BriefStatusBadge
│       │       ├── CommentCount (ikona + liczba)
│       │       ├── UpdatedTimestamp (relative time)
│       │       └── OwnershipBadge
│       └── BriefPagination
└── Loading fallback: BriefListSkeleton
```

## 4. Szczegóły komponentów

### 4.1 BriefsPage

**Opis:** Główny Server Component strony listy briefów. Pobiera dane z API, parsuje searchParams i renderuje hierarchię komponentów.

**Główne elementy:**
- Wrapper `<main>` z responsywnym paddingiem
- Wywołanie fetch do `/api/briefs` z query params
- Warunkowe renderowanie alertu limitu
- Suspense boundary dla listy

**Obsługiwane interakcje:**
- Brak bezpośrednich interakcji (Server Component)

**Obsługiwana walidacja:**
- Walidacja searchParams przed wywołaniem API (fallback do wartości domyślnych)

**Typy:**
- `BriefsPageProps` - props z searchParams
- `PaginatedResponse<BriefListItemDto>` - odpowiedź API
- `UserProfileDto` - profil użytkownika (dla licznika briefów)

**Propsy:**
```typescript
interface BriefsPageProps {
  searchParams: Promise<{
    page?: string;
    filter?: string;
    status?: string;
  }>;
}
```

---

### 4.2 BriefListHeader

**Opis:** Nagłówek strony zawierający tytuł, badge z licznikiem briefów (dla creatorów) oraz przycisk tworzenia nowego briefu.

**Główne elementy:**
- `<div>` jako flex container z justify-between
- `<h1>` z tekstem "Briefs"
- `Badge` z licznikiem (np. "15/20") - warunkowy dla creatorów
- `Button` "New Brief" z ikoną Plus - warunkowy dla creatorów

**Obsługiwane interakcje:**
- Kliknięcie "New Brief" → nawigacja do `/briefs/new`

**Obsługiwana walidacja:**
- Brak walidacji wewnątrz komponentu

**Typy:**
- `UserRole` - rola użytkownika ('creator' | 'client')

**Propsy:**
```typescript
interface BriefListHeaderProps {
  userRole: UserRole;
  briefCount: number;
  maxBriefs: number; // 20
  isLimitReached: boolean;
}
```

---

### 4.3 BriefLimitAlert

**Opis:** Komponent alertu wyświetlany gdy użytkownik (creator) zbliża się do limitu briefów (≥18).

**Główne elementy:**
- `Alert` (shadcn/ui) z wariantem "warning"
- `AlertTriangle` ikona
- `AlertTitle` - "Brief limit warning"
- `AlertDescription` - tekst informacyjny

**Obsługiwane interakcje:**
- Brak

**Obsługiwana walidacja:**
- Brak (logika wyświetlania w komponencie rodzica)

**Typy:**
- Brak dodatkowych typów

**Propsy:**
```typescript
interface BriefLimitAlertProps {
  currentCount: number;
  maxCount: number;
}
```

---

### 4.4 BriefFilters

**Opis:** Client Component zarządzający filtrami listy briefów. Synchronizuje stan z URL searchParams.

**Główne elementy:**
- `<div>` jako flex container
- `Tabs` (shadcn/ui) dla filtra owned/shared z trzema opcjami: "All", "Owned", "Shared"
- `Select` (shadcn/ui) dla filtra statusu z opcjami: "All statuses", "Draft", "Sent", "Accepted", "Rejected", "Needs Modification"

**Obsługiwane interakcje:**
- Zmiana zakładki (Tab) → aktualizacja URL param `filter`
- Zmiana statusu (Select) → aktualizacja URL param `status`
- Obie zmiany resetują `page` do 1

**Obsługiwana walidacja:**
- Walidacja wartości filter: tylko 'owned' | 'shared' | undefined
- Walidacja wartości status: tylko valid BriefStatus | undefined

**Typy:**
- `BriefStatus` - enum statusów
- `BriefFilterState` - stan filtrów

**Propsy:**
```typescript
interface BriefFiltersProps {
  currentFilter?: 'owned' | 'shared';
  currentStatus?: BriefStatus;
}
```

---

### 4.5 BriefList

**Opis:** Responsywny grid wyświetlający karty briefów.

**Główne elementy:**
- `<div>` z klasami grid responsywnymi:
  - `grid-cols-1` (mobile)
  - `md:grid-cols-2` (tablet)
  - `lg:grid-cols-3` (desktop)
- `gap-4` dla odstępów między kartami
- Mapowanie briefów na komponenty `BriefCard`

**Obsługiwane interakcje:**
- Brak bezpośrednich (delegowane do BriefCard)

**Obsługiwana walidacja:**
- Brak

**Typy:**
- `BriefListItemDto[]` - tablica briefów

**Propsy:**
```typescript
interface BriefListProps {
  briefs: BriefListItemDto[];
}
```

---

### 4.6 BriefCard

**Opis:** Karta pojedynczego briefu wyświetlająca kluczowe informacje. Cały komponent jest klikalny i prowadzi do szczegółów briefu.

**Główne elementy:**
- `Link` (next/link) opakowujący całą kartę → `/briefs/[id]`
- `Card` (shadcn/ui) jako kontener
- `CardHeader` z:
  - Header briefu (truncated do 2 linii)
  - `OwnershipBadge` ("My Brief" lub "Shared with me")
- `CardContent` z:
  - `BriefStatusBadge`
  - Kontener z metadanymi:
    - `MessageSquare` ikona + `commentCount`
    - Relative timestamp (`updatedAt`)

**Obsługiwane interakcje:**
- Kliknięcie karty → nawigacja do `/briefs/[id]`
- Focus visible dla dostępności klawiatury

**Obsługiwana walidacja:**
- Brak

**Typy:**
- `BriefListItemDto` - dane briefu

**Propsy:**
```typescript
interface BriefCardProps {
  brief: BriefListItemDto;
}
```

---

### 4.7 BriefStatusBadge

**Opis:** Reużywalny komponent badge wyświetlający status briefu z odpowiednią ikoną i kolorem.

**Główne elementy:**
- `Badge` (shadcn/ui) z wariantem zależnym od statusu
- Ikona Lucide zależna od statusu
- Tekst labela statusu

**Konfiguracja statusów:**
| Status | Variant | Ikona | Label |
|--------|---------|-------|-------|
| draft | secondary | FileEdit | Draft |
| sent | default | Send | Sent |
| accepted | success | CheckCircle2 | Accepted |
| rejected | destructive | XCircle | Rejected |
| needs_modification | warning | AlertCircle | Needs Modification |

**Obsługiwane interakcje:**
- Brak

**Obsługiwana walidacja:**
- Brak

**Typy:**
- `BriefStatus` - enum statusów

**Propsy:**
```typescript
interface BriefStatusBadgeProps {
  status: BriefStatus;
  className?: string;
}
```

---

### 4.8 OwnershipBadge

**Opis:** Badge wyświetlający informację o właścicielu briefu.

**Główne elementy:**
- `Badge` (shadcn/ui) z wariantem outline
- Tekst: "My Brief" (gdy `isOwned === true`) lub "Shared with me" (gdy `isOwned === false`)

**Obsługiwane interakcje:**
- Brak

**Obsługiwana walidacja:**
- Brak

**Typy:**
- Brak dodatkowych typów

**Propsy:**
```typescript
interface OwnershipBadgeProps {
  isOwned: boolean;
}
```

---

### 4.9 BriefPagination

**Opis:** Komponent paginacji synchronizujący się z URL params. Używa server-side pagination.

**Główne elementy:**
- `Pagination` (shadcn/ui) z:
  - `PaginationPrevious` - link do poprzedniej strony
  - `PaginationContent` z numerami stron
  - `PaginationNext` - link do następnej strony
- Każdy element jako `Link` z zachowaniem innych query params

**Obsługiwane interakcje:**
- Kliknięcie numeru strony → aktualizacja URL param `page`
- Kliknięcie Previous/Next → zmiana strony

**Obsługiwana walidacja:**
- Wyłączenie Previous gdy `page === 1`
- Wyłączenie Next gdy `page === totalPages`

**Typy:**
- `PaginationMetadata` - metadane paginacji

**Propsy:**
```typescript
interface BriefPaginationProps {
  pagination: PaginationMetadata;
  currentFilter?: string;
  currentStatus?: string;
}
```

---

### 4.10 BriefEmptyState

**Opis:** Komponent wyświetlany gdy lista briefów jest pusta. Różne warianty dla creatorów i klientów.

**Główne elementy:**
- `<div>` wycentrowany z padding
- Ikona (FileText z lucide-react)
- Tytuł (`<h3>`)
- Opis (`<p>`)
- Opcjonalny przycisk akcji (tylko dla creatorów)

**Warianty:**
1. **Creator bez briefów:**
   - Tytuł: "No briefs yet"
   - Opis: "Create your first brief to get started"
   - Akcja: Button "Create Brief" → `/briefs/new`

2. **Client bez briefów:**
   - Tytuł: "No shared briefs"
   - Opis: "Briefs shared with you will appear here"
   - Brak akcji

3. **Brak wyników filtrowania:**
   - Tytuł: "No briefs found"
   - Opis: "Try adjusting your filters"
   - Brak akcji

**Obsługiwane interakcje:**
- Kliknięcie "Create Brief" → nawigacja do `/briefs/new`

**Obsługiwana walidacja:**
- Brak

**Typy:**
- `UserRole` - rola użytkownika

**Propsy:**
```typescript
interface BriefEmptyStateProps {
  userRole: UserRole;
  hasFilters: boolean;
}
```

---

### 4.11 BriefListSkeleton

**Opis:** Skeleton loading state wyświetlany podczas ładowania listy briefów.

**Główne elementy:**
- Grid identyczny jak `BriefList`
- 6 skeleton cards (2 rzędy po 3 na desktop)
- Każda karta skeleton z:
  - Skeleton dla nagłówka
  - Skeleton dla badge'a
  - Skeleton dla metadanych

**Obsługiwane interakcje:**
- Brak

**Obsługiwana walidacja:**
- Brak

**Typy:**
- Brak

**Propsy:**
```typescript
interface BriefListSkeletonProps {
  count?: number; // domyślnie 6
}
```

## 5. Typy

### 5.1 Istniejące typy (z `src/types.ts`)

```typescript
// DTO briefu na liście
interface BriefListItemDto {
  id: string;
  ownerId: string;
  header: string;
  footer: string | null;
  status: BriefStatus;
  commentCount: number;
  isOwned: boolean;
  createdAt: string;
  updatedAt: string;
}

// Metadane paginacji
interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Odpowiedź paginowana
interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

// Parametry zapytania
interface BriefQueryParams {
  page?: number;
  limit?: number;
  filter?: 'owned' | 'shared';
  status?: BriefStatus;
}

// Status briefu
type BriefStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'needs_modification';

// Rola użytkownika
type UserRole = 'creator' | 'client';

// Profil użytkownika
interface UserProfileDto {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// Odpowiedź błędu
interface ErrorResponse {
  error: string;
  details?: ValidationErrorDetail[];
}
```

### 5.2 Nowe typy ViewModel

```typescript
// Props strony briefów
interface BriefsPageProps {
  searchParams: Promise<{
    page?: string;
    filter?: string;
    status?: string;
  }>;
}

// Sparsowane parametry zapytania
interface ParsedBriefQueryParams {
  page: number;
  filter?: 'owned' | 'shared';
  status?: BriefStatus;
}

// Konfiguracja badge'a statusu
interface StatusBadgeConfig {
  variant: 'secondary' | 'default' | 'success' | 'destructive' | 'warning';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

// Mapa konfiguracji statusów
type StatusConfigMap = Record<BriefStatus, StatusBadgeConfig>;

// Stan filtrów (dla Client Component)
interface BriefFilterState {
  filter: 'all' | 'owned' | 'shared';
  status: BriefStatus | 'all';
}

// Dane kontekstowe dla widoku
interface BriefListViewData {
  briefs: BriefListItemDto[];
  pagination: PaginationMetadata;
  userRole: UserRole;
  briefCount: number;
  maxBriefs: number;
}
```

### 5.3 Mapa konfiguracji statusów

```typescript
// src/lib/constants/brief-status.ts
import { FileEdit, Send, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const BRIEF_STATUS_CONFIG: StatusConfigMap = {
  draft: {
    variant: 'secondary',
    icon: FileEdit,
    label: 'Draft',
  },
  sent: {
    variant: 'default',
    icon: Send,
    label: 'Sent',
  },
  accepted: {
    variant: 'success',
    icon: CheckCircle2,
    label: 'Accepted',
  },
  rejected: {
    variant: 'destructive',
    icon: XCircle,
    label: 'Rejected',
  },
  needs_modification: {
    variant: 'warning',
    icon: AlertCircle,
    label: 'Needs Modification',
  },
};

export const MAX_BRIEFS_PER_USER = 20;
export const BRIEF_LIMIT_WARNING_THRESHOLD = 18;
export const BRIEFS_PER_PAGE = 10;
```

## 6. Zarządzanie stanem

### 6.1 Server-side state

Widok wykorzystuje Server Components jako domyślne podejście. Stan jest zarządzany przez:

1. **URL searchParams** - źródło prawdy dla:
   - Numeru strony (`page`)
   - Filtra własności (`filter`)
   - Filtra statusu (`status`)

2. **Server fetch** - dane pobierane w Server Component:
   - Lista briefów z paginacją
   - Profil użytkownika (dla roli i licznika)

### 6.2 Client-side state (BriefFilters)

```typescript
// src/components/briefs/BriefFilters.tsx
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export function useBriefFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilters = useCallback(
    (updates: { filter?: string | null; status?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Reset page to 1 when filters change
      params.set('page', '1');

      if (updates.filter !== undefined) {
        if (updates.filter === null || updates.filter === 'all') {
          params.delete('filter');
        } else {
          params.set('filter', updates.filter);
        }
      }

      if (updates.status !== undefined) {
        if (updates.status === null || updates.status === 'all') {
          params.delete('status');
        } else {
          params.set('status', updates.status);
        }
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return {
    currentFilter: searchParams.get('filter') as 'owned' | 'shared' | null,
    currentStatus: searchParams.get('status') as BriefStatus | null,
    updateFilters,
  };
}
```

### 6.3 Brak potrzeby custom hooka dla całego widoku

Ponieważ widok jest Server Component z URL-based state management, nie ma potrzeby tworzenia dedykowanego hooka dla zarządzania stanem listy. Hook `useBriefFilters` wystarcza dla interaktywnej części (filtrów).

## 7. Integracja API

### 7.1 Endpoint: GET /api/briefs

**Request:**
```typescript
// Parametry query
interface BriefQueryParams {
  page?: number;      // default: 1
  limit?: number;     // default: 10, max: 50
  filter?: 'owned' | 'shared';
  status?: BriefStatus;
}
```

**Response (200 OK):**
```typescript
interface PaginatedResponse<BriefListItemDto> {
  data: BriefListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Błędy:**
- `400 Bad Request` - nieprawidłowe parametry query
- `401 Unauthorized` - brak autoryzacji (gdy auth będzie zaimplementowane)
- `500 Internal Server Error` - błąd serwera

### 7.2 Fetch w Server Component

```typescript
// src/app/(dashboard)/briefs/page.tsx
async function fetchBriefs(params: ParsedBriefQueryParams): Promise<PaginatedResponse<BriefListItemDto>> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(params.page));
  searchParams.set('limit', String(BRIEFS_PER_PAGE));

  if (params.filter) {
    searchParams.set('filter', params.filter);
  }
  if (params.status) {
    searchParams.set('status', params.status);
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/briefs?${searchParams.toString()}`,
    {
      cache: 'no-store', // Zawsze świeże dane
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch briefs');
  }

  return response.json();
}
```

### 7.3 Pobieranie licznika briefów (dla creatorów)

Licznik briefów jest dostępny z odpowiedzi API (`pagination.total`), ale tylko dla briefów należących do użytkownika (filtr `owned`). Dla pełnej liczby własnych briefów należy wykonać dodatkowe zapytanie lub użyć wartości z kontekstu użytkownika.

**Opcja 1:** Dedykowane zapytanie o liczbę briefów
```typescript
async function fetchOwnedBriefCount(): Promise<number> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/briefs?filter=owned&limit=1`,
    { cache: 'no-store' }
  );
  const data = await response.json();
  return data.pagination.total;
}
```

**Opcja 2:** Endpoint profilu użytkownika z licznikiem (zalecane dla MVP)
- Wymaga rozszerzenia `UserProfileDto` o `briefCount`

## 8. Interakcje użytkownika

| Interakcja | Element | Akcja | Rezultat |
|------------|---------|-------|----------|
| Kliknięcie karty briefu | `BriefCard` | `Link` nawigacja | Przekierowanie do `/briefs/[id]` |
| Zmiana zakładki filtra | `Tabs` w `BriefFilters` | `router.push()` z nowym `filter` | URL update, refetch danych |
| Zmiana filtra statusu | `Select` w `BriefFilters` | `router.push()` z nowym `status` | URL update, refetch danych |
| Kliknięcie numeru strony | `PaginationItem` | `Link` nawigacja | URL update z nowym `page` |
| Kliknięcie Previous/Next | `PaginationPrevious/Next` | `Link` nawigacja | URL update z `page ± 1` |
| Kliknięcie "New Brief" | `Button` w `BriefListHeader` | `Link` nawigacja | Przekierowanie do `/briefs/new` |
| Kliknięcie "Create Brief" | `Button` w `BriefEmptyState` | `Link` nawigacja | Przekierowanie do `/briefs/new` |

## 9. Warunki i walidacja

### 9.1 Walidacja parametrów URL

| Parametr | Walidacja | Fallback |
|----------|-----------|----------|
| `page` | Liczba całkowita ≥ 1 | `1` |
| `filter` | `'owned'` \| `'shared'` | `undefined` (wszystkie) |
| `status` | Valid `BriefStatus` | `undefined` (wszystkie) |

```typescript
function parseSearchParams(searchParams: Record<string, string | undefined>): ParsedBriefQueryParams {
  const page = parseInt(searchParams.page || '1', 10);
  const filter = ['owned', 'shared'].includes(searchParams.filter || '')
    ? searchParams.filter as 'owned' | 'shared'
    : undefined;
  const status = ['draft', 'sent', 'accepted', 'rejected', 'needs_modification'].includes(searchParams.status || '')
    ? searchParams.status as BriefStatus
    : undefined;

  return {
    page: isNaN(page) || page < 1 ? 1 : page,
    filter,
    status,
  };
}
```

### 9.2 Warunki wyświetlania komponentów

| Komponent | Warunek wyświetlania |
|-----------|---------------------|
| `BriefCountBadge` | `userRole === 'creator'` |
| `NewBriefButton` | `userRole === 'creator'` |
| `NewBriefButton` (disabled) | `briefCount >= MAX_BRIEFS_PER_USER` |
| `BriefLimitAlert` | `userRole === 'creator' && briefCount >= BRIEF_LIMIT_WARNING_THRESHOLD` |
| `BriefEmptyState` | `briefs.length === 0` |
| `BriefList` | `briefs.length > 0` |
| `BriefPagination` | `pagination.totalPages > 1` |
| `PaginationPrevious` (disabled) | `pagination.page === 1` |
| `PaginationNext` (disabled) | `pagination.page === pagination.totalPages` |

### 9.3 Warunki dla BriefEmptyState

```typescript
function getEmptyStateVariant(
  userRole: UserRole,
  hasFilters: boolean
): 'no-briefs-creator' | 'no-briefs-client' | 'no-results' {
  if (hasFilters) {
    return 'no-results';
  }
  return userRole === 'creator' ? 'no-briefs-creator' : 'no-briefs-client';
}
```

## 10. Obsługa błędów

### 10.1 Błędy na poziomie strony

| Kod | Obsługa | Komponent |
|-----|---------|-----------|
| 401 | Redirect do `/login` | Middleware |
| 500 | Error boundary z retry | `error.tsx` |

### 10.2 error.tsx

```typescript
// src/app/(dashboard)/briefs/error.tsx
'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function BriefsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Uwaga: Nie logujemy błędu do konsoli w komponencie error.tsx ponieważ:
  // 1. Next.js już loguje błędy server-side
  // 2. Logi client-side nie są zbierane w produkcji
  // 3. Może to prowadzić do wycieku wrażliwych informacji
  // W produkcji należy użyć zewnętrznego serwisu (np. Sentry) do monitorowania błędów

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">Failed to load briefs. Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

### 10.3 Obsługa błędów walidacji URL

```typescript
// W BriefsPage - graceful degradation
const params = parseSearchParams(await searchParams);
// Nieprawidłowe wartości są automatycznie zamieniane na domyślne
```

### 10.4 Obsługa pustych wyników

- Gdy `briefs.length === 0` → wyświetl `BriefEmptyState`
- Różne warianty w zależności od kontekstu (rola użytkownika, aktywne filtry)

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury katalogów i plików

```bash
mkdir -p src/app/\(dashboard\)/briefs
touch src/app/\(dashboard\)/briefs/page.tsx
touch src/app/\(dashboard\)/briefs/loading.tsx
touch src/app/\(dashboard\)/briefs/error.tsx
touch src/app/\(dashboard\)/layout.tsx
```

### Krok 2: Instalacja wymaganych komponentów shadcn/ui

```bash
npx shadcn@latest add card badge tabs select alert skeleton
npx shadcn@latest add pagination
```

### Krok 3: Utworzenie stałych i konfiguracji

Utwórz plik `src/lib/constants/brief-status.ts`:
- Mapa konfiguracji statusów (`BRIEF_STATUS_CONFIG`)
- Stałe limitu (`MAX_BRIEFS_PER_USER`, `BRIEF_LIMIT_WARNING_THRESHOLD`, `BRIEFS_PER_PAGE`)

### Krok 4: Implementacja komponentów UI (kolejność od liści do korzenia)

1. **BriefStatusBadge** - `src/components/briefs/BriefStatusBadge.tsx`
2. **OwnershipBadge** - `src/components/briefs/OwnershipBadge.tsx`
3. **BriefCard** - `src/components/briefs/BriefCard.tsx`
4. **BriefList** - `src/components/briefs/BriefList.tsx`
5. **BriefEmptyState** - `src/components/briefs/BriefEmptyState.tsx`
6. **BriefListSkeleton** - `src/components/briefs/BriefListSkeleton.tsx`
7. **BriefPagination** - `src/components/briefs/BriefPagination.tsx`
8. **BriefFilters** (Client Component) - `src/components/briefs/BriefFilters.tsx`
9. **BriefLimitAlert** - `src/components/briefs/BriefLimitAlert.tsx`
10. **BriefListHeader** - `src/components/briefs/BriefListHeader.tsx`

### Krok 5: Implementacja layoutu dashboardu

Utwórz `src/app/(dashboard)/layout.tsx`:
- Wrapper dla zalogowanych użytkowników
- Placeholder dla nawigacji (Sidebar/MobileNav - do implementacji później)

### Krok 6: Implementacja strony listy briefów

Utwórz `src/app/(dashboard)/briefs/page.tsx`:
- Parsowanie searchParams
- Fetch danych z API
- Kompozycja komponentów

### Krok 7: Implementacja loading state

Utwórz `src/app/(dashboard)/briefs/loading.tsx`:
- Skeleton header
- Skeleton filters
- `BriefListSkeleton`

### Krok 8: Implementacja error boundary

Utwórz `src/app/(dashboard)/briefs/error.tsx`:
- Wyświetlenie komunikatu błędu
- Przycisk retry

### Krok 9: Dodanie utility dla relative time

Utwórz `src/lib/utils/date.ts`:
- Funkcja `formatRelativeTime(date: string): string`
- Formatowanie: "just now", "5 minutes ago", "2 hours ago", "3 days ago", "Jan 15"

### Krok 10: Testy i weryfikacja

1. Sprawdź responsywność (mobile, tablet, desktop)
2. Przetestuj wszystkie filtry i paginację
3. Zweryfikuj deep linking (kopiowanie URL z filtrami)
4. Sprawdź dostępność (keyboard navigation, screen reader)
5. Przetestuj loading i error states
6. Zweryfikuj warunkowe renderowanie dla różnych ról

### Krok 11: Dodanie wariantu Badge dla statusów

Rozszerz komponent `Badge` o brakujące warianty:
- `success` (zielony) - dla statusu "accepted"
- `warning` (żółty) - dla statusu "needs_modification"

```typescript
// Dodaj do src/components/ui/badge.tsx
const badgeVariants = cva(
  "...",
  {
    variants: {
      variant: {
        default: "...",
        secondary: "...",
        destructive: "...",
        outline: "...",
        success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      },
    },
  }
);
```

### Krok 12: Eksport komponentów

Utwórz `src/components/briefs/index.ts`:
```typescript
export { BriefCard } from './BriefCard';
export { BriefList } from './BriefList';
export { BriefStatusBadge } from './BriefStatusBadge';
export { BriefFilters } from './BriefFilters';
export { BriefPagination } from './BriefPagination';
export { BriefEmptyState } from './BriefEmptyState';
export { BriefListHeader } from './BriefListHeader';
export { BriefLimitAlert } from './BriefLimitAlert';
export { BriefListSkeleton } from './BriefListSkeleton';
export { OwnershipBadge } from './OwnershipBadge';
```
