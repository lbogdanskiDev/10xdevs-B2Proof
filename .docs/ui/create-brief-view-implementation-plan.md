# Plan implementacji widoku Tworzenia Briefu

## 1. Przegląd

Widok tworzenia briefu (`/briefs/new`) umożliwia użytkownikom z rolą "creator" tworzenie nowych briefów projektowych. Jest to pełnoekranowy edytor zawierający:

- Pole nagłówka (header) z limitem 200 znaków
- Edytor WYSIWYG TipTap dla głównej treści z limitem 10,000 znaków
- Opcjonalne pole stopki (footer) z limitem 200 znaków
- Liczniki znaków z wizualną sygnalizacją zbliżania się do limitu
- Sticky header z przyciskami Cancel i Save

Po zapisaniu brief otrzymuje status "Draft". System wymusza limit 20 aktywnych briefów na użytkownika.

## 2. Routing widoku

**Ścieżka:** `/briefs/new`

**Struktura plików:**

```
src/app/(dashboard)/briefs/new/
├── page.tsx          # Server Component - wrapper strony
├── loading.tsx       # Loading state podczas ładowania strony
└── error.tsx         # Error boundary dla błędów
```

**Dostęp:** Tylko użytkownicy z rolą "creator". Middleware powinno weryfikować rolę i przekierowywać klientów do `/briefs`.

## 3. Struktura komponentów

```
CreateBriefPage (Server Component)
└── CreateBriefForm (Client Component)
    ├── CreateBriefFormHeader
    │   ├── Button (Cancel - variant: ghost)
    │   ├── Title: "Create Brief"
    │   └── Button (Save - variant: default, loading state)
    ├── HeaderField
    │   ├── Label
    │   ├── Input
    │   ├── CharacterCounter
    │   └── FieldError (conditional)
    ├── Suspense (fallback: EditorSkeleton)
    │   └── BriefEditor (lazy-loaded)
    │       ├── EditorMenuBar
    │       │   ├── ToggleGroup (Bold, Italic, Underline, Strike)
    │       │   ├── Select (Paragraph, H1, H2, H3)
    │       │   └── ToggleGroup (BulletList, OrderedList)
    │       ├── EditorContent
    │       └── CharacterCounter
    ├── FooterField
    │   ├── Label
    │   ├── Textarea
    │   ├── CharacterCounter
    │   └── FieldError (conditional)
    └── UnsavedChangesDialog
```

## 4. Szczegóły komponentów

### 4.1 CreateBriefPage

**Lokalizacja:** `src/app/(dashboard)/briefs/new/page.tsx`

- **Opis:** Server Component będący wrapperem strony. Może weryfikować uprawnienia użytkownika po stronie serwera przed renderowaniem formularza.
- **Główne elementy:**
  - Kontener z klasą dla pełnoekranowego layoutu
  - Import i render `CreateBriefForm`
- **Obsługiwane interakcje:** Brak (delegowane do komponentów klienckich)
- **Obsługiwana walidacja:** Brak (walidacja po stronie serwera w middleware)
- **Typy:** Brak
- **Propsy:** Brak

### 4.2 CreateBriefForm

**Lokalizacja:** `src/components/briefs/create/CreateBriefForm.tsx`

- **Opis:** Główny komponent Client Component zarządzający stanem formularza, walidacją i wysyłaniem danych. Koordynuje wszystkie podkomponenty i obsługuje ostrzeżenie o niezapisanych zmianach.
- **Główne elementy:**
  - `<form>` z obsługą onSubmit
  - `CreateBriefFormHeader`
  - `HeaderField`
  - `Suspense` z `BriefEditor`
  - `FooterField`
  - `UnsavedChangesDialog`
- **Obsługiwane interakcje:**
  - `onSubmit` - walidacja i wysłanie formularza
  - `beforeunload` - ostrzeżenie o niezapisanych zmianach
  - Obsługa zmiany wartości pól
- **Obsługiwana walidacja:**
  - Header: wymagany, 1-200 znaków
  - Content: wymagany, 1-10,000 znaków (tekst)
  - Footer: opcjonalny, max 200 znaków
  - Blokada przycisku Save gdy walidacja nie przechodzi
- **Typy:** `CreateBriefFormState`, `FieldErrors`, `CreateBriefCommand`
- **Propsy:** Brak (top-level form component)

### 4.3 CreateBriefFormHeader

**Lokalizacja:** `src/components/briefs/create/CreateBriefFormHeader.tsx`

- **Opis:** Sticky header formularza zawierający przyciski akcji Cancel i Save oraz tytuł strony. Pozostaje widoczny podczas przewijania.
- **Główne elementy:**
  - `<header>` z klasami `sticky top-0 z-50 bg-background border-b`
  - `Button` (Cancel) - variant: ghost
  - `<h1>` - "Create Brief"
  - `Button` (Save) - variant: default, loading state
- **Obsługiwane interakcje:**
  - `onCancel` - wywołuje handler anulowania
  - `onSave` - wywołuje handler zapisywania (type="submit")
- **Obsługiwana walidacja:** Brak (otrzymuje stan disabled z rodzica)
- **Typy:** `CreateBriefFormHeaderProps`
- **Propsy:**
  ```typescript
  interface CreateBriefFormHeaderProps {
    onCancel: () => void;
    isSaving: boolean;
    canSave: boolean;
  }
  ```

### 4.4 HeaderField

**Lokalizacja:** `src/components/briefs/create/HeaderField.tsx`

- **Opis:** Pole tekstowe dla nagłówka briefu z licznikiem znaków i wyświetlaniem błędów walidacji.
- **Główne elementy:**
  - `<div>` container
  - `<Label>` - "Header \*"
  - `<Input>` z Shadcn/ui
  - `CharacterCounter` (istniejący komponent)
  - `<p>` dla komunikatu błędu (warunkowy)
- **Obsługiwane interakcje:**
  - `onChange` - aktualizacja wartości header
- **Obsługiwana walidacja:**
  - Wymagany (min 1 znak po trim)
  - Max 200 znaków
  - Wizualna sygnalizacja błędu (czerwona ramka)
- **Typy:** `HeaderFieldProps`
- **Propsy:**
  ```typescript
  interface HeaderFieldProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
  }
  ```

### 4.5 BriefEditor

**Lokalizacja:** `src/components/briefs/create/BriefEditor.tsx`

- **Opis:** Lazy-loaded edytor WYSIWYG oparty na TipTap 3. Zawiera toolbar formatowania, obszar edycji i licznik znaków z debounce 300ms.
- **Główne elementy:**
  - `<div>` container
  - `EditorMenuBar` (sticky toolbar)
  - `EditorContent` z TipTap
  - `CharacterCounter`
  - Komunikat błędu walidacji
- **Obsługiwane interakcje:**
  - `onUpdate` - aktualizacja treści (TipTap JSON)
  - Formatowanie tekstu via toolbar
  - Keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
- **Obsługiwana walidacja:**
  - Wymagany (min 1 znak tekstu)
  - Max 10,000 znaków tekstu
  - Licznik znaków z debounce 300ms
- **Typy:** `BriefEditorProps`, `TipTapContent`
- **Propsy:**
  ```typescript
  interface BriefEditorProps {
    content: TipTapContent | null;
    onChange: (content: TipTapContent) => void;
    onCharacterCountChange: (count: number) => void;
    error?: string;
    disabled?: boolean;
  }
  ```

### 4.6 EditorMenuBar

**Lokalizacja:** `src/components/briefs/create/EditorMenuBar.tsx`

- **Opis:** Sticky toolbar dla edytora TipTap z przyciskami formatowania. Zawiera grupy przełączników dla stylów tekstu, wybór nagłówków i listy.
- **Główne elementy:**
  - `<div>` z klasą `sticky` i odpowiednim z-index
  - `ToggleGroup` - Bold (B), Italic (I), Underline (U), Strikethrough (S)
  - `Select` - Paragraph, Heading 1, Heading 2, Heading 3
  - `ToggleGroup` - Bullet List, Ordered List
  - `Separator` między grupami
- **Obsługiwane interakcje:**
  - Kliknięcia przycisków formatowania
  - Zmiana typu nagłówka
  - Toggle list
- **Obsługiwana walidacja:** Brak
- **Typy:** `EditorMenuBarProps`
- **Propsy:**
  ```typescript
  interface EditorMenuBarProps {
    editor: Editor | null;
  }
  ```

### 4.7 FooterField

**Lokalizacja:** `src/components/briefs/create/FooterField.tsx`

- **Opis:** Opcjonalne pole textarea dla stopki briefu z licznikiem znaków.
- **Główne elementy:**
  - `<div>` container
  - `<Label>` - "Footer (optional)"
  - `<Textarea>` z Shadcn/ui
  - `CharacterCounter`
  - Komunikat błędu walidacji (warunkowy)
- **Obsługiwane interakcje:**
  - `onChange` - aktualizacja wartości footer
- **Obsługiwana walidacja:**
  - Opcjonalny
  - Max 200 znaków jeśli podany
- **Typy:** `FooterFieldProps`
- **Propsy:**
  ```typescript
  interface FooterFieldProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
  }
  ```

### 4.8 CharacterCounter (istniejący)

**Lokalizacja:** `src/components/briefs/shared/CharacterCounter.tsx`

- **Opis:** Istniejący komponent wyświetlający licznik znaków z kolorowym kodowaniem stanu.
- **Modyfikacja:** Rozszerzyć o dodatkowe progi kolorów zgodnie z wymaganiami widoku:
  - Zielony: < 80% limitu
  - Żółty: 80-95% (warning)
  - Czerwony: 95-100%
- **Propsy:** (istniejące)
  ```typescript
  interface CharacterCounterProps {
    current: number;
    max: number;
  }
  ```

### 4.9 UnsavedChangesDialog

**Lokalizacja:** `src/components/briefs/create/UnsavedChangesDialog.tsx`

- **Opis:** Dialog potwierdzenia wyświetlany gdy użytkownik próbuje opuścić stronę z niezapisanymi zmianami.
- **Główne elementy:**
  - `AlertDialog` z Shadcn/ui
  - Tytuł: "Unsaved changes"
  - Opis: "You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
  - `AlertDialogCancel` - "Stay"
  - `AlertDialogAction` - "Leave" (destructive)
- **Obsługiwane interakcje:**
  - `onConfirm` - potwierdza opuszczenie strony
  - `onCancel` - zamyka dialog i pozostaje na stronie
- **Obsługiwana walidacja:** Brak
- **Typy:** `UnsavedChangesDialogProps`
- **Propsy:**
  ```typescript
  interface UnsavedChangesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  }
  ```

### 4.10 EditorSkeleton

**Lokalizacja:** `src/components/briefs/create/EditorSkeleton.tsx`

- **Opis:** Skeleton loading state wyświetlany podczas lazy-loading edytora TipTap.
- **Główne elementy:**
  - Skeleton dla toolbar
  - Skeleton dla obszaru edycji
  - Skeleton dla licznika znaków
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:** Brak

## 5. Typy

### 5.1 Istniejące typy (z `src/types.ts`)

```typescript
// Command do tworzenia briefu
interface CreateBriefCommand {
  header: string;
  content: BriefInsert["content"]; // TipTap JSON
  footer?: string | null;
}

// Response po utworzeniu briefu
interface BriefDetailDto {
  id: string;
  ownerId: string;
  header: string;
  content: BriefEntity["content"];
  footer: string | null;
  status: BriefStatus;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  commentCount: number;
  isOwned: boolean;
  createdAt: string;
  updatedAt: string;
}

// Błąd walidacji
interface ValidationErrorDetail {
  field: string;
  message: string;
}

// Response błędu
interface ErrorReturn {
  error: string;
  details?: ValidationErrorDetail[];
  retryAfter?: number;
}
```

### 5.2 Nowe typy (do utworzenia w `src/lib/types/create-brief.types.ts`)

```typescript
import type { JSONContent } from "@tiptap/react";

/**
 * Stan formularza tworzenia briefu
 */
export interface CreateBriefFormState {
  header: string;
  content: JSONContent | null;
  footer: string;
  contentCharCount: number;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: FieldErrors;
}

/**
 * Błędy walidacji pól formularza
 */
export interface FieldErrors {
  header?: string;
  content?: string;
  footer?: string;
  general?: string;
}

/**
 * Props dla nagłówka formularza
 */
export interface CreateBriefFormHeaderProps {
  onCancel: () => void;
  isSaving: boolean;
  canSave: boolean;
}

/**
 * Props dla pola nagłówka
 */
export interface HeaderFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Props dla edytora briefu
 */
export interface BriefEditorProps {
  content: JSONContent | null;
  onChange: (content: JSONContent) => void;
  onCharacterCountChange: (count: number) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Props dla toolbar edytora
 */
export interface EditorMenuBarProps {
  editor: Editor | null;
}

/**
 * Props dla pola stopki
 */
export interface FooterFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Props dla dialogu niezapisanych zmian
 */
export interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Wynik operacji tworzenia briefu
 */
export interface CreateBriefResult {
  success: boolean;
  data?: BriefDetailDto;
  error?: string;
  fieldErrors?: FieldErrors;
}
```

### 5.3 Stałe (do utworzenia w `src/lib/constants/create-brief.constants.ts`)

```typescript
export const CREATE_BRIEF_CONSTANTS = {
  HEADER_MAX_LENGTH: 200,
  CONTENT_MAX_LENGTH: 10000,
  FOOTER_MAX_LENGTH: 200,
  DEBOUNCE_DELAY_MS: 300,
  CHARACTER_COUNTER_WARNING_THRESHOLD: 0.8, // 80%
  CHARACTER_COUNTER_DANGER_THRESHOLD: 0.95, // 95%
} as const;
```

## 6. Zarządzanie stanem

### 6.1 Custom Hook: `useCreateBriefForm`

**Lokalizacja:** `src/components/hooks/use-create-brief-form.ts`

**Cel:** Centralne zarządzanie stanem formularza, walidacją i logiką wysyłania.

```typescript
interface UseCreateBriefFormReturn {
  // Stan
  formState: CreateBriefFormState;

  // Handlery zmian
  setHeader: (value: string) => void;
  setContent: (content: JSONContent) => void;
  setContentCharCount: (count: number) => void;
  setFooter: (value: string) => void;

  // Walidacja
  validateForm: () => boolean;
  canSubmit: boolean;

  // Akcje
  handleSubmit: () => Promise<CreateBriefResult>;
  handleCancel: () => void;

  // Reset
  resetForm: () => void;
}

function useCreateBriefForm(): UseCreateBriefFormReturn;
```

**Logika walidacji:**

- `canSubmit` = header.trim().length > 0 && header.length <= 200 && contentCharCount > 0 && contentCharCount <= 10000 && footer.length <= 200 && !isSubmitting

### 6.2 Custom Hook: `useUnsavedChangesWarning`

**Lokalizacja:** `src/components/hooks/use-unsaved-changes-warning.ts`

**Cel:** Obsługa ostrzeżenia o niezapisanych zmianach przy próbie nawigacji.

```typescript
interface UseUnsavedChangesWarningReturn {
  showDialog: boolean;
  setShowDialog: (show: boolean) => void;
  handleBeforeUnload: (e: BeforeUnloadEvent) => void;
  confirmNavigation: () => void;
  pendingNavigation: string | null;
}

function useUnsavedChangesWarning(isDirty: boolean): UseUnsavedChangesWarningReturn;
```

**Funkcjonalność:**

- Nasłuchuje na `beforeunload` event
- Integracja z Next.js router dla wewnętrznej nawigacji
- Pokazuje dialog potwierdzenia gdy `isDirty === true`

### 6.3 Custom Hook: `useDebouncedCharacterCount`

**Lokalizacja:** `src/components/hooks/use-debounced-character-count.ts`

**Cel:** Debounced liczenie znaków w edytorze TipTap dla optymalizacji wydajności.

```typescript
function useDebouncedCharacterCount(editor: Editor | null, delay: number): number;
```

## 7. Integracja API

### 7.1 Endpoint

**POST** `/api/briefs`

### 7.2 Request

```typescript
// Typ żądania
interface CreateBriefCommand {
  header: string; // 1-200 znaków, wymagany
  content: JSONContent; // TipTap JSON, wymagany
  footer?: string | null; // max 200 znaków, opcjonalny
}

// Przykładowe żądanie
const request: CreateBriefCommand = {
  header: "Project Brief Title",
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Brief content here...",
          },
        ],
      },
    ],
  },
  footer: "Optional footer",
};
```

### 7.3 Response

**Sukces (201 Created):**

```typescript
interface BriefDetailDto {
  id: string;
  ownerId: string;
  header: string;
  content: JSONContent;
  footer: string | null;
  status: "draft";
  statusChangedAt: null;
  statusChangedBy: null;
  commentCount: 0;
  isOwned: true;
  createdAt: string;
  updatedAt: string;
}
```

**Błędy:**

- `400 Bad Request` - błędy walidacji
- `401 Unauthorized` - brak autoryzacji
- `403 Forbidden` - brak roli creator lub limit briefów

### 7.4 Wywołanie API w custom hooku

Zgodnie z wzorcem używanym w projekcie (np. `useBriefComments.ts`), wywołanie `fetch` jest bezpośrednio w custom hooku `useCreateBriefForm`:

```typescript
// w src/components/hooks/use-create-brief-form.ts
const submitBrief = useCallback(async (): Promise<CreateBriefResult> => {
  setIsSubmitting(true);
  setErrors({});

  try {
    const response = await fetch("/api/briefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        header: header.trim(),
        content,
        footer: footer.trim() || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      // Mapowanie błędów walidacji na pola
      if (errorData.details) {
        const fieldErrors: FieldErrors = {};
        errorData.details.forEach((detail: ValidationErrorDetail) => {
          fieldErrors[detail.field as keyof FieldErrors] = detail.message;
        });
        setErrors(fieldErrors);
      }

      throw new Error(errorData.error || "Failed to create brief");
    }

    const data: BriefDetailDto = await response.json();
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  } finally {
    setIsSubmitting(false);
  }
}, [header, content, footer]);
```

**Nie tworzymy oddzielnego pliku `src/lib/api/briefs.api.ts`** - zachowujemy spójność z istniejącym wzorcem w projekcie.

## 8. Interakcje użytkownika

### 8.1 Wprowadzanie danych w polach

| Akcja                  | Rezultat                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Wpisanie w pole Header | Aktualizacja stanu `header`, aktualizacja CharacterCounter, ustawienie `isDirty: true`                    |
| Edycja w TipTap        | Aktualizacja stanu `content`, debounced aktualizacja CharacterCounter (300ms), ustawienie `isDirty: true` |
| Wpisanie w pole Footer | Aktualizacja stanu `footer`, aktualizacja CharacterCounter, ustawienie `isDirty: true`                    |

### 8.2 Formatowanie tekstu w edytorze

| Akcja                       | Rezultat                                                    |
| --------------------------- | ----------------------------------------------------------- |
| Klik Bold (lub Ctrl+B)      | Toggle formatowanie bold na zaznaczonym tekście             |
| Klik Italic (lub Ctrl+I)    | Toggle formatowanie italic na zaznaczonym tekście           |
| Klik Underline (lub Ctrl+U) | Toggle formatowanie underline na zaznaczonym tekście        |
| Klik Strike                 | Toggle formatowanie strikethrough na zaznaczonym tekście    |
| Wybór nagłówka z Select     | Zmiana typu bloku na wybrany nagłówek (H1-H3) lub Paragraph |
| Klik Bullet List            | Toggle lista punktowana                                     |
| Klik Ordered List           | Toggle lista numerowana                                     |

### 8.3 Akcje formularza

| Akcja                        | Rezultat                                                           |
| ---------------------------- | ------------------------------------------------------------------ |
| Klik Cancel (bez zmian)      | Przekierowanie do `/briefs`                                        |
| Klik Cancel (ze zmianami)    | Wyświetlenie UnsavedChangesDialog                                  |
| Klik "Stay" w dialogu        | Zamknięcie dialogu, pozostanie na stronie                          |
| Klik "Leave" w dialogu       | Przekierowanie do `/briefs`                                        |
| Klik Save (walidacja OK)     | Ustawienie `isSubmitting: true`, wywołanie API, obsługa odpowiedzi |
| Klik Save (walidacja NIE OK) | Wyświetlenie błędów walidacji przy polach                          |

### 8.4 Nawigacja

| Akcja                            | Rezultat                                |
| -------------------------------- | --------------------------------------- |
| Próba opuszczenia strony (dirty) | Wyświetlenie ostrzeżenia `beforeunload` |
| Nawigacja wewnętrzna (dirty)     | Wyświetlenie UnsavedChangesDialog       |
| Nawigacja wewnętrzna (clean)     | Normalna nawigacja                      |

## 9. Warunki i walidacja

### 9.1 Walidacja pola Header

| Warunek                  | Komponent   | Wpływ na UI                                                                  |
| ------------------------ | ----------- | ---------------------------------------------------------------------------- |
| Puste pole               | HeaderField | Czerwona ramka, komunikat "Header is required"                               |
| > 200 znaków             | HeaderField | CharacterCounter czerwony, komunikat "Header must be 200 characters or less" |
| 161-200 znaków (80-100%) | HeaderField | CharacterCounter żółty (warning)                                             |
| > 190 znaków (95-100%)   | HeaderField | CharacterCounter czerwony (danger)                                           |

### 9.2 Walidacja pola Content

| Warunek                       | Komponent   | Wpływ na UI                                                                      |
| ----------------------------- | ----------- | -------------------------------------------------------------------------------- |
| Pusta treść                   | BriefEditor | Komunikat błędu "Content is required"                                            |
| > 10,000 znaków               | BriefEditor | CharacterCounter czerwony, komunikat "Content must not exceed 10,000 characters" |
| 8,001-10,000 znaków (80-100%) | BriefEditor | CharacterCounter żółty (warning)                                                 |
| > 9,500 znaków (95-100%)      | BriefEditor | CharacterCounter czerwony (danger)                                               |

### 9.3 Walidacja pola Footer

| Warunek                  | Komponent   | Wpływ na UI                                                                  |
| ------------------------ | ----------- | ---------------------------------------------------------------------------- |
| > 200 znaków             | FooterField | CharacterCounter czerwony, komunikat "Footer must be 200 characters or less" |
| 161-200 znaków (80-100%) | FooterField | CharacterCounter żółty (warning)                                             |
| > 190 znaków (95-100%)   | FooterField | CharacterCounter czerwony (danger)                                           |

### 9.4 Walidacja formularza (przycisk Save)

| Warunek                           | Wpływ na UI                              |
| --------------------------------- | ---------------------------------------- |
| Header pusty lub > 200 znaków     | Przycisk Save disabled                   |
| Content pusty lub > 10,000 znaków | Przycisk Save disabled                   |
| Footer > 200 znaków               | Przycisk Save disabled                   |
| Formularz w trakcie wysyłania     | Przycisk Save disabled + loading spinner |
| Wszystkie warunki spełnione       | Przycisk Save enabled                    |

## 10. Obsługa błędów

### 10.1 Błędy walidacji (400 Bad Request)

```typescript
// Response
{
  "error": "Validation failed",
  "details": [
    { "field": "header", "message": "Header must be between 1 and 200 characters" }
  ]
}
```

**Obsługa:**

- Mapowanie `details` na `FieldErrors`
- Wyświetlenie komunikatów przy odpowiednich polach
- Focus na pierwszym polu z błędem

### 10.2 Brak autoryzacji (401 Unauthorized)

**Obsługa:**

- Przekierowanie do strony logowania `/login`
- Toast: "Session expired. Please log in again."

### 10.3 Brak uprawnień (403 Forbidden) - Nie creator

```typescript
// Response
{ "error": "Only creators can create briefs" }
```

**Obsługa:**

- Przekierowanie do `/briefs`
- Toast: "Only creators can create briefs"

### 10.4 Limit briefów (403 Forbidden)

```typescript
// Response
{ "error": "Brief limit of 20 reached. Please delete old briefs to create new ones." }
```

**Obsługa:**

- Pozostanie na stronie (zachowanie danych formularza)
- Toast (warning): "Brief limit of 20 reached. Delete old briefs to create new ones."

### 10.5 Błąd serwera (500 Internal Server Error)

**Obsługa:**

- Pozostanie na stronie (zachowanie danych formularza)
- Toast (error): "An error occurred. Please try again."
- Możliwość ponowienia akcji (przycisk Save nadal aktywny)

### 10.6 Błąd sieci

**Obsługa:**

- Pozostanie na stronie (zachowanie danych formularza)
- Toast (error): "Network error. Please check your connection and try again."
- Możliwość ponowienia akcji

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

1. Utworzenie katalogu `src/app/(dashboard)/briefs/new/`
2. Utworzenie plików: `page.tsx`, `loading.tsx`, `error.tsx`
3. Utworzenie katalogu `src/components/briefs/create/`
4. Utworzenie pliku typów `src/lib/types/create-brief.types.ts`
5. Utworzenie pliku stałych `src/lib/constants/create-brief.constants.ts`

### Krok 2: Implementacja typów i stałych

1. Zdefiniowanie wszystkich interfejsów w `create-brief.types.ts`
2. Zdefiniowanie stałych w `create-brief.constants.ts`
3. Export typów i stałych

### Krok 3: Rozszerzenie CharacterCounter

1. Modyfikacja `src/components/briefs/shared/CharacterCounter.tsx`
2. Dodanie progów 80% (warning) i 95% (danger)
3. Aktualizacja kolorów zgodnie z wymaganiami

### Krok 4: Implementacja custom hooks

1. Utworzenie `use-debounced-character-count.ts`
2. Utworzenie `use-unsaved-changes-warning.ts`
3. Utworzenie `use-create-brief-form.ts`

### Krok 5: Implementacja komponentów UI

1. `EditorSkeleton.tsx` - skeleton dla lazy-loaded edytora
2. `UnsavedChangesDialog.tsx` - dialog potwierdzenia
3. `HeaderField.tsx` - pole nagłówka
4. `FooterField.tsx` - pole stopki
5. `EditorMenuBar.tsx` - toolbar edytora
6. `BriefEditor.tsx` - główny edytor TipTap
7. `CreateBriefFormHeader.tsx` - nagłówek formularza

### Krok 6: Implementacja głównego formularza

1. `CreateBriefForm.tsx` - integracja wszystkich komponentów
2. Podłączenie custom hooks
3. Implementacja logiki walidacji
4. Implementacja obsługi błędów

### Krok 7: Implementacja strony

1. `page.tsx` - Server Component wrapper
2. `loading.tsx` - loading state
3. `error.tsx` - error boundary

### Krok 8: Testowanie

1. Testy walidacji formularza
2. Testy integracji z API
3. Testy obsługi błędów
4. Testy UX (unsaved changes warning)
5. Testy dostępności (keyboard navigation, ARIA)

### Krok 10: Dostępność i UX Polish

1. Dodanie ARIA labels do wszystkich interaktywnych elementów
2. Weryfikacja keyboard navigation w edytorze
3. Testowanie z czytnikiem ekranu
4. Optymalizacja wydajności (memo, lazy loading)
