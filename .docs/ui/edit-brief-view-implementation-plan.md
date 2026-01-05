# Plan implementacji widoku Edycji Briefu

## 1. Przegląd

Widok edycji briefu (`/briefs/[id]/edit`) umożliwia właścicielowi (creator) modyfikację istniejącego briefu. Widok jest niemal identyczny z widokiem tworzenia briefu (`/briefs/new`), z kluczowymi różnicami:

- Pre-filled wartości z istniejącego briefu
- Tytuł "Edit Brief" zamiast "Create Brief"
- AlertDialog ostrzegający przed resetem statusu (dla briefów z status !== 'draft')
- Wywołanie API PATCH zamiast POST

Główne przypadki użycia:

- Edycja briefu w statusie 'draft' (bez ostrzeżenia)
- Edycja briefu w statusie 'sent', 'accepted', 'rejected', 'needs_modification' (z ostrzeżeniem o resecie statusu)
- Obsługa błędów autoryzacji (tylko owner może edytować)

## 2. Routing widoku

**Ścieżka:** `/briefs/[id]/edit`

**Lokalizacja pliku:** `src/app/(dashboard)/briefs/[id]/edit/page.tsx`

**Parametry URL:**

- `id` - UUID briefu do edycji

**Przekierowania:**

- Sukces zapisania → `/briefs/[id]`
- 403 (nie owner) → `/briefs/[id]` + Toast z błędem
- 404 (brief nie istnieje) → `not-found.tsx`

## 3. Struktura komponentów

```
EditBriefPage (Server Component)
├── getBriefForEdit() - funkcja fetchująca dane briefu
└── EditBriefClient (Client Component)
    ├── BriefForm (Client Component) - współdzielony z /briefs/new
    │   ├── StickyHeader
    │   │   ├── Button (Cancel)
    │   │   ├── Tytuł ("Edit Brief")
    │   │   └── Button (Save, loading state)
    │   ├── HeaderField
    │   │   ├── Input
    │   │   └── CharacterCounter
    │   ├── BriefEditor (lazy-loaded)
    │   │   ├── EditorMenuBar
    │   │   ├── EditorContent (TipTap)
    │   │   └── CharacterCounter
    │   └── FooterField
    │       ├── Textarea
    │       └── CharacterCounter
    └── StatusResetAlertDialog (warunkowy)
        ├── AlertDialogContent
        ├── AlertDialogHeader
        ├── AlertDialogFooter
        │   ├── AlertDialogCancel
        │   └── AlertDialogAction
```

## 4. Szczegóły komponentów

### 4.1 EditBriefPage (Server Component)

**Opis:** Główna strona edycji briefu. Server Component odpowiedzialny za pobranie danych briefu i weryfikację dostępu.

**Główne elementy:**

- Asynchroniczna funkcja `getBriefForEdit(id)` do pobrania danych z API
- Obsługa błędów 404 (notFound()) i 403 (redirect z toast)
- Renderowanie `EditBriefClient` z danymi briefu

**Obsługiwane interakcje:** Brak (Server Component)

**Obsługiwana walidacja:**

- Walidacja UUID parametru `id`
- Sprawdzenie czy brief istnieje (404)
- Sprawdzenie czy user jest owner (403)

**Typy:**

- `BriefDetailDto` (dane briefu)
- `EditBriefPageProps` (params z id)

**Propsy:**

- `params: Promise<{ id: string }>` (Next.js 15 pattern)

---

### 4.2 EditBriefClient (Client Component)

**Opis:** Client wrapper zarządzający logiką edycji, stanem formularza i alertem resetowania statusu.

**Główne elementy:**

- `BriefForm` z pre-filled wartościami
- `StatusResetAlertDialog` (warunkowy, gdy status !== 'draft')
- Logika obsługi submit z opcjonalnym potwierdzeniem

**Obsługiwane interakcje:**

- `onSave` - wywołanie API PATCH lub pokazanie alertu
- `onCancel` - nawigacja do `/briefs/[id]`
- `onConfirmStatusReset` - potwierdzenie edycji non-draft briefu

**Obsługiwana walidacja:** Delegowana do `BriefForm`

**Typy:**

- `BriefDetailDto` (initialData)
- `EditBriefFormState` (stan formularza)

**Propsy:**

```typescript
interface EditBriefClientProps {
  brief: BriefDetailDto;
}
```

---

### 4.3 BriefForm (Client Component, współdzielony)

**Opis:** Formularz tworzenia/edycji briefu. Współdzielony między `/briefs/new` i `/briefs/[id]/edit`. Obsługuje zarówno tryb tworzenia jak i edycji.

**Główne elementy:**

- `StickyHeader` z przyciskami Cancel/Save i tytułem
- `HeaderField` (Input + CharacterCounter)
- `BriefEditor` (TipTap, lazy-loaded)
- `FooterField` (Textarea + CharacterCounter)

**Obsługiwane interakcje:**

- `onChange` dla każdego pola (header, content, footer)
- `onSubmit` - walidacja i wywołanie callback
- `onCancel` - nawigacja wstecz lub do listy

**Obsługiwana walidacja:**

- `header`: wymagany, 1-200 znaków
- `content`: wymagany, valid TipTap JSON, max 10,000 znaków tekstu
- `footer`: opcjonalny, max 200 znaków
- Disabled submit gdy walidacja nie przechodzi

**Typy:**

- `BriefFormData` (dane formularza)
- `BriefFormMode` ('create' | 'edit')

**Propsy:**

```typescript
interface BriefFormProps {
  mode: "create" | "edit";
  initialData?: BriefFormData;
  onSubmit: (data: BriefFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  title?: string;
}
```

---

### 4.4 BriefEditor (Client Component, lazy-loaded)

**Opis:** TipTap WYSIWYG editor z toolbar. Lazy-loaded dla optymalizacji bundle size.

**Główne elementy:**

- `EditorMenuBar` - sticky toolbar z przyciskami formatowania
- `EditorContent` - główny obszar edycji TipTap
- `CharacterCounter` - licznik znaków (debounced)

**Obsługiwane interakcje:**

- `onUpdate` - callback przy zmianie treści
- Komendy formatowania: Bold, Italic, Underline, Strike
- Zmiana nagłówków: Paragraph, H1, H2, H3
- Listy: BulletList, OrderedList

**Obsługiwana walidacja:**

- Max 10,000 znaków tekstu (liczone rekursywnie z JSON)
- Wyświetlanie ostrzeżenia przy zbliżeniu do limitu

**Typy:**

- `JSONContent` (TipTap content type)
- `Editor` (TipTap editor instance)

**Propsy:**

```typescript
interface BriefEditorProps {
  initialContent?: JSONContent;
  onChange: (content: JSONContent) => void;
  maxLength?: number; // default: 10000
  disabled?: boolean;
}
```

---

### 4.5 StatusResetAlertDialog (Client Component)

**Opis:** Dialog ostrzegający o resetowaniu statusu briefu do 'draft'. Wyświetlany przed zapisem gdy brief ma status inny niż 'draft'.

**Główne elementy:**

- `AlertDialog` (Shadcn/ui)
- `AlertDialogContent` z tytułem i opisem
- Przyciski: Cancel, Continue

**Obsługiwane interakcje:**

- `onConfirm` - potwierdzenie i kontynuacja zapisu
- `onCancel` - zamknięcie dialogu bez akcji

**Obsługiwana walidacja:** Brak

**Typy:** Brak specjalnych typów

**Propsy:**

```typescript
interface StatusResetAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  currentStatus: BriefStatus;
}
```

---

### 4.6 CharacterCounter (istniejący komponent)

**Opis:** Licznik znaków z kolorystycznym feedbackiem. Już zaimplementowany w `src/components/briefs/shared/CharacterCounter.tsx`.

**Główne elementy:**

- `<span>` z formatem "{current}/{max}"
- Dynamiczne klasy kolorystyczne

**Obsługiwane interakcje:** Brak (display only)

**Obsługiwana walidacja:** Wizualna (kolory):

- Default (< 90% limitu): `text-muted-foreground`
- Warning (90-100%): `text-yellow-600 dark:text-yellow-400`
- Error (> 100%): `text-destructive font-medium`

**Typy:** Brak

**Propsy:**

```typescript
interface CharacterCounterProps {
  current: number;
  max: number;
}
```

## 5. Typy

### 5.1 Istniejące typy (z `src/types.ts`)

```typescript
// DTO dla szczegółów briefu
interface BriefDetailDto {
  id: string;
  ownerId: string;
  header: string;
  content: Json; // TipTap JSON
  footer: string | null;
  status: BriefStatus;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  commentCount: number;
  isOwned: boolean;
  createdAt: string;
  updatedAt: string;
}

// Komenda aktualizacji briefu
interface UpdateBriefCommand {
  header?: string;
  content?: Json; // TipTap JSON
  footer?: string | null;
}

// Status briefu
type BriefStatus = "draft" | "sent" | "accepted" | "rejected" | "needs_modification";

// Odpowiedź błędu
interface ErrorReturn {
  error: string;
  details?: ValidationErrorDetail[];
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}
```

### 5.2 Nowe typy do utworzenia

**Lokalizacja:** `src/lib/types/brief-form.types.ts`

```typescript
import type { JSONContent } from "@tiptap/react";
import type { BriefStatus } from "@/types";

/**
 * Tryb formularza briefu
 */
export type BriefFormMode = "create" | "edit";

/**
 * Dane formularza briefu (ViewModel)
 * Używane do zarządzania stanem formularza po stronie klienta
 */
export interface BriefFormData {
  header: string;
  content: JSONContent;
  footer: string;
}

/**
 * Stan formularza z walidacją
 */
export interface BriefFormState {
  data: BriefFormData;
  isDirty: boolean;
  isValid: boolean;
  errors: BriefFormErrors;
}

/**
 * Błędy walidacji formularza
 */
export interface BriefFormErrors {
  header?: string;
  content?: string;
  footer?: string;
}

/**
 * Początkowe dane do edycji briefu
 */
export interface EditBriefInitialData {
  id: string;
  header: string;
  content: JSONContent;
  footer: string | null;
  status: BriefStatus;
}

/**
 * Wynik operacji zapisu briefu
 */
export interface BriefSaveResult {
  success: boolean;
  briefId?: string;
  error?: string;
  fieldErrors?: BriefFormErrors;
}
```

### 5.3 Stałe formularza

**Lokalizacja:** `src/lib/constants/brief.constants.ts` (rozszerzenie istniejącego pliku)

```typescript
export const BRIEF_FORM_CONSTANTS = {
  HEADER_MAX_LENGTH: 200,
  CONTENT_MAX_LENGTH: 10000,
  FOOTER_MAX_LENGTH: 200,
  DEBOUNCE_MS: 300, // dla character counter
} as const;
```

## 6. Zarządzanie stanem

### 6.1 Hook `useBriefForm`

**Lokalizacja:** `src/components/hooks/useBriefForm.ts`

**Cel:** Zarządzanie stanem formularza briefu, walidacją i śledzeniem zmian.

```typescript
interface UseBriefFormProps {
  initialData?: BriefFormData;
  mode: BriefFormMode;
}

interface UseBriefFormReturn {
  // Stan
  formData: BriefFormData;
  isDirty: boolean;
  isValid: boolean;
  errors: BriefFormErrors;

  // Akcje
  setHeader: (value: string) => void;
  setContent: (value: JSONContent) => void;
  setFooter: (value: string) => void;
  reset: () => void;

  // Walidacja
  validate: () => boolean;
  getContentTextLength: () => number;
}
```

**Implementacja:**

- `useState` dla każdego pola formularza
- `useMemo` dla walidacji i obliczania długości tekstu
- `useCallback` dla setterów
- Funkcja `countTipTapTextLength` do rekursywnego liczenia znaków

### 6.2 Hook `useUnsavedChanges`

**Lokalizacja:** `src/components/hooks/useUnsavedChanges.ts`

**Cel:** Ostrzeganie przed utratą niezapisanych zmian.

```typescript
interface UseUnsavedChangesProps {
  isDirty: boolean;
  message?: string;
}

// Implementacja:
// - useEffect z window.addEventListener('beforeunload', ...)
// - Blokowanie nawigacji Next.js (opcjonalnie)
```

### 6.3 Stan lokalny w EditBriefClient

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);
const [showStatusResetAlert, setShowStatusResetAlert] = useState(false);
const [pendingSubmitData, setPendingSubmitData] = useState<BriefFormData | null>(null);
```

## 7. Integracja API

### 7.1 Pobieranie briefu do edycji (Server Component)

**Endpoint:** `GET /api/briefs/:id`

**Typ odpowiedzi:** `BriefDetailDto`

```typescript
async function getBriefForEdit(id: string): Promise<BriefDetailDto | null> {
  const cookieStore = await cookies();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/briefs/${id}`, {
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (response.status === 403) {
    redirect(`/briefs/${id}?error=not-owner`);
  }
  if (!response.ok) {
    throw new Error("Failed to fetch brief");
  }

  return response.json();
}
```

### 7.2 Aktualizacja briefu (Client Component)

**Endpoint:** `PATCH /api/briefs/:id`

**Typ żądania:** `UpdateBriefCommand`

**Typ odpowiedzi sukcesu:** `BriefDetailDto`

**Typ odpowiedzi błędu:** `ErrorReturn`

```typescript
async function updateBrief(briefId: string, data: UpdateBriefCommand): Promise<BriefSaveResult> {
  const response = await fetch(`/api/briefs/${briefId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData: ErrorReturn = await response.json();
    return {
      success: false,
      error: errorData.error,
      fieldErrors: mapValidationErrors(errorData.details),
    };
  }

  const result: BriefDetailDto = await response.json();
  return { success: true, briefId: result.id };
}
```

## 8. Interakcje użytkownika

### 8.1 Ładowanie strony edycji

1. User klika "Edit" na stronie `/briefs/[id]`
2. Nawigacja do `/briefs/[id]/edit`
3. Server Component pobiera dane briefu
4. Sprawdzenie czy user jest owner (403 → redirect)
5. Renderowanie formularza z pre-filled wartościami

### 8.2 Edycja pól formularza

1. User modyfikuje pole (header/content/footer)
2. `onChange` aktualizuje stan formularza
3. CharacterCounter aktualizuje się w czasie rzeczywistym
4. Walidacja inline (błędy wyświetlane pod polami)
5. Przycisk Save enabled/disabled w zależności od walidacji

### 8.3 Zapisywanie briefu (status === 'draft')

1. User klika "Save"
2. Walidacja formularza client-side
3. Wywołanie API PATCH
4. Loading state na przycisku
5. Sukces → redirect do `/briefs/[id]` + toast "Brief updated"
6. Błąd → wyświetlenie błędów, toast z komunikatem

### 8.4 Zapisywanie briefu (status !== 'draft')

1. User klika "Save"
2. Walidacja formularza client-side
3. Wyświetlenie StatusResetAlertDialog
4. User klika "Cancel" → zamknięcie dialogu
5. User klika "Continue":
   - Wywołanie API PATCH
   - Loading state
   - Status automatycznie resetowany do 'draft' przez trigger DB
   - Sukces → redirect + toast "Brief updated. Status reset to draft."

### 8.5 Anulowanie edycji

1. User klika "Cancel"
2. Jeśli `isDirty` === true:
   - Wyświetlenie potwierdzenia (browser beforeunload lub custom dialog)
3. Nawigacja do `/briefs/[id]`

## 9. Warunki i walidacja

### 9.1 Walidacja pól formularza

| Pole    | Warunek                  | Komunikat błędu                             |
| ------- | ------------------------ | ------------------------------------------- |
| header  | Wymagane                 | "Header is required"                        |
| header  | Max 200 znaków           | "Header must be 200 characters or less"     |
| content | Wymagane (niepusty doc)  | "Content is required"                       |
| content | Max 10,000 znaków tekstu | "Content must not exceed 10,000 characters" |
| footer  | Max 200 znaków           | "Footer must be 200 characters or less"     |

### 9.2 Warunki biznesowe

| Warunek              | Sprawdzenie                | Efekt UI                            |
| -------------------- | -------------------------- | ----------------------------------- |
| User jest owner      | `brief.isOwned === true`   | Brak → redirect 403                 |
| Brief istnieje       | Response !== 404           | Brak → not-found.tsx                |
| Status !== 'draft'   | `brief.status !== 'draft'` | Pokazanie AlertDialog przed zapisem |
| Formularz jest dirty | Porównanie z initialData   | Ostrzeżenie przy wyjściu            |

### 9.3 Stan przycisku Save

```typescript
const isSaveDisabled = !isValid || isSubmitting || !isDirty;
```

## 10. Obsługa błędów

### 10.1 Błędy HTTP

| Kod | Przyczyna          | Obsługa UI                                                         |
| --- | ------------------ | ------------------------------------------------------------------ |
| 400 | Błędy walidacji    | Inline errors pod polami + toast                                   |
| 403 | Nie owner          | Redirect do `/briefs/[id]` + toast "Only the brief owner can edit" |
| 404 | Brief nie istnieje | not-found.tsx                                                      |
| 500 | Błąd serwera       | Toast "Something went wrong. Please try again."                    |

### 10.2 Błędy walidacji client-side

- Wyświetlane inline pod odpowiednimi polami
- CharacterCounter w kolorze czerwonym gdy przekroczony limit
- Przycisk Save disabled gdy błędy walidacji

### 10.3 Utrata połączenia / timeout

- Toast z komunikatem "Network error. Please check your connection."
- Możliwość retry (dane formularza zachowane)

### 10.4 Niezapisane zmiany

- `beforeunload` event → standardowy dialog przeglądarki
- Nawigacja wewnętrzna → opcjonalny custom dialog

## 11. Kroki implementacji

### Krok 1: Utworzenie typów i stałych

1. Utworzyć `src/lib/types/brief-form.types.ts` z typami:
   - `BriefFormMode`
   - `BriefFormData`
   - `BriefFormState`
   - `BriefFormErrors`
   - `EditBriefInitialData`
   - `BriefSaveResult`

2. Rozszerzyć `src/lib/constants/brief.constants.ts` o:
   - `BRIEF_FORM_CONSTANTS`

### Krok 2: Utworzenie hooków

1. Utworzyć `src/components/hooks/useBriefForm.ts`:
   - Stan formularza (header, content, footer)
   - Walidacja z Zod
   - Tracking isDirty
   - Funkcja `countTipTapTextLength`

2. Utworzyć `src/components/hooks/useUnsavedChanges.ts`:
   - Event listener dla beforeunload
   - Cleanup przy unmount

### Krok 3: Utworzenie komponentu BriefEditor

1. Utworzyć `src/components/briefs/form/BriefEditor.tsx`:
   - Konfiguracja TipTap z extensions (StarterKit, Typography)
   - EditorMenuBar z przyciskami formatowania
   - CharacterCounter z debounce
   - Lazy loading z React.lazy() i Suspense

2. Utworzyć `src/components/briefs/form/EditorMenuBar.tsx`:
   - ToggleGroup dla formatowania tekstu
   - Select dla nagłówków
   - ToggleGroup dla list

### Krok 4: Utworzenie komponentu BriefForm

1. Utworzyć `src/components/briefs/form/BriefForm.tsx`:
   - Sticky header z przyciskami Cancel/Save
   - Input dla header z CharacterCounter
   - BriefEditor (lazy-loaded)
   - Textarea dla footer z CharacterCounter
   - Props dla mode ('create' | 'edit')

2. Utworzyć `src/components/briefs/form/index.ts` z eksportami

### Krok 5: Utworzenie StatusResetAlertDialog

1. Utworzyć `src/components/briefs/form/StatusResetAlertDialog.tsx`:
   - Użycie AlertDialog z Shadcn/ui
   - Komunikat o resetowaniu statusu
   - Przyciski Cancel i Continue

### Krok 6: Utworzenie strony edycji

1. Utworzyć `src/app/(dashboard)/briefs/[id]/edit/page.tsx`:
   - Server Component z async data fetching
   - Obsługa błędów 403, 404
   - generateMetadata dla SEO

2. Utworzyć `src/components/briefs/form/EditBriefClient.tsx`:
   - Client wrapper z logiką submit
   - Integracja z StatusResetAlertDialog
   - Wywołanie API PATCH

### Krok 7: Integracja i testy

1. Przetestować flow edycji:
   - Edycja briefu draft (bez alertu)
   - Edycja briefu non-draft (z alertem)
   - Walidacja formularza
   - Obsługa błędów API

2. Przetestować UX:
   - Loading states
   - Toast notifications
   - Unsaved changes warning
   - Nawigacja Cancel

### Krok 8: Aktualizacja eksportów i czyszczenie

1. Dodać eksporty do:
   - `src/components/briefs/form/index.ts`
   - `src/components/briefs/index.ts`

2. Upewnić się że nie ma duplikacji kodu z potencjalnym `/briefs/new`

3. Przetestować responsywność (mobile/tablet/desktop)

4. Sprawdzić dostępność (ARIA labels, keyboard navigation)
