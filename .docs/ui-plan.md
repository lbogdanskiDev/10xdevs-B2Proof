# Architektura UI dla B2Proof

## 1. Przegląd struktury UI

### 1.1 Podsumowanie aplikacji

B2Proof to responsywna aplikacja webowa (mobile-first) służąca do zarządzania briefami projektowymi. Aplikacja obsługuje dwa typy użytkowników z różnymi przepływami:

- **Creator**: tworzy briefy, udostępnia klientom, zarządza odbiorcami, edytuje/usuwa briefy
- **Client**: przegląda udostępnione briefy, dodaje komentarze, zmienia status (accept/reject/needs modification)

### 1.2 Architektura techniczna UI

```
src/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Route group: niezalogowani użytkownicy
│   │   ├── login/page.tsx         # Formularz logowania
│   │   ├── register/page.tsx      # Formularz rejestracji
│   │   └── layout.tsx             # Układ dla auth (centered, max-width 600px)
│   ├── (dashboard)/               # Route group: zalogowani użytkownicy
│   │   ├── layout.tsx             # Układ z nawigacją (Sidebar/Sheet)
│   │   ├── briefs/
│   │   │   ├── page.tsx           # Lista briefów (Server Component)
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx       # Szczegóły briefu (Server Component)
│   │   │   │   └── edit/page.tsx  # Edycja briefu (Client Component)
│   │   │   └── new/page.tsx       # Tworzenie briefu (Client Component)
│   │   └── profile/page.tsx       # Profil użytkownika
│   ├── api/                       # API Route Handlers (15 endpointów)
│   ├── not-found.tsx              # Strona 404
│   └── error.tsx                  # Obsługa błędów 500
├── components/
│   ├── ui/                        # Shadcn/ui primitives
│   ├── layout/                    # Navigation, Sidebar, ThemeProvider, ThemeToggle
│   ├── briefs/                    # BriefCard, BriefList, BriefEditor, BriefStatusBadge, BriefContentRenderer
│   ├── comments/                  # CommentList, CommentForm, CommentCard
│   ├── recipients/                # RecipientTable, RecipientAddForm, ShareBriefDialog
│   ├── auth/                      # LoginForm, RegisterForm, PasswordRequirements
│   └── shared/                    # CharacterCounter, EmptyState, Pagination, Filters
├── hooks/
│   ├── use-auth.tsx               # AuthContext + useAuth hook
│   ├── use-brief-count.tsx        # Licznik briefów dla limitu
│   ├── use-debounce.tsx           # Debouncing dla character counter
│   └── use-unsaved-changes.tsx    # Ostrzeżenie przed utratą zmian
├── lib/
│   ├── services/                  # API services (fetch wrappers)
│   ├── schemas/                   # Zod validation schemas
│   ├── tiptap-config.ts           # Konfiguracja TipTap extensions
│   └── utils.ts                   # cn() utility + helpers
└── db/                            # Supabase clients
```

### 1.3 Strategia renderowania

| Typ komponentu                         | Użycie                                  | Przykłady                                          |
| -------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| **Server Components** (domyślne)       | Strony, layouty, listy, statyczna treść | BriefsPage, BriefDetailPage, ProfilePage           |
| **Client Components** (`"use client"`) | Formularze, interaktywność, hooks       | TipTapEditor, CommentForm, ThemeToggle, Navigation |
| **Lazy Loading**                       | Duże komponenty, TipTap                 | `React.lazy(() => import('./BriefEditor'))`        |

### 1.4 Responsywność (mobile-first)

| Breakpoint | Viewport   | Layout                          | Nawigacja              |
| ---------- | ---------- | ------------------------------- | ---------------------- |
| Mobile     | < 640px    | Single column, Card stack       | Sheet (hamburger menu) |
| Tablet     | 640-1024px | Two column grid                 | Visible sidebar        |
| Desktop    | > 1024px   | Three column grid (opcjonalnie) | Persistent sidebar     |

---

## 2. Lista widoków

### 2.1 Strona logowania (`/login`)

**Ścieżka:** `/login`

**Główny cel:** Umożliwienie istniejącym użytkownikom zalogowania się do systemu.

**Kluczowe informacje do wyświetlenia:**

- Logo aplikacji B2Proof
- Formularz logowania (email, hasło)
- Link do rejestracji

**Kluczowe komponenty widoku:**

- `Card` (Shadcn/ui) - kontener formularza (max-width 600px, centered)
- `Input` - pole email (type="email")
- `Input` - pole hasło (type="password") z toggle show/hide
- `Button` - przycisk "Sign In" (loading state)
- `Link` - "Don't have an account? Sign up"

**UX, dostępność i względy bezpieczeństwa:**

- **UX:** Prosty, przejrzysty formularz. Loading state na przycisku podczas ładowania. Walidacja email format client-side.
- **Dostępność:** Label dla każdego pola, `aria-describedby` dla błędów, focus management, klawisz Enter submituje formularz.
- **Bezpieczeństwo:** Hasło maskowane, brak szczegółowych komunikatów błędów (zapobiega enumeracji użytkowników), redirect do `/briefs` po sukcesie.

**Obsługa błędów:**

- 401 Invalid credentials → Toast error: "Invalid email or password"
- 500 Server error → Toast error: "Something went wrong. Please try again."

---

### 2.2 Strona rejestracji (`/register`)

**Ścieżka:** `/register`

**Główny cel:** Umożliwienie nowym użytkownikom utworzenia konta z wybraną rolą (creator/client).

**Kluczowe informacje do wyświetlenia:**

- Logo aplikacji B2Proof
- Formularz rejestracji (email, hasło, potwierdzenie hasła, wybór roli)
- Wymagania hasła (checklist)
- Link do logowania

**Kluczowe komponenty widoku:**

- `Card` (Shadcn/ui) - kontener formularza (max-width 600px, centered)
- `Input` - pole email (type="email")
- `Input` - pole hasło (type="password") z toggle show/hide
- `Input` - pole potwierdzenia hasła (client-side validation only)
- `PasswordRequirements` - checklist wymagań:
  - ✓/✗ Minimum 8 characters
  - ✓/✗ At least one digit
- `Select` - wybór roli: "I'm a Creator" / "I'm a Client"
- `Button` - przycisk "Create Account" (loading state)
- `Link` - "Already have an account? Sign in"

**UX, dostępność i względy bezpieczeństwa:**

- **UX:** Real-time walidacja hasła z checklistą. Potwierdzenie hasła walidowane client-side. Disabled submit dopóki formularz niepoprawny.
- **Dostępność:** ARIA live region dla checklisty wymagań, focus ring na polach, role selection z jasnym opisem.
- **Bezpieczeństwo:** Hasła nie wysyłane plain text (HTTPS), potwierdzenie hasła nie wysyłane do backendu, Supabase obsługuje profile creation via trigger.

**Obsługa błędów:**

- 400 Email already exists → Inline error pod polem email
- 400 Validation errors → Inline errors przy odpowiednich polach
- 500 Server error → Toast error

---

### 2.3 Lista briefów (`/briefs`)

**Ścieżka:** `/briefs`

**Główny cel:** Wyświetlenie paginowanej listy briefów użytkownika (własnych i udostępnionych) z możliwością filtrowania.

**Kluczowe informacje do wyświetlenia:**

- Licznik briefów użytkownika (np. "15/20 briefs")
- Ostrzeżenie o zbliżającym się limicie (gdy ≥18 briefów)
- Lista briefów z metadanymi:
  - Header (skrócony)
  - Status badge (z ikoną i kolorem)
  - Liczba komentarzy
  - Data ostatniej aktualizacji (relative time)
  - Badge własności ("My Brief" / "Shared with me")
- Filtry (owned/shared, status)
- Paginacja (10 per page)

**Kluczowe komponenty widoku:**

- `Header` - "Briefs" + Badge z licznikiem "15/20"
- `Alert` (warning) - ostrzeżenie gdy briefCount ≥ 18
- `Tabs` - filtr owned/shared (searchParams)
- `Select` - filtr statusu (draft/sent/accepted/rejected/needs_modification)
- `BriefList` - grid responsywny (1col mobile, 2col tablet, 3col desktop)
- `BriefCard` - karta pojedynczego briefu
  - Header (truncated)
  - `BriefStatusBadge` - status z ikoną
  - Comment count (MessageSquare icon)
  - Updated timestamp (relative < 7 days)
  - Ownership badge
- `Pagination` - server-side pagination
- `EmptyState` - gdy brak briefów (różny dla creator/client)
- `Button` - "New Brief" (disabled gdy limit osiągnięty, tylko dla creator)

**UX, dostępność i względy bezpieczeństwa:**

- **UX:** Server-side pagination z URL params (?page=1&filter=owned&status=draft). Deep linking. Skeleton loading. Kliknięcie karty → detail view.
- **Dostępność:** Karty jako interaktywne elementy z focus visible. ARIA labels dla ikon. Semantyczna struktura grid.
- **Bezpieczeństwo:** Server Component z autoryzacją. RLS zapewnia widoczność tylko własnych/udostępnionych briefów.

**Statusy i kolory:**
| Status | Badge Variant | Kolor | Ikona | Opis |
|--------|---------------|-------|-------|------|
| draft | secondary | gray | FileEdit | Edytowalny, nieudostępniony |
| sent | default | blue | Send | Udostępniony, oczekuje odpowiedzi |
| accepted | success | green | CheckCircle2 | Klient zaakceptował |
| rejected | destructive | red | XCircle | Klient odrzucił |
| needs_modification | warning | yellow | AlertCircle | Klient prosi o zmiany |

**Obsługa błędów:**

- 401 → Redirect do /login (middleware)
- 500 → error.tsx boundary z retry

---

### 2.4 Szczegóły briefu (`/briefs/[id]`)

**Ścieżka:** `/briefs/[id]`

**Główny cel:** Wyświetlenie pełnych szczegółów briefu z możliwością wykonania akcji zależnych od roli użytkownika.

**Kluczowe informacje do wyświetlenia:**

- Header briefu
- Status badge + data ostatniej aktualizacji
- Treść briefu (TipTap read-only)
- Footer briefu (opcjonalny)
- Przyciski akcji (zależne od roli i statusu)
- Sekcja odbiorców (tylko dla właściciela)
- Sekcja komentarzy z paginacją

**Kluczowe komponenty widoku:**

**Sekcja 1: Header**

- `Card` z:
  - Tekst header (font-semibold)
  - `BriefStatusBadge` | Updated date
  - Action buttons (warunkowe):
    - **Owner (isOwned === true):** [Edit] [Delete] [Share]
    - **Recipient (!isOwned && status === 'sent'):** [Accept] [Reject] [Needs Modification]

**Sekcja 2: Content**

- `Card` z:
  - `BriefContentRenderer` - TipTap read-only z Tailwind Typography (prose, dark:prose-invert)

**Sekcja 3: Footer (jeśli istnieje)**

- `Card` z:
  - Tekst footer (text-muted-foreground)

**Sekcja 4: Recipients (tylko owner)**

- `Card` z:
  - `RecipientTable` - [Email, Shared At, Actions (Trash2)]
  - `RecipientAddForm` - email input + Add button
  - Limit indicator: "2/10"

**Sekcja 5: Comments**

- `Card` z:
  - `CommentList` - chronologicznie (newest first)
  - `Pagination` - 50 per page, server-side
  - `CommentForm` - textarea (1000 char limit) + CharacterCounter

**AlertDialog scenarios:**

- Delete brief → "Are you sure? This will delete all comments and cannot be undone."
- Edit brief (status !== 'draft') → "Editing will reset status to draft. Recipients will need to review and respond again."
- Needs Modification → dwuetapowy Dialog wymagający komentarza

**UX, dostępność i względy bezpieczeństwa:**

- **UX:** Hierarchiczna struktura sekcji. Warunkowe renderowanie akcji. Polling co 30s + manual refresh dla komentarzy. NO optimistic updates.
- **Dostępność:** Heading hierarchy (H1 header, H2 sekcje). ARIA expanded dla collapsible sections. Focus management po akcjach.
- **Bezpieczeństwo:** Server Component z autoryzacją. isOwned flag z backendu. Akcje walidowane server-side.

**Obsługa błędów:**

- 403 → Toast: "You don't have permission to view this brief"
- 404 → not-found.tsx
- 500 → error.tsx boundary

---

### 2.5 Tworzenie briefu (`/briefs/new`)

**Ścieżka:** `/briefs/new`

**Główny cel:** Umożliwienie creatorom stworzenia nowego briefu z edytorem WYSIWYG.

**Kluczowe informacje do wyświetlenia:**

- Formularz tworzenia briefu:
  - Header (max 200 znaków)
  - Content (TipTap editor, max 10,000 znaków)
  - Footer (opcjonalny, max 200 znaków)
- Character counters dla każdego pola
- Przyciski Cancel/Save

**Kluczowe komponenty widoku:**

**Layout (full-screen):**

```
┌─────────────────────────────────────┐
│ STICKY HEADER (z-50, bg-background) │
│ [Cancel]    Create Brief    [Save]  │
├─────────────────────────────────────┤
│ Header Input (200 char limit)       │
│ CharacterCounter: 150/200           │
├─────────────────────────────────────┤
│ TipTap Editor (lazy-loaded)         │
│ - EditorMenuBar (sticky toolbar)    │
│ - EditorContent                     │
│ - CharacterCounter: 5,432/10,000    │
├─────────────────────────────────────┤
│ Footer Textarea (200 char, optional)│
│ CharacterCounter: 0/200             │
└─────────────────────────────────────┘
```

- `Input` - header field z CharacterCounter
- `BriefEditor` (lazy-loaded Client Component):
  - `EditorMenuBar` (sticky):
    - ToggleGroup: Bold, Italic, Underline, Strike
    - Select: Paragraph, H1, H2, H3
    - ToggleGroup: BulletList, OrderedList
  - `EditorContent` - główny obszar edycji
  - `CharacterCounter` - debounced (300ms) dla performance
- `Textarea` - footer field z CharacterCounter
- `Button` variants: Cancel (ghost) + Save (default, loading state)

**CharacterCounter kolory:**

- Zielony: < 80% limitu
- Żółty: 80-95% (warning)
- Czerwony: 95-100%
- Disabled submit: > 100%

**TipTap Extensions (zgodne z tech-stack.md):**

- Document, Paragraph, Text
- Bold, Italic, Underline, Strike
- Heading (levels 1-3)
- BulletList, OrderedList, ListItem
- HardBreak
- CharacterCount (hard limit 10k)

**UX, dostępność i względy bezpieczeństwa:**

- **UX:** Full-screen editor. Sticky header i toolbar. Unsaved changes warning (beforeunload + custom navigation guard). NO auto-save. Cancel → confirm jeśli niezapisane zmiany → redirect /briefs.
- **Dostępność:** Keyboard shortcuts w TipTap. ARIA labels dla toolbar buttons. Focus trap w edytorze.
- **Bezpieczeństwo:** Tylko creator może tworzyć briefy (middleware + API). TipTap JSON format (no XSS). Server-side validation.

**Obsługa błędów:**

- 400 Validation → Inline errors przy polach
- 403 Brief limit reached → Toast: "Brief limit of 20 reached. Delete old briefs to create new ones."
- 403 Not a creator → Redirect /briefs + Toast
- 500 → Toast error + retry option

---

### 2.6 Edycja briefu (`/briefs/[id]/edit`)

**Ścieżka:** `/briefs/[id]/edit`

**Główny cel:** Umożliwienie właścicielowi edycji istniejącego briefu.

**Kluczowe informacje do wyświetlenia:**

- Identyczne jak tworzenie briefu
- Pre-filled wartości z istniejącego briefu
- Informacja o resecie statusu (jeśli status !== 'draft')

**Kluczowe komponenty widoku:**

- Identyczne jak `/briefs/new` z wyjątkiem:
  - Tytuł: "Edit Brief" zamiast "Create Brief"
  - Pre-filled fields z API response
  - AlertDialog przed zapisem jeśli status !== 'draft':
    - "Editing will reset status to 'draft'. All recipients will need to review and respond again. Continue?"

**UX, dostępność i względy bezpieczeństwa:**

- **UX:** Identyczne jak tworzenie. Warning modal przed zapisem non-draft briefs. Recipients zachowują dostęp po edycji.
- **Dostępność:** Identyczne jak tworzenie.
- **Bezpieczeństwo:** Tylko owner może edytować (middleware + API). Status automatycznie resetowany do 'draft' przez trigger bazodanowy.

**Obsługa błędów:**

- 403 Not owner → Redirect /briefs/[id] + Toast: "Only the brief owner can edit"
- 404 → not-found.tsx
- 400/500 → jak w tworzeniu

---

### 2.7 Profil użytkownika (`/profile`)

**Ścieżka:** `/profile`

**Główny cel:** Umożliwienie użytkownikowi zarządzania kontem (zmiana hasła, usunięcie konta).

**Kluczowe informacje do wyświetlenia:**

- Informacje o koncie (read-only)
- Formularz zmiany hasła
- Strefa niebezpieczna (usunięcie konta)

**Kluczowe komponenty widoku:**

**Sekcja 1: Account Information (read-only)**

- `Card` z:
  - Email (read-only)
  - Role (Creator/Client badge)
  - Member since (formatted date)

**Sekcja 2: Change Password**

- `Card` z:
  - `Input` - Current Password
  - `Input` - New Password + `PasswordRequirements` checklist
  - `Input` - Confirm New Password
  - `Button` - "Update Password" (loading state)

**Sekcja 3: Danger Zone**

- `Card` (destructive styling, border-destructive) z:
  - Warning text: "This action is permanent and cannot be undone"
  - `Button` (variant="destructive") - "Delete My Account"
  - `AlertDialog` double confirmation:
    - Title: "Delete Account?"
    - Description: "This will permanently delete your account and all your briefs, comments, and data. Type your email to confirm."
    - `Input` - email verification (disabled submit until confirmEmail === user.email)
    - Buttons: Cancel / Delete Account

**Max-width 768px, centered layout.**

**UX, dostępność i względy bezpieczeństwa:**

- **UX:** Jasne rozdzielenie sekcji. Double confirmation dla delete. Loading states.
- **Dostępność:** Form labels, ARIA live dla feedback, focus management po akcjach.
- **Bezpieczeństwo:** Current password required dla zmiany. Email verification dla delete. Supabase signOut() + redirect /login po usunięciu.

**Obsługa błędów:**

- 400 Wrong current password → Inline error
- 400 Password validation → Inline errors + checklist
- 500 → Toast error

---

## 3. Mapa podróży użytkownika

### 3.1 Przepływ rejestracji i logowania

```
┌─────────────────────────────────────────────────────────────────┐
│                    NIEZALOGOWANY UŻYTKOWNIK                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   /login ◄────────────────────────────────┐                     │
│      │                                    │                     │
│      │ [Sign Up link]              [Sign In link]               │
│      ▼                                    │                     │
│   /register ──────────────────────────────┘                     │
│      │                                                          │
│      │ [Create Account - success]                               │
│      ▼                                                          │
│   Supabase Auth ─── Trigger ─── Profile creation                │
│      │                                                          │
│      │ [Auto-login]                                             │
│      ▼                                                          │
│   /briefs (redirect)                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Główny przepływ Creator

```
┌─────────────────────────────────────────────────────────────────┐
│                         CREATOR FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   /briefs (Lista briefów)                                       │
│      │                                                          │
│      ├─── [New Brief] ──► /briefs/new                           │
│      │                         │                                │
│      │                         │ [Save]                         │
│      │                         ▼                                │
│      │                    /briefs/[id] ◄─┐                      │
│      │                         │         │                      │
│      │    ┌────────────────────┼─────────┤                      │
│      │    │                    │         │                      │
│      │    │ [Edit]             │ [Share] │ [Delete]             │
│      │    ▼                    │         │                      │
│      │ /briefs/[id]/edit       │         │                      │
│      │    │                    │         │                      │
│      │    │ [Save]             │         │                      │
│      │    ▼                    │         │                      │
│      │ /briefs/[id] ───────────┘         │                      │
│      │                                   │                      │
│      │◄──────────────────────────────────┘                      │
│      │                                                          │
│      ├─── [Brief Card click] ──► /briefs/[id]                   │
│      │                                                          │
│      └─── [Profile nav] ──► /profile                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Główny przepływ Client

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   /briefs (Lista udostępnionych briefów)                        │
│      │                                                          │
│      │ [Brak "New Brief" button - client role]                  │
│      │                                                          │
│      ├─── [Brief Card click] ──► /briefs/[id]                   │
│      │                               │                          │
│      │                               │ (status === 'sent')      │
│      │                               │                          │
│      │    ┌──────────────────────────┼──────────────────┐       │
│      │    │                          │                  │       │
│      │    │ [Accept]                 │ [Reject]         │       │
│      │    ▼                          ▼                  │       │
│      │ status: accepted         status: rejected        │       │
│      │    │                          │                  │       │
│      │    └──────────────────────────┤                  │       │
│      │                               │                  │       │
│      │                               │ [Needs Mod]      │       │
│      │                               ▼                  │       │
│      │                          Dialog: Comment         │       │
│      │                               │                  │       │
│      │                               │ [Submit]         │       │
│      │                               ▼                  │       │
│      │                    status: needs_modification    │       │
│      │                               │                  │       │
│      │◄──────────────────────────────┴──────────────────┘       │
│      │                                                          │
│      │ [Add Comment] ──► CommentForm ──► router.refresh()       │
│      │                                                          │
│      └─── [Profile nav] ──► /profile                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Przepływ tworzenia i udostępniania briefu

```
1. Creator klika "New Brief" na /briefs
2. Redirect do /briefs/new
3. Creator wypełnia formularz:
   - Header (required, max 200 chars)
   - Content (required, max 10,000 chars via TipTap)
   - Footer (optional, max 200 chars)
4. Creator klika "Save"
5. Server Action: POST /api/briefs
6. Success: redirect do /briefs/[id]
7. Creator klika "Share"
8. ShareBriefDialog opens
9. Creator wpisuje email odbiorcy
10. POST /api/briefs/[id]/recipients
11. Success:
    - Trigger zmienia status na 'sent'
    - Odbiorca widzi brief w swojej liście
12. Toast: "Brief shared successfully"
```

### 3.5 Przepływ statusu briefu

```
┌─────────────────────────────────────────────────────────────────┐
│                     STATUS WORKFLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   DRAFT ──────────────────────────────────────────────────────┐ │
│     │                                                         │ │
│     │ [Share with first recipient]                            │ │
│     │ (auto via trigger)                                      │ │
│     ▼                                                         │ │
│   SENT                                                        │ │
│     │                                                         │ │
│     ├─── [Client: Accept] ──────► ACCEPTED                    │ │
│     │                                 │                       │ │
│     ├─── [Client: Reject] ──────► REJECTED                    │ │
│     │                                 │                       │ │
│     └─── [Client: Needs Mod] ───► NEEDS_MODIFICATION          │ │
│                                       │                       │ │
│                                       │                       │ │
│   [Owner: Edit brief] ────────────────┴───────────────────────┘ │
│   (auto reset via trigger)                                      │
│                                                                 │
│   [Owner: Remove all recipients] ─────────────────► DRAFT       │
│   (auto reset via trigger)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.6 Przepływ komentarzy

```
1. Użytkownik (owner lub recipient) na /briefs/[id]
2. Scrolluje do sekcji Comments
3. Wpisuje komentarz w CommentForm (max 1000 chars)
4. CharacterCounter pokazuje real-time count
5. Klika "Add Comment"
6. POST /api/briefs/[id]/comments
7. Success:
   - Comment pojawia się na liście (router.refresh())
   - Trigger inkrementuje comment_count
   - Toast: "Comment added"
8. Owner może usunąć własny komentarz:
   - Klika Trash icon
   - DELETE /api/comments/[id]
   - Bez potwierdzenia (per PRD)
   - Comment znika, count dekrementowany
```

---

## 4. Układ i struktura nawigacji

### 4.1 Layout aplikacji

**Niezalogowani użytkownicy (auth routes):**

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER (logo only)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌───────────────────┐                        │
│                    │                   │                        │
│                    │  AUTH FORM CARD   │                        │
│                    │  (max-width 600px)│                        │
│                    │                   │                        │
│                    └───────────────────┘                        │
│                                                                 │
│                         (centered)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Zalogowani użytkownicy (dashboard routes):**

**Desktop (> 1024px):**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                   Theme │ User  │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│   SIDEBAR    │               MAIN CONTENT                       │
│              │                                                  │
│   B2Proof    │                                                  │
│              │                                                  │
│   [Briefs]   │                                                  │
│   15/20      │                                                  │
│              │                                                  │
│   [Profile]  │                                                  │
│              │                                                  │
│   ─────────  │                                                  │
│              │                                                  │
│   [Logout]   │                                                  │
│              │                                                  │
│   (New Brief)│  (tylko dla creator)                             │
│              │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

**Mobile (< 640px):**

```
┌─────────────────────────────────────────────────────────────────┐
│   ☰   │         B2Proof         │     Theme │ User              │
├───────┴─────────────────────────┴───────────────────────────────┤
│                                                                 │
│                        MAIN CONTENT                             │
│                      (full width)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Sheet (hamburger):
┌────────────────┐
│                │
│   B2Proof      │
│                │
│   [Briefs]     │
│   15/20        │
│                │
│   [Profile]    │
│                │
│   ─────────────│
│                │
│   [Logout]     │
│                │
│   [New Brief]  │
│                │
└────────────────┘
```

### 4.2 Elementy nawigacji

**Sidebar (desktop) / Sheet (mobile):**

| Element           | Ikona    | Ścieżka     | Widoczność                        |
| ----------------- | -------- | ----------- | --------------------------------- |
| Logo              | -        | /briefs     | Wszystkie role                    |
| Briefs            | FileText | /briefs     | Wszystkie role                    |
| Brief Count Badge | -        | -           | Creator only (format: "15/20")    |
| New Brief         | Plus     | /briefs/new | Creator only (disabled gdy limit) |
| Profile           | User     | /profile    | Wszystkie role                    |
| Separator         | -        | -           | -                                 |
| Logout            | LogOut   | - (action)  | Wszystkie role                    |

**Top bar:**
| Element | Pozycja | Opis |
|---------|---------|------|
| Hamburger (mobile) | Left | Otwiera Sheet z nawigacją |
| Logo (mobile) | Center | Klikalny, redirect do /briefs |
| ThemeToggle | Right | Sun/Moon icon, toggle dark mode |
| User Avatar/Initial | Right | Dropdown z Profile/Logout |

### 4.3 Warunkowa nawigacja

```typescript
// Nawigacja zależna od roli
const navigation = [
  { name: "Briefs", href: "/briefs", icon: FileText },
  ...(user.role === "creator"
    ? [
        {
          name: "New Brief",
          href: "/briefs/new",
          icon: Plus,
          disabled: briefCount >= 20,
        },
      ]
    : []),
  { name: "Profile", href: "/profile", icon: User },
];
```

### 4.4 Protected routes (middleware)

```typescript
// middleware.ts
export const config = {
  matcher: ["/((?!_next|api/auth|login|register).*)"],
};

// Logika:
// 1. Sprawdź czy user jest zalogowany (supabase.auth.getUser())
// 2. Jeśli NIE → redirect /login
// 3. Jeśli TAK → allow request
```

---

## 5. Kluczowe komponenty

### 5.1 Komponenty layoutu

| Komponent       | Opis                        | Props                                |
| --------------- | --------------------------- | ------------------------------------ |
| `Sidebar`       | Nawigacja desktop           | `user`, `briefCount`, `navigation[]` |
| `MobileNav`     | Sheet z nawigacją mobile    | `user`, `briefCount`, `navigation[]` |
| `ThemeProvider` | next-themes wrapper         | `children`, `defaultTheme`           |
| `ThemeToggle`   | Przełącznik dark/light mode | -                                    |
| `AuthProvider`  | Context z user state        | `children`                           |

### 5.2 Komponenty briefów

| Komponent              | Opis                        | Props                                     |
| ---------------------- | --------------------------- | ----------------------------------------- |
| `BriefList`            | Grid z kartami briefów      | `briefs[]`, `emptyState`                  |
| `BriefCard`            | Karta pojedynczego briefu   | `brief`, `onClick`                        |
| `BriefStatusBadge`     | Badge statusu z ikoną       | `status`                                  |
| `BriefEditor`          | TipTap editor (lazy-loaded) | `initialContent`, `onChange`, `maxLength` |
| `BriefContentRenderer` | Read-only TipTap render     | `content`                                 |
| `EditorMenuBar`        | Toolbar TipTap              | `editor`                                  |

### 5.3 Komponenty komentarzy

| Komponent     | Opis                 | Props                          |
| ------------- | -------------------- | ------------------------------ |
| `CommentList` | Lista komentarzy     | `comments[]`, `currentUserId`  |
| `CommentCard` | Pojedynczy komentarz | `comment`, `isOwn`, `onDelete` |
| `CommentForm` | Formularz dodawania  | `briefId`, `onSuccess`         |

### 5.4 Komponenty odbiorców

| Komponent          | Opis                | Props                                  |
| ------------------ | ------------------- | -------------------------------------- |
| `RecipientTable`   | Tabela odbiorców    | `recipients[]`, `onRevoke`             |
| `RecipientAddForm` | Formularz dodawania | `briefId`, `currentCount`, `onSuccess` |
| `ShareBriefDialog` | Quick share modal   | `briefId`, `trigger`                   |

### 5.5 Komponenty auth

| Komponent              | Opis                    | Props       |
| ---------------------- | ----------------------- | ----------- |
| `LoginForm`            | Formularz logowania     | `onSuccess` |
| `RegisterForm`         | Formularz rejestracji   | `onSuccess` |
| `PasswordRequirements` | Checklist wymagań hasła | `password`  |

### 5.6 Komponenty współdzielone

| Komponent          | Opis                      | Props                                              |
| ------------------ | ------------------------- | -------------------------------------------------- |
| `CharacterCounter` | Licznik znaków z kolorami | `current`, `max`, `className`                      |
| `EmptyState`       | Stan pusty z CTA          | `icon`, `title`, `description`, `action`           |
| `Pagination`       | Kontrolki paginacji       | `pagination`, `onPageChange`                       |
| `Filters`          | Filtry listy              | `filters`, `onFilterChange`                        |
| `ConfirmDialog`    | AlertDialog wrapper       | `title`, `description`, `onConfirm`, `destructive` |

### 5.7 Specyfikacja CharacterCounter

```typescript
interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

// Kolory:
// current < 80% max → text-muted-foreground (default)
// current >= 80% && < 95% → text-yellow-600 (warning)
// current >= 95% → text-destructive (danger)

// Format: "{current}/{max}"
// Disabled submit gdy current > max
```

### 5.8 Specyfikacja BriefStatusBadge

```typescript
interface BriefStatusBadgeProps {
  status: "draft" | "sent" | "accepted" | "rejected" | "needs_modification";
}

const statusConfig = {
  draft: { variant: "secondary", icon: FileEdit, label: "Draft" },
  sent: { variant: "default", icon: Send, label: "Sent" },
  accepted: { variant: "success", icon: CheckCircle2, label: "Accepted" },
  rejected: { variant: "destructive", icon: XCircle, label: "Rejected" },
  needs_modification: { variant: "warning", icon: AlertCircle, label: "Needs Modification" },
};
```

### 5.9 Specyfikacja EmptyState

```typescript
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

// Warianty:
// 1. No briefs (creator): icon=FileText, title="No briefs yet",
//    description="Create your first brief to get started",
//    action=<Button>Create Brief</Button>
// 2. No shared briefs (client): icon=FileText, title="No shared briefs",
//    description="Briefs shared with you will appear here"
// 3. No comments: icon=MessageSquare, title="No comments yet",
//    description="Be the first to comment"
// 4. No recipients: icon=Users, title="No recipients",
//    description="Share this brief with your clients"
```

---

## 6. Obsługa błędów i stanów

### 6.1 Hierarchia obsługi błędów

| Kod | Typ          | Obsługa UI                            |
| --- | ------------ | ------------------------------------- |
| 400 | Validation   | Inline errors przy polach formularza  |
| 401 | Unauthorized | Redirect do /login (middleware)       |
| 403 | Forbidden    | Toast error notification              |
| 404 | Not Found    | not-found.tsx page                    |
| 409 | Conflict     | Toast error (np. duplicate recipient) |
| 500 | Server Error | error.tsx boundary z retry button     |

### 6.2 Loading states

| Kontekst       | Implementacja                                |
| -------------- | -------------------------------------------- |
| Button submit  | `disabled` + Loader icon + "Loading..." text |
| Page loading   | `loading.tsx` z Skeleton components          |
| List loading   | Skeleton grid matching BriefCard layout      |
| Lazy component | Suspense boundary z Skeleton                 |
| Data refetch   | Optional: nprogress bar                      |

### 6.3 Walidacja formularzy

| Poziom      | Narzędzie             | Opis                    |
| ----------- | --------------------- | ----------------------- |
| Client-side | Zod + react-hook-form | Natychmiastowy feedback |
| Server-side | Zod + Server Actions  | Security validation     |
| Database    | CHECK constraints     | Last line of defense    |

### 6.4 Unsaved changes protection

```typescript
// Dla BriefEditor (create/edit):
// 1. Track hasUnsavedChanges state
// 2. beforeunload event → browser confirm dialog
// 3. Internal navigation → custom AlertDialog
// 4. Reset flag po successful save
```

---

## 7. Bezpieczeństwo UI

### 7.1 Authentication

- Supabase Auth z JWT w cookies (HttpOnly, Secure, SameSite)
- Auto-refresh via Supabase SDK
- Middleware chroni wszystkie /dashboard routes

### 7.2 Authorization

- RLS policies na poziomie bazy danych
- `isOwned` flag z backendu dla conditional rendering
- Server-side validation wszystkich akcji
- UI guards NIE zastępują server-side checks

### 7.3 Input validation

- Client-side Zod dla UX (immediate feedback)
- Server-side Zod dla security
- TipTap JSON format (no raw HTML → no XSS)
- Character limits enforced na wszystkich poziomach

### 7.4 CSRF protection

- Server Actions używają built-in Next.js CSRF tokens
- API routes walidują Origin header

---

## 8. Mapowanie User Stories do UI

| US     | Tytuł                   | Widok(i)             | Komponenty                                       |
| ------ | ----------------------- | -------------------- | ------------------------------------------------ |
| US-001 | Rejestracja użytkownika | `/register`          | RegisterForm, PasswordRequirements               |
| US-002 | Logowanie użytkownika   | `/login`             | LoginForm                                        |
| US-003 | Tworzenie briefu        | `/briefs/new`        | BriefEditor, CharacterCounter                    |
| US-004 | Edycja briefu           | `/briefs/[id]/edit`  | BriefEditor, ConfirmDialog                       |
| US-005 | Usuwanie briefu         | `/briefs/[id]`       | ConfirmDialog (delete)                           |
| US-006 | Lista briefów           | `/briefs`            | BriefList, BriefCard, Pagination, Filters        |
| US-007 | Udostępnianie briefu    | `/briefs/[id]`       | ShareBriefDialog, RecipientAddForm               |
| US-008 | Cofanie dostępu         | `/briefs/[id]`       | RecipientTable (delete action)                   |
| US-009 | Akceptacja briefu       | `/briefs/[id]`       | Button "Accept", status change                   |
| US-010 | Odrzucenie briefu       | `/briefs/[id]`       | Button "Reject", status change                   |
| US-011 | Prośba o modyfikację    | `/briefs/[id]`       | Button "Needs Mod", Dialog + CommentForm         |
| US-012 | Dodawanie komentarza    | `/briefs/[id]`       | CommentForm, CharacterCounter                    |
| US-013 | Usuwanie komentarza     | `/briefs/[id]`       | CommentCard (delete action)                      |
| US-014 | Przeglądanie komentarzy | `/briefs/[id]`       | CommentList, Pagination                          |
| US-015 | Zmiana hasła            | `/profile`           | PasswordChangeForm, PasswordRequirements         |
| US-016 | Usunięcie konta         | `/profile`           | ConfirmDialog (double confirm + email verify)    |
| US-017 | Szczegóły briefu        | `/briefs/[id]`       | BriefContentRenderer, wszystkie sekcje           |
| US-018 | Nawigacja               | Wszystkie            | Sidebar, MobileNav, ThemeToggle                  |
| US-019 | Wylogowanie             | Nawigacja            | Logout action                                    |
| US-020 | Obsługa błędów          | Wszystkie            | Inline errors, Toasts, error.tsx                 |
| US-021 | Autoryzacja zasobów     | Wszystkie            | Middleware, conditional rendering                |
| US-022 | Limity systemu          | `/briefs`, nawigacja | BriefCount badge, Alert warning, disabled button |

---

## 9. Nierozwiązane kwestie (do decyzji post-MVP)

1. **TipTap bundle size** - benchmark w produkcji (target < 100KB gzipped)
2. **Search functionality** - full-text search po treści briefów
3. **Notification system** - email notifications dla nowych komentarzy/statusów
4. **Brief archiving** - soft delete z restore capability
5. **Mobile gestures** - swipe-to-delete
6. **Analytics tracking** - GA4 lub Posthog
7. **Error logging** - Sentry vs Vercel Analytics
8. **i18n** - next-intl jeśli planowane tłumaczenia
9. **Brief versioning** - historia zmian
10. **Offline support** - PWA capabilities

---

## 10. Podsumowanie

Architektura UI B2Proof MVP została zaprojektowana z myślą o:

1. **Wydajności** - Server Components jako default, lazy loading TipTap, server-side pagination
2. **UX** - Mobile-first, proaktywne UX dla limitów, clear error messages
3. **Dostępności** - ARIA labels, keyboard navigation, semantic HTML
4. **Bezpieczeństwie** - RLS, server-side validation, no XSS vectors
5. **Maintainability** - Feature-based struktura, współdzielone komponenty

Główne przepływy (tworzenie briefu, udostępnianie, status workflow) są zoptymalizowane pod kątem doświadczenia zarówno creatora jak i clienta, z jasnym rozróżnieniem ról i uprawnień.
