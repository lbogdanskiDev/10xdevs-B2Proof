# Plan implementacji widoku Rejestracji

## 1. Przegląd

Widok rejestracji (`/register`) umożliwia nowym użytkownikom utworzenie konta w systemie B2Proof. Formularz zawiera pola: email, hasło, potwierdzenie hasła oraz wybór roli (creator/client). Widok implementuje walidację w czasie rzeczywistym z checklistą wymagań hasła oraz walidację zgodności haseł po stronie klienta.

**Uwaga dotycząca obecnej implementacji:** Na tym etapie rozwoju Supabase Auth nie jest jeszcze zaimplementowane. Rejestracja mockuje zachowanie i zwraca `DEFAULT_USER_PROFILE`. Prawdziwa integracja z Supabase Auth zostanie dodana w późniejszym etapie.

## 2. Routing widoku

- **Ścieżka:** `/register`
- **Plik:** `src/app/(auth)/register/page.tsx`
- **Typ:** Server Component wrapper z Client Component formularzem
- **Ochrona:** Zalogowani użytkownicy są przekierowywani do `/briefs` (obsługiwane przez middleware)

## 3. Struktura komponentów

```
RegisterPage (src/app/(auth)/register/page.tsx)
└── RegisterForm (src/components/auth/RegisterForm.tsx) [Client Component]
    ├── Card (Shadcn/ui) [max-width: 600px, centered]
    │   ├── CardHeader
    │   │   ├── Logo (B2Proof)
    │   │   └── CardTitle ("Create Account")
    │   ├── CardContent
    │   │   └── form
    │   │       ├── EmailField
    │   │       │   ├── Label
    │   │       │   ├── Input (type="email")
    │   │       │   └── ErrorMessage
    │   │       ├── PasswordField
    │   │       │   ├── Label
    │   │       │   ├── InputWrapper
    │   │       │   │   ├── Input (type="password" | "text")
    │   │       │   │   └── ToggleButton (Eye/EyeOff icon)
    │   │       │   └── ErrorMessage
    │   │       ├── PasswordRequirements
    │   │       │   ├── RequirementItem (min 8 characters)
    │   │       │   └── RequirementItem (at least one digit)
    │   │       ├── PasswordConfirmField
    │   │       │   ├── Label
    │   │       │   ├── InputWrapper
    │   │       │   │   ├── Input (type="password" | "text")
    │   │       │   │   └── ToggleButton
    │   │       │   └── ErrorMessage
    │   │       ├── RoleSelect
    │   │       │   ├── Label
    │   │       │   ├── Select (Shadcn/ui)
    │   │       │   └── ErrorMessage
    │   │       └── SubmitButton ("Create Account", loading state)
    │   └── CardFooter
    │       └── Link ("Already have an account? Sign in")
    └── Toaster (dla powiadomień błędów)
```

## 4. Szczegóły komponentów

### 4.1 RegisterPage

- **Opis:** Strona główna widoku rejestracji. Jest to Server Component wrapper renderujący kontener z wycentrowanym formularzem rejestracji.
- **Główne elementy:**
  - `<main>` z klasami do centrowania zawartości (`flex`, `items-center`, `justify-center`, `min-h-screen`, `p-4`)
  - Komponent `RegisterForm`
- **Obsługiwane interakcje:** Brak (delegowane do `RegisterForm`)
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:** Brak

### 4.2 RegisterForm

- **Opis:** Główny komponent formularza rejestracji. Zarządza stanem formularza, walidacją w czasie rzeczywistym i procesem rejestracji. Jest to Client Component ze względu na wymaganą interaktywność.
- **Główne elementy:**
  - `Card` (max-width: 600px, wycentrowany)
  - `CardHeader` z logo B2Proof i tytułem "Create Account"
  - `CardContent` z formularzem HTML zawierającym wszystkie pola
  - `CardFooter` z linkiem do logowania
- **Obsługiwane interakcje:**
  - Wpisywanie we wszystkie pola formularza
  - Toggle widoczności haseł
  - Wybór roli z dropdown
  - Submit formularza
  - Kliknięcie linku do logowania
- **Obsługiwana walidacja:**
  - Email: wymagany, format email, unikalność (server-side)
  - Hasło: wymagane, min 8 znaków, min 1 cyfra
  - Potwierdzenie hasła: wymagane, zgodność z hasłem
  - Rola: wymagana
- **Typy:**
  - `RegisterFormData`
  - `RegisterFormErrors`
  - `PasswordValidation`
- **Propsy:** Brak

### 4.3 EmailField

- **Opis:** Pole formularza dla adresu email z etykietą i komunikatem błędu. Reużywalny komponent pola tekstowego.
- **Główne elementy:**
  - `<div>` wrapper z `space-y-2`
  - `<Label>` z atrybutem `htmlFor`
  - `Input` (type="email", id, name, required, aria-describedby, aria-invalid)
  - `<p>` dla komunikatu błędu (czerwony tekst, `text-sm`)
- **Obsługiwane interakcje:**
  - `onChange` - aktualizacja stanu email, czyszczenie błędu
  - `onBlur` - walidacja formatu email
- **Obsługiwana walidacja:**
  - Pole wymagane: "Email is required"
  - Format email: "Please enter a valid email address"
- **Typy:** Część `RegisterFormData`
- **Propsy:**
  - `value: string`
  - `error: string | undefined`
  - `onChange: (value: string) => void`
  - `onBlur: () => void`
  - `disabled: boolean`

### 4.4 PasswordField

- **Opis:** Pole formularza dla hasła z etykietą, przyciskiem toggle widoczności i komunikatem błędu.
- **Główne elementy:**
  - `<div>` wrapper z `space-y-2`
  - `<Label>` z atrybutem `htmlFor`
  - `<div>` wrapper dla input i toggle (relative positioning)
  - `Input` (type="password" lub "text", aria-describedby, aria-invalid)
  - `Button` (variant="ghost", size="icon", type="button") z ikoną Eye/EyeOff
  - `<p>` dla komunikatu błędu
- **Obsługiwane interakcje:**
  - `onChange` - aktualizacja stanu hasła, aktualizacja checklisty wymagań
  - `onBlur` - walidacja wymagań hasła
  - `onClick` na toggle - zmiana widoczności hasła
- **Obsługiwana walidacja:**
  - Pole wymagane: "Password is required"
  - Min 8 znaków: wyświetlane w checkliście
  - Min 1 cyfra: wyświetlane w checkliście
- **Typy:** Część `RegisterFormData`, `PasswordValidation`
- **Propsy:**
  - `value: string`
  - `error: string | undefined`
  - `showPassword: boolean`
  - `onChange: (value: string) => void`
  - `onBlur: () => void`
  - `onToggleVisibility: () => void`
  - `disabled: boolean`

### 4.5 PasswordRequirements

- **Opis:** Komponent wyświetlający checklistę wymagań hasła w czasie rzeczywistym. Używa ARIA live region dla dostępności.
- **Główne elementy:**
  - `<ul>` wrapper z `aria-live="polite"` i `aria-label="Password requirements"`
  - `<li>` dla każdego wymagania z ikoną ✓/✗ (Check/X z lucide-react)
  - Ikona i tekst z odpowiednim kolorem (zielony dla spełnionych, szary/czerwony dla niespełnionych)
- **Obsługiwane interakcje:** Brak (komponent prezentacyjny)
- **Obsługiwana walidacja:** Brak (tylko wyświetla stan)
- **Typy:** `PasswordValidation`
- **Propsy:**
  - `validation: PasswordValidation`

### 4.6 PasswordConfirmField

- **Opis:** Pole formularza dla potwierdzenia hasła. Walidowane tylko client-side, nie wysyłane do backendu.
- **Główne elementy:**
  - `<div>` wrapper z `space-y-2`
  - `<Label>` z atrybutem `htmlFor`
  - `<div>` wrapper dla input i toggle
  - `Input` (type="password" lub "text")
  - `Button` toggle widoczności
  - `<p>` dla komunikatu błędu
- **Obsługiwane interakcje:**
  - `onChange` - aktualizacja stanu, walidacja zgodności
  - `onBlur` - walidacja zgodności z hasłem
  - `onClick` na toggle - zmiana widoczności
- **Obsługiwana walidacja:**
  - Pole wymagane: "Password confirmation is required"
  - Zgodność z hasłem: "Passwords do not match"
- **Typy:** Część `RegisterFormData`
- **Propsy:**
  - `value: string`
  - `password: string` (do porównania)
  - `error: string | undefined`
  - `showPassword: boolean`
  - `onChange: (value: string) => void`
  - `onBlur: () => void`
  - `onToggleVisibility: () => void`
  - `disabled: boolean`

### 4.7 RoleSelect

- **Opis:** Pole wyboru roli użytkownika (Creator/Client) przy użyciu komponentu Select z Shadcn/ui.
- **Główne elementy:**
  - `<div>` wrapper z `space-y-2`
  - `<Label>` z atrybutem `htmlFor`
  - `Select` (Shadcn/ui)
    - `SelectTrigger` z placeholder "Select your role"
    - `SelectContent`
      - `SelectItem` value="creator" - "I'm a Creator"
      - `SelectItem` value="client" - "I'm a Client"
  - `<p>` dla komunikatu błędu
- **Obsługiwane interakcje:**
  - `onValueChange` - aktualizacja wybranej roli, czyszczenie błędu
- **Obsługiwana walidacja:**
  - Rola wymagana: "Please select a role"
- **Typy:** `UserRole` z `@/types`
- **Propsy:**
  - `value: UserRole | ""`
  - `error: string | undefined`
  - `onChange: (value: UserRole) => void`
  - `disabled: boolean`

### 4.8 SubmitButton

- **Opis:** Przycisk submit formularza z obsługą stanu ładowania i disabled gdy formularz jest niepoprawny.
- **Główne elementy:**
  - `Button` (variant="default", type="submit", className="w-full")
  - Loading spinner (Loader2 z lucide-react z animacją spin) gdy `isSubmitting`
  - Tekst "Create Account" lub "Creating Account..." podczas ładowania
- **Obsługiwane interakcje:**
  - `onClick` / submit - wysłanie formularza
- **Obsługiwana walidacja:** Brak (tylko sprawdza czy jest disabled)
- **Typy:** Brak
- **Propsy:**
  - `isSubmitting: boolean`
  - `disabled: boolean`

## 5. Typy

### 5.1 RegisterFormData

```typescript
interface RegisterFormData {
  email: string;
  password: string;
  passwordConfirm: string;
  role: UserRole | "";
}
```

### 5.2 RegisterFormErrors

```typescript
interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  role?: string;
}
```

### 5.3 PasswordValidation

```typescript
interface PasswordValidation {
  hasMinLength: boolean; // >= 8 znaków
  hasDigit: boolean; // zawiera co najmniej 1 cyfrę
}
```

### 5.4 RegisterCommand (do API)

```typescript
interface RegisterCommand {
  email: string;
  password: string;
  role: UserRole;
}
```

**Uwaga:** `passwordConfirm` nie jest wysyłane do backendu - walidacja tylko client-side.

### 5.5 Zod Schema

```typescript
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain at least one digit"),
  role: z.enum(["creator", "client"], {
    errorMap: () => ({ message: "Please select a role" }),
  }),
});

export const registerFormSchema = registerSchema
  .extend({
    passwordConfirm: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });

export type RegisterFormData = z.infer<typeof registerFormSchema>;
export type RegisterCommand = z.infer<typeof registerSchema>;
```

## 6. Zarządzanie stanem

### 6.1 Stan lokalny komponentu

Stan formularza będzie zarządzany lokalnie w komponencie `RegisterForm` przy użyciu `useState`:

```typescript
// Dane formularza
const [formData, setFormData] = useState<RegisterFormData>({
  email: "",
  password: "",
  passwordConfirm: "",
  role: "",
});

// Błędy walidacji
const [errors, setErrors] = useState<RegisterFormErrors>({});

// Stan UI
const [isSubmitting, setIsSubmitting] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

// Walidacja hasła w czasie rzeczywistym (derived state)
const passwordValidation: PasswordValidation = useMemo(
  () => ({
    hasMinLength: formData.password.length >= 8,
    hasDigit: /\d/.test(formData.password),
  }),
  [formData.password]
);
```

### 6.2 Custom Hook (opcjonalnie)

Można wyodrębnić logikę formularza do custom hooka `useRegisterForm`:

```typescript
// src/components/hooks/useRegisterForm.ts
export function useRegisterForm() {
  // Stan formularza
  // Funkcje walidacji
  // Handler submit
  // Computed: passwordValidation, isFormValid
  // Return: { formData, errors, isSubmitting, passwordValidation, handlers, ... }
}
```

Hook jest zalecany dla zachowania spójności z innymi formularzami w aplikacji i lepszej testowalności.

### 6.3 Computed Values

```typescript
// Czy formularz jest poprawny (do disabled na przycisku submit)
const isFormValid = useMemo(() => {
  return (
    formData.email.trim() !== "" &&
    formData.password.length >= 8 &&
    /\d/.test(formData.password) &&
    formData.password === formData.passwordConfirm &&
    (formData.role === "creator" || formData.role === "client") &&
    Object.keys(errors).length === 0
  );
}, [formData, errors]);
```

## 7. Integracja API

### 7.1 Mock rejestracji (obecna implementacja)

Na obecnym etapie rozwoju Supabase Auth nie jest zaimplementowane. Rejestracja działa w trybie mock:

```typescript
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";

async function handleRegister(data: RegisterCommand): Promise<void> {
  // Symulacja opóźnienia sieciowego
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock: rejestracja zawsze kończy się sukcesem
  // W przyszłości tutaj będzie wywołanie Supabase Auth:
  // const { error } = await supabase.auth.signUp({
  //   email: data.email,
  //   password: data.password,
  //   options: { data: { role: data.role } }
  // })

  console.log("Mock registration successful, user:", {
    ...DEFAULT_USER_PROFILE,
    email: data.email,
    role: data.role,
  });
}
```

### 7.2 Przyszła implementacja (Supabase Auth)

W przyszłości rejestracja będzie wykorzystywać metodę `signUp` z Supabase Auth:

```typescript
import { createSupabaseBrowserClient } from "@/db/supabase.client";

async function handleRegister(data: RegisterCommand): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        role: data.role,
      },
    },
  });

  if (error) {
    throw error;
  }
}
```

### 7.3 Przekierowanie po rejestracji

Po pomyślnej rejestracji użytkownik jest automatycznie zalogowany i przekierowywany do `/briefs`:

```typescript
import { useRouter } from "next/navigation";

const router = useRouter();
// Po pomyślnej rejestracji:
router.push("/briefs");
```

## 8. Interakcje użytkownika

| Interakcja             | Element         | Akcja                                                                                |
| ---------------------- | --------------- | ------------------------------------------------------------------------------------ |
| Wpisanie email         | Input email     | Aktualizacja `formData.email`, czyszczenie błędu pola                                |
| Blur na email          | Input email     | Walidacja formatu email, ustawienie błędu jeśli niepoprawny                          |
| Wpisanie hasła         | Input password  | Aktualizacja `formData.password`, aktualizacja checklisty wymagań, czyszczenie błędu |
| Blur na hasło          | Input password  | Walidacja wymagań hasła                                                              |
| Toggle hasła           | Button Eye      | Toggle `showPassword`, zmiana type input                                             |
| Wpisanie potwierdzenia | Input confirm   | Aktualizacja `formData.passwordConfirm`, walidacja zgodności                         |
| Blur na potwierdzenie  | Input confirm   | Walidacja zgodności z hasłem                                                         |
| Toggle potwierdzenia   | Button Eye      | Toggle `showPasswordConfirm`                                                         |
| Wybór roli             | Select          | Aktualizacja `formData.role`, czyszczenie błędu                                      |
| Submit formularza      | Form / Button   | Walidacja wszystkich pól, mock rejestracja, redirect do /briefs                      |
| Enter w formularzu     | Input (dowolny) | Submit formularza                                                                    |
| Kliknięcie "Sign in"   | Link            | Nawigacja do `/login`                                                                |

## 9. Warunki i walidacja

### 9.1 Walidacja client-side

| Pole            | Warunek      | Komunikat błędu                                    | Kiedy walidowane           |
| --------------- | ------------ | -------------------------------------------------- | -------------------------- |
| Email           | Niepuste     | "Email is required"                                | onBlur, onSubmit           |
| Email           | Format email | "Please enter a valid email address"               | onBlur, onSubmit           |
| Password        | Niepuste     | "Password is required"                             | onBlur, onSubmit           |
| Password        | Min 8 znaków | Wyświetlane w checkliście (✗ Minimum 8 characters) | Real-time                  |
| Password        | Min 1 cyfra  | Wyświetlane w checkliście (✗ At least one digit)   | Real-time                  |
| PasswordConfirm | Niepuste     | "Password confirmation is required"                | onBlur, onSubmit           |
| PasswordConfirm | Zgodność     | "Passwords do not match"                           | onChange, onBlur, onSubmit |
| Role            | Wybrana      | "Please select a role"                             | onSubmit                   |

### 9.2 Walidacja server-side (przyszła implementacja)

| Pole  | Warunek    | Komunikat błędu                    | Sposób wyświetlenia          |
| ----- | ---------- | ---------------------------------- | ---------------------------- |
| Email | Unikalność | "This email is already registered" | Inline error pod polem email |

### 9.3 Funkcje walidacji

```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return "Email is required";
  }
  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address";
  }
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Password is required";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/\d/.test(password)) {
    return "Password must contain at least one digit";
  }
  return undefined;
}

function validatePasswordConfirm(password: string, confirm: string): string | undefined {
  if (!confirm) {
    return "Password confirmation is required";
  }
  if (password !== confirm) {
    return "Passwords do not match";
  }
  return undefined;
}

function validateRole(role: string): string | undefined {
  if (!role || (role !== "creator" && role !== "client")) {
    return "Please select a role";
  }
  return undefined;
}
```

### 9.4 Wpływ na stan UI

- Przycisk "Create Account" jest **disabled** gdy:
  - Formularz jest niepoprawny (brakujące pola, niespełnione wymagania)
  - Trwa wysyłanie (`isSubmitting`)
- Błędy walidacji są wyświetlane pod odpowiednimi polami (czerwony tekst)
- Pola z błędami mają `aria-invalid="true"`
- Checklist wymagań hasła aktualizuje się w czasie rzeczywistym
- Przycisk pokazuje loading spinner podczas `isSubmitting`

## 10. Obsługa błędów

### 10.1 Błędy walidacji client-side

- Wyświetlane bezpośrednio pod polem formularza
- Czerwony tekst (`text-destructive`), mała czcionka (`text-sm`)
- Powiązane z polem przez `aria-describedby`
- Ikona ostrzeżenia opcjonalnie

### 10.2 Mock - brak błędów serwera (obecna implementacja)

Na obecnym etapie rejestracja zawsze kończy się sukcesem po przejściu walidacji client-side. Błędy serwera nie występują.

### 10.3 Przyszłe błędy serwera (Supabase Auth)

| Kod błędu                | Komunikat dla użytkownika                 | Sposób wyświetlenia          |
| ------------------------ | ----------------------------------------- | ---------------------------- |
| 400 Email already exists | "This email is already registered"        | Inline error pod polem email |
| 400 Validation errors    | Odpowiednie komunikaty                    | Inline errors przy polach    |
| 500 Server error         | "Something went wrong. Please try again." | Toast error                  |

### 10.4 Implementacja obsługi błędów

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  // Walidacja client-side
  const validationErrors = validateForm(formData);
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }

  setIsSubmitting(true);

  try {
    await handleRegister({
      email: formData.email,
      password: formData.password,
      role: formData.role as UserRole,
    });
    // Mock: zawsze sukces
    router.push("/briefs");
  } catch (error) {
    // Na obecnym etapie błędy nie występują
    // W przyszłości: obsługa błędów Supabase Auth
    if (error instanceof Error) {
      if (error.message.includes("already registered")) {
        setErrors({ email: "This email is already registered" });
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  } finally {
    setIsSubmitting(false);
  }
}
```

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

1. Upewnij się, że istnieje folder `src/app/(auth)/`
2. Utwórz folder `src/app/(auth)/register/`
3. Utwórz plik `src/app/(auth)/register/page.tsx`
4. Upewnij się, że istnieje folder `src/components/auth/`
5. Utwórz plik `src/components/auth/RegisterForm.tsx`
6. Utwórz plik `src/components/auth/PasswordRequirements.tsx`

### Krok 2: Weryfikacja zależności

1. Sprawdź czy zainstalowane są:
   - `lucide-react` (dla ikon Eye/EyeOff, Check, X, Loader2)
   - `sonner` (dla toast notifications)
2. Sprawdź czy Toaster jest dodany do root layout

### Krok 3: Implementacja RegisterPage

```tsx
// src/app/(auth)/register/page.tsx
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <RegisterForm />
    </main>
  );
}
```

### Krok 4: Implementacja PasswordRequirements

1. Utwórz komponent jako prezentacyjny (bez stanu)
2. Przyjmuj `validation: PasswordValidation` jako prop
3. Renderuj listę `<ul>` z `aria-live="polite"`
4. Dla każdego wymagania renderuj `<li>` z:
   - Ikoną Check (zielona) lub X (szara/czerwona)
   - Tekstem wymagania
   - Odpowiednimi klasami kolorów

### Krok 5: Implementacja RegisterForm

1. Utwórz komponent jako Client Component (`"use client"`)
2. Zaimplementuj stan formularza (`useState`)
3. Zaimplementuj `passwordValidation` jako `useMemo`
4. Zaimplementuj strukturę Card z Shadcn/ui:
   - CardHeader z logo i tytułem
   - CardContent z formularzem
   - CardFooter z linkiem do logowania
5. Dodaj wszystkie pola formularza w odpowiedniej kolejności

### Krok 6: Implementacja pól formularza

1. **Email Field:**
   - Label + Input type="email" + ErrorMessage
   - Obsługa onChange, onBlur
   - Walidacja formatu email

2. **Password Field:**
   - Label + Input type="password/text" + Toggle + ErrorMessage
   - Obsługa onChange (aktualizuje też checklistę), onBlur, onToggle

3. **PasswordRequirements:**
   - Umieść bezpośrednio pod Password Field
   - Przekaż computed `passwordValidation`

4. **Password Confirm Field:**
   - Label + Input type="password/text" + Toggle + ErrorMessage
   - Walidacja zgodności z password

5. **Role Select:**
   - Label + Select (Shadcn/ui) + ErrorMessage
   - Opcje: "I'm a Creator" / "I'm a Client"

6. **Submit Button:**
   - Button z loading state
   - Disabled gdy formularz niepoprawny lub isSubmitting

### Krok 7: Implementacja walidacji

1. Utwórz funkcje walidacji dla każdego pola
2. Podłącz walidację do onBlur dla pól tekstowych
3. Dla password confirmation - waliduj też na onChange
4. Implementuj pełną walidację w handleSubmit

### Krok 8: Implementacja mock rejestracji

1. Zaimportuj `DEFAULT_USER_PROFILE` z `@/db/supabase.client`
2. Zaimplementuj funkcję `handleRegister` symulującą rejestrację
3. Po walidacji zawsze przekieruj do `/briefs`
4. Dodaj komentarz TODO dla przyszłej integracji z Supabase Auth

### Krok 9: Dostępność

1. Dodaj `Label` z `htmlFor` dla każdego pola
2. Dodaj `aria-describedby` dla komunikatów błędów
3. Dodaj `aria-invalid` dla pól z błędami
4. Dodaj `aria-live="polite"` dla PasswordRequirements
5. Dodaj `aria-label` dla przycisków toggle hasła
6. Upewnij się, że Enter submituje formularz
7. Ustaw focus na pierwszym polu z błędem po nieudanej walidacji

### Krok 10: Stylowanie

1. Użyj klas Tailwind zgodnych z design systemem
2. Card: max-width 600px, centered
3. Pola formularza: space-y-4 między polami
4. Błędy: text-destructive, text-sm
5. Checklist wymagań: text-sm, kolory zielony/szary
6. Responsywność: padding na mobile (p-4)

### Krok 11: Testy i walidacja

1. Przetestuj wszystkie scenariusze walidacji:
   - Puste pola
   - Niepoprawny format email
   - Hasło < 8 znaków
   - Hasło bez cyfry
   - Niezgodne hasła
   - Brak wyboru roli
2. Przetestuj pomyślną rejestrację (redirect do /briefs)
3. Przetestuj dostępność (nawigacja klawiaturą, screen reader)
4. Przetestuj responsywność (mobile-first)
5. Przetestuj real-time aktualizację checklisty wymagań hasła
