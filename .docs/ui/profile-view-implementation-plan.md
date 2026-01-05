# Plan implementacji widoku Profil użytkownika

## 1. Przegląd

Widok profilu użytkownika (`/profile`) umożliwia zalogowanemu użytkownikowi zarządzanie swoim kontem. Składa się z trzech głównych sekcji:

1. **Account Information** - wyświetlenie informacji o koncie (read-only)
2. **Change Password** - formularz zmiany hasła z walidacją
3. **Danger Zone** - sekcja usunięcia konta z podwójnym potwierdzeniem

Widok jest responsywny z maksymalną szerokością 768px, wycentrowany na stronie.

## 2. Routing widoku

**Ścieżka:** `/profile`

**Lokalizacja pliku:** `src/app/(dashboard)/profile/page.tsx`

Widok jest częścią grupy routingu `(dashboard)`, więc korzysta z istniejącego layoutu `DashboardLayout` z nawigacją, sidebar i topbar.

## 3. Struktura komponentów

```
ProfilePage (Server Component)
└── ProfilePageClient (Client Component)
    ├── AccountInfoCard
    │   └── Badge (rola użytkownika)
    ├── ChangePasswordCard
    │   ├── Input (Current Password)
    │   ├── Input (New Password)
    │   ├── PasswordRequirements
    │   ├── Input (Confirm Password)
    │   └── Button (Update Password)
    └── DangerZoneCard
        ├── Button (Delete My Account)
        └── DeleteAccountDialog
            ├── AlertDialogContent
            ├── Input (email verification)
            └── AlertDialogFooter (Cancel / Delete)
```

## 4. Szczegóły komponentów

### ProfilePage (Server Component)

- **Opis:** Komponent strony serwera, który pobiera dane użytkownika i przekazuje je do komponentu klienta.
- **Główne elementy:** Wrapper przekazujący `UserProfileDto` do `ProfilePageClient`.
- **Obsługiwane interakcje:** Brak (Server Component).
- **Obsługiwana walidacja:** Brak.
- **Typy:** `UserProfileDto`.
- **Propsy:** Brak (page component).

### ProfilePageClient

- **Opis:** Główny komponent klienta zawierający wszystkie trzy sekcje profilu. Zarządza stanem formularzy i komunikacją z API.
- **Główne elementy:**
  - `div` z `max-w-3xl mx-auto` dla centrowania
  - Nagłówek strony z tytułem "Profile"
  - `AccountInfoCard`
  - `ChangePasswordCard`
  - `DangerZoneCard`
- **Obsługiwane interakcje:** Brak bezpośrednich (delegowane do dzieci).
- **Obsługiwana walidacja:** Brak (delegowana do dzieci).
- **Typy:** `UserProfileDto`, `ChangePasswordFormData`, `DeleteAccountState`.
- **Propsy:**
  - `user: UserProfileDto` - dane zalogowanego użytkownika

### AccountInfoCard

- **Opis:** Karta wyświetlająca informacje o koncie użytkownika w trybie tylko do odczytu.
- **Główne elementy:**
  - `Card`, `CardHeader`, `CardTitle`, `CardContent`
  - Wiersz z etykietą "Email" i wartością `user.email`
  - Wiersz z etykietą "Role" i `Badge` z rolą (Creator/Client)
  - Wiersz z etykietą "Member since" i sformatowaną datą `user.createdAt`
- **Obsługiwane interakcje:** Brak (read-only).
- **Obsługiwana walidacja:** Brak.
- **Typy:** `UserProfileDto`, `UserRole`.
- **Propsy:**
  - `email: string`
  - `role: UserRole`
  - `createdAt: string`

### ChangePasswordCard

- **Opis:** Karta z formularzem zmiany hasła. Zawiera walidację po stronie klienta i komunikację z Supabase Auth.
- **Główne elementy:**
  - `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
  - `form` z `onSubmit`
  - `Input` typu `password` dla aktualnego hasła
  - `Input` typu `password` dla nowego hasła
  - `PasswordRequirements` - lista wymagań z checklistą
  - `Input` typu `password` dla potwierdzenia hasła
  - `Button` typu `submit` z loading state
  - Komunikaty błędów inline
- **Obsługiwane interakcje:**
  - `onChange` na polach formularza
  - `onSubmit` formularza
  - Toggle widoczności hasła (opcjonalnie)
- **Obsługiwana walidacja:**
  - `currentPassword`: wymagane, niepuste
  - `newPassword`: min. 8 znaków, min. 1 cyfra
  - `confirmPassword`: musi być identyczne z `newPassword`
  - Walidacja w czasie rzeczywistym dla checklisty wymagań
- **Typy:** `ChangePasswordFormData`, `PasswordValidationState`.
- **Propsy:** Brak (stan wewnętrzny).

### PasswordRequirements

- **Opis:** Komponent wyświetlający checklistę wymagań hasła z wizualnym feedbackiem.
- **Główne elementy:**
  - `ul` z listą wymagań
  - `li` z ikoną check/x i tekstem wymagania
  - Kolorowanie: zielony dla spełnionych, szary/czerwony dla niespełnionych
- **Obsługiwane interakcje:** Brak (read-only).
- **Obsługiwana walidacja:** Brak (tylko wyświetlanie stanu).
- **Typy:** `PasswordValidationState`.
- **Propsy:**
  - `password: string` - aktualna wartość nowego hasła
  - `validation: PasswordValidationState` - stan walidacji

### DangerZoneCard

- **Opis:** Karta z ostrzeżeniem i przyciskiem usunięcia konta. Otwiera dialog potwierdzenia.
- **Główne elementy:**
  - `Card` z `border-destructive` styling
  - `CardHeader` z tytułem "Danger Zone"
  - `CardContent` z tekstem ostrzeżenia
  - `Button` variant="destructive" otwierający dialog
  - `DeleteAccountDialog`
- **Obsługiwane interakcje:**
  - `onClick` na przycisku "Delete My Account"
- **Obsługiwana walidacja:** Brak (delegowana do dialogu).
- **Typy:** `DeleteAccountState`.
- **Propsy:**
  - `userEmail: string` - email użytkownika do weryfikacji

### DeleteAccountDialog

- **Opis:** Dialog podwójnego potwierdzenia usunięcia konta z weryfikacją email.
- **Główne elementy:**
  - `AlertDialog`, `AlertDialogContent`
  - `AlertDialogHeader` z tytułem "Delete Account?"
  - `AlertDialogDescription` z ostrzeżeniem o nieodwracalności
  - `Input` do wpisania emaila weryfikacyjnego
  - `AlertDialogFooter` z przyciskami Cancel i Delete Account
  - `Button` Delete Account - disabled dopóki email nie pasuje
- **Obsługiwane interakcje:**
  - `onChange` na polu email weryfikacyjnego
  - `onClick` na Cancel (zamknięcie dialogu)
  - `onClick` na Delete Account (wywołanie API)
- **Obsługiwana walidacja:**
  - `confirmEmail === user.email` - przycisk Delete aktywny tylko gdy email się zgadza
- **Typy:** `DeleteAccountState`.
- **Propsy:**
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `userEmail: string`
  - `onConfirm: () => Promise<void>`
  - `isDeleting: boolean`

## 5. Typy

### Istniejące typy (z `src/types.ts`)

```typescript
// UserProfileDto - dane profilu użytkownika
interface UserProfileDto {
  id: string;
  email: string;
  role: UserRole; // "creator" | "client"
  createdAt: string;
  updatedAt: string;
}

// UserRole - rola użytkownika
type UserRole = "creator" | "client";

// ErrorReturn - standardowa odpowiedź błędu API
interface ErrorReturn {
  error: string;
  details?: ValidationErrorDetail[];
}
```

### Nowe typy (do utworzenia w `src/lib/types/profile.types.ts`)

```typescript
// Dane formularza zmiany hasła
interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Stan walidacji hasła dla checklisty
interface PasswordValidationState {
  minLength: boolean; // min. 8 znaków
  hasDigit: boolean; // min. 1 cyfra
  passwordsMatch: boolean; // newPassword === confirmPassword
}

// Stan formularza zmiany hasła
interface ChangePasswordFormState {
  data: ChangePasswordFormData;
  validation: PasswordValidationState;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}

// Stan usuwania konta
interface DeleteAccountState {
  confirmEmail: string;
  isDialogOpen: boolean;
  isDeleting: boolean;
  error: string | null;
}

// Propsy dla AccountInfoCard
interface AccountInfoCardProps {
  email: string;
  role: UserRole;
  createdAt: string;
}

// Propsy dla PasswordRequirements
interface PasswordRequirementsProps {
  password: string;
}

// Propsy dla DeleteAccountDialog
interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}
```

### Schema walidacji Zod (do utworzenia w `src/lib/schemas/profile.schema.ts`)

```typescript
import { z } from "zod";

// Schema walidacji zmiany hasła
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one digit"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

## 6. Zarządzanie stanem

### Custom Hook: `useChangePassword`

```typescript
// Lokalizacja: src/components/hooks/useChangePassword.ts

interface UseChangePasswordReturn {
  // Stan formularza
  formData: ChangePasswordFormData;
  validation: PasswordValidationState;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;

  // Akcje
  setField: (field: keyof ChangePasswordFormData, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}
```

**Odpowiedzialności:**

- Zarządzanie stanem formularza zmiany hasła
- Walidacja w czasie rzeczywistym (dla checklisty)
- Walidacja przy submit (pełna walidacja Zod)
- Wywołanie Supabase Auth `updateUser`
- Obsługa błędów i sukcesu

### Custom Hook: `useDeleteAccount`

```typescript
// Lokalizacja: src/components/hooks/useDeleteAccount.ts

interface UseDeleteAccountProps {
  userEmail: string;
}

interface UseDeleteAccountReturn {
  // Stan
  confirmEmail: string;
  isDialogOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  canDelete: boolean; // confirmEmail === userEmail

  // Akcje
  setConfirmEmail: (email: string) => void;
  openDialog: () => void;
  closeDialog: () => void;
  handleDelete: () => Promise<void>;
}
```

**Odpowiedzialności:**

- Zarządzanie stanem dialogu
- Walidacja emaila potwierdzającego
- Wywołanie API `DELETE /api/users/me`
- Wylogowanie i redirect po usunięciu

### Wykorzystanie istniejącego kontekstu `AuthContext`

Hook `useAuth` z `src/components/hooks/use-auth.tsx` dostarcza:

- `user: UserProfileDto | null` - dane zalogowanego użytkownika
- `logout: () => Promise<void>` - funkcja wylogowania

## 7. Integracja API

### GET /api/users/me

**Wykorzystanie:** Pobieranie danych użytkownika (jeśli nie przekazane z Server Component).

**Request:**

- Method: `GET`
- Headers: `Authorization: Bearer {token}` (automatycznie przez Supabase)

**Response (200 OK):**

```typescript
UserProfileDto {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
```

**Błędy:**

- `401 Unauthorized`
- `404 Not Found`
- `500 Internal Server Error`

### DELETE /api/users/me

**Wykorzystanie:** Usunięcie konta użytkownika.

**Request:**

- Method: `DELETE`
- Headers: `Authorization: Bearer {token}`

**Response:**

- `204 No Content` - sukces

**Błędy:**

- `401 Unauthorized` - nieprawidłowy token
- `404 Not Found` - użytkownik nie istnieje
- `500 Internal Server Error` - błąd serwera

### Supabase Auth - Change Password

**Wykorzystanie:** Zmiana hasła (client-side SDK).

```typescript
const supabase = createSupabaseBrowserClient();

// Zmiana hasła
const { data, error } = await supabase.auth.updateUser({
  password: newPassword,
});

// Możliwe błędy:
// - "New password should be different from the old password"
// - "Password should be at least 6 characters"
// - Inne błędy Supabase Auth
```

**Uwaga:** Supabase Auth nie wymaga podania aktualnego hasła przy zmianie przez zalogowanego użytkownika. Jednak dla bezpieczeństwa UX, formularz wymaga podania aktualnego hasła i można dodać walidację po stronie serwera.

## 8. Interakcje użytkownika

### Sekcja Account Information

1. Użytkownik widzi swój email, rolę (Badge) i datę rejestracji.
2. Wszystkie pola są read-only - brak interakcji.

### Sekcja Change Password

1. Użytkownik wpisuje aktualne hasło.
2. Użytkownik wpisuje nowe hasło:
   - Checklista wymagań aktualizuje się w czasie rzeczywistym
   - Zielone checkmarki dla spełnionych wymagań
3. Użytkownik wpisuje potwierdzenie hasła:
   - Walidacja zgodności w czasie rzeczywistym
4. Użytkownik klika "Update Password":
   - Przycisk przechodzi w loading state
   - Walidacja formularza
   - Wywołanie Supabase Auth
   - Sukces: toast "Password updated successfully", reset formularza
   - Błąd: inline error message

### Sekcja Danger Zone

1. Użytkownik klika "Delete My Account".
2. Otwiera się dialog potwierdzenia:
   - Tytuł: "Delete Account?"
   - Opis ostrzegawczy
   - Pole do wpisania emaila
3. Użytkownik wpisuje swój email:
   - Przycisk "Delete Account" aktywny tylko gdy email się zgadza
4. Użytkownik klika "Delete Account":
   - Przycisk przechodzi w loading state
   - Wywołanie `DELETE /api/users/me`
   - Wywołanie `supabase.auth.signOut()`
   - Redirect do `/login`
5. Użytkownik może kliknąć "Cancel" aby zamknąć dialog.

## 9. Warunki i walidacja

### Walidacja zmiany hasła

| Pole            | Warunek           | Komunikat błędu                            | Wpływ na UI               |
| --------------- | ----------------- | ------------------------------------------ | ------------------------- |
| currentPassword | Niepuste          | "Current password is required"             | Inline error pod polem    |
| newPassword     | Min. 8 znaków     | "Password must be at least 8 characters"   | Checklista + inline error |
| newPassword     | Min. 1 cyfra      | "Password must contain at least one digit" | Checklista + inline error |
| confirmPassword | Równe newPassword | "Passwords do not match"                   | Inline error pod polem    |

**Checklista wymagań (real-time):**

- ✓/✗ At least 8 characters
- ✓/✗ Contains at least one number
- ✓/✗ Passwords match (wyświetlane gdy confirmPassword niepuste)

### Walidacja usunięcia konta

| Pole         | Warunek          | Wpływ na UI                                       |
| ------------ | ---------------- | ------------------------------------------------- |
| confirmEmail | Równe user.email | Przycisk "Delete Account" disabled gdy nie pasuje |

## 10. Obsługa błędów

### Błędy zmiany hasła

| Błąd                               | Źródło          | Obsługa                            |
| ---------------------------------- | --------------- | ---------------------------------- |
| Walidacja formularza               | Client-side Zod | Inline errors przy polach          |
| "New password should be different" | Supabase Auth   | Inline error przy newPassword      |
| "Password too weak"                | Supabase Auth   | Inline error przy newPassword      |
| Błąd sieci                         | Fetch/Supabase  | Toast error + możliwość ponowienia |
| Nieznany błąd                      | Supabase Auth   | Toast error z ogólnym komunikatem  |

### Błędy usunięcia konta

| Błąd           | Kod HTTP | Obsługa                                                   |
| -------------- | -------- | --------------------------------------------------------- |
| Unauthorized   | 401      | Toast error, redirect do /login                           |
| User not found | 404      | Toast error "Account not found"                           |
| Server error   | 500      | Toast error "Failed to delete account. Please try again." |
| Network error  | -        | Toast error + dialog pozostaje otwarty                    |

### Obsługa stanów ładowania

1. **Change Password:**
   - Przycisk "Update Password" pokazuje spinner i tekst "Updating..."
   - Pola formularza disabled podczas submitu

2. **Delete Account:**
   - Przycisk "Delete Account" w dialogu pokazuje spinner
   - Pole email verification disabled podczas usuwania
   - Przycisk Cancel disabled podczas usuwania

## 11. Kroki implementacji

### Krok 1: Utworzenie typów i schematów

1. Utworzyć plik `src/lib/types/profile.types.ts` z typami dla widoku profilu.
2. Utworzyć plik `src/lib/schemas/profile.schema.ts` ze schematem Zod dla walidacji hasła.

### Krok 2: Utworzenie custom hooków

1. Utworzyć `src/components/hooks/useChangePassword.ts`:
   - Zarządzanie stanem formularza
   - Walidacja real-time i przy submit
   - Integracja z Supabase Auth
2. Utworzyć `src/components/hooks/useDeleteAccount.ts`:
   - Zarządzanie stanem dialogu
   - Walidacja emaila
   - Integracja z API delete

### Krok 3: Utworzenie komponentów pomocniczych

1. Utworzyć `src/components/profile/PasswordRequirements.tsx`:
   - Checklista wymagań hasła
   - Wizualne oznaczenie spełnionych/niespełnionych wymagań

### Krok 4: Utworzenie komponentów kart

1. Utworzyć `src/components/profile/AccountInfoCard.tsx`:
   - Wyświetlanie email, roli (Badge), daty rejestracji
2. Utworzyć `src/components/profile/ChangePasswordCard.tsx`:
   - Formularz zmiany hasła
   - Integracja z `useChangePassword`
3. Utworzyć `src/components/profile/DangerZoneCard.tsx`:
   - Karta z ostrzeżeniem
   - Przycisk otwierający dialog

### Krok 5: Utworzenie dialogu usunięcia konta

1. Utworzyć `src/components/profile/DeleteAccountDialog.tsx`:
   - AlertDialog z podwójnym potwierdzeniem
   - Pole weryfikacji emaila
   - Integracja z `useDeleteAccount`

### Krok 6: Utworzenie głównych komponentów strony

1. Utworzyć `src/app/(dashboard)/profile/page.tsx` (Server Component):
   - Pobieranie danych użytkownika
   - Przekazanie do ProfilePageClient
2. Utworzyć `src/components/profile/ProfilePageClient.tsx` (Client Component):
   - Kompozycja wszystkich kart
   - Layout z max-width i centrowaniem

### Krok 7: Utworzenie plików pomocniczych

1. Utworzyć `src/app/(dashboard)/profile/loading.tsx`:
   - Skeleton loading state
2. Utworzyć `src/app/(dashboard)/profile/error.tsx`:
   - Error boundary dla błędów strony

### Krok 8: Testowanie

1. Przetestować wyświetlanie danych użytkownika.
2. Przetestować walidację formularza zmiany hasła.
3. Przetestować zmianę hasła przez Supabase Auth.
4. Przetestować dialog usunięcia konta.
5. Przetestować usunięcie konta i redirect.
6. Przetestować obsługę błędów dla wszystkich scenariuszy.
7. Przetestować responsywność widoku.
8. Przetestować dostępność (keyboard navigation, ARIA).

### Krok 9: Aktualizacja nawigacji

1. Upewnić się, że link do `/profile` jest dostępny w nawigacji (Sidebar, MobileNav).
2. Dodać odpowiednią ikonę (User lub Settings) jeśli brak.
