# Plan implementacji widoku Logowania

## 1. Przegląd

Widok logowania (`/login`) umożliwia istniejącym użytkownikom uwierzytelnienie się w systemie B2Proof przy użyciu adresu email i hasła. Po pomyślnym zalogowaniu użytkownik jest przekierowywany do listy briefów (`/briefs`). Widok jest prostą, responsywną stroną z formularzem logowania, zbudowaną w oparciu o komponenty Shadcn/ui.

**Uwaga dotycząca obecnej implementacji:** Na tym etapie rozwoju Supabase Auth nie jest jeszcze zaimplementowane. Logowanie zawsze kończy się sukcesem po przejściu walidacji client-side i zwraca `DEFAULT_USER_PROFILE` z `src/db/supabase.client.ts`. Prawdziwa integracja z Supabase Auth zostanie dodana w późniejszym etapie.

## 2. Routing widoku

- **Ścieżka:** `/login`
- **Plik:** `src/app/(auth)/login/page.tsx`
- **Typ:** Client Component (wymaga interaktywności formularza)
- **Ochrona:** Zalogowani użytkownicy są przekierowywani do `/briefs` (obsługiwane przez middleware)

## 3. Struktura komponentów

```
LoginPage (src/app/(auth)/login/page.tsx)
└── LoginForm (src/components/auth/LoginForm.tsx)
    ├── Card (Shadcn/ui)
    │   ├── CardHeader
    │   │   ├── Logo (B2Proof)
    │   │   └── CardTitle
    │   ├── CardContent
    │   │   ├── form
    │   │   │   ├── EmailField
    │   │   │   │   ├── Label
    │   │   │   │   ├── Input (type="email")
    │   │   │   │   └── ErrorMessage
    │   │   │   ├── PasswordField
    │   │   │   │   ├── Label
    │   │   │   │   ├── Input (type="password")
    │   │   │   │   ├── PasswordToggleButton
    │   │   │   │   └── ErrorMessage
    │   │   │   └── Button ("Sign In", loading state)
    │   │   └── ServerErrorMessage
    │   └── CardFooter
    │       └── Link ("Don't have an account? Sign up")
    └── Toaster (dla powiadomień błędów)
```

## 4. Szczegóły komponentów

### 4.1 LoginPage

- **Opis:** Strona główna widoku logowania. Renderuje kontener z wycentrowanym formularzem logowania. Jest to Server Component wrapper, który importuje Client Component `LoginForm`.
- **Główne elementy:**
  - `<main>` z klasami do centrowania zawartości (flex, items-center, justify-center, min-h-screen)
  - Komponent `LoginForm`
- **Obsługiwane interakcje:** Brak (delegowane do `LoginForm`)
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:** Brak

### 4.2 LoginForm

- **Opis:** Główny komponent formularza logowania. Zarządza stanem formularza i walidacją. Na obecnym etapie logowanie zawsze kończy się sukcesem (mock). Jest to Client Component ze względu na interaktywność.
- **Główne elementy:**
  - `Card` (max-width: 600px, wycentrowany)
  - `CardHeader` z logo i tytułem "Sign In"
  - `CardContent` z formularzem HTML
  - Pole email (`Input` type="email")
  - Pole hasła (`Input` type="password") z przyciskiem toggle
  - `Button` "Sign In" z loading state
  - `CardFooter` z linkiem do rejestracji
- **Obsługiwane interakcje:**
  - Wpisywanie w pola email i hasło
  - Kliknięcie przycisku toggle widoczności hasła
  - Submit formularza (kliknięcie przycisku lub Enter)
  - Kliknięcie linku do rejestracji
- **Obsługiwana walidacja:**
  - Email: wymagany, format email (HTML5 validation + custom)
  - Hasło: wymagane, niepuste
  - Walidacja client-side przed wysłaniem
- **Typy:**
  - `LoginFormData` (stan formularza)
  - `LoginFormErrors` (błędy walidacji)
- **Propsy:** Brak

### 4.3 EmailField

- **Opis:** Pole formularza dla adresu email z etykietą i komunikatem błędu.
- **Główne elementy:**
  - `<div>` wrapper
  - `<Label>` dla pola (htmlFor)
  - `Input` (type="email", id, name, required, aria-describedby, aria-invalid)
  - `<p>` dla komunikatu błędu (id dla aria-describedby)
- **Obsługiwane interakcje:**
  - onChange - aktualizacja stanu email
  - onBlur - walidacja formatu email
- **Obsługiwana walidacja:**
  - Pole wymagane
  - Format email (regex)
- **Typy:** Część `LoginFormData`
- **Propsy:**
  - `value: string`
  - `error: string | undefined`
  - `onChange: (value: string) => void`
  - `onBlur: () => void`
  - `disabled: boolean`

### 4.4 PasswordField

- **Opis:** Pole formularza dla hasła z etykietą, toggle widoczności i komunikatem błędu.
- **Główne elementy:**
  - `<div>` wrapper
  - `<Label>` dla pola
  - `<div>` wrapper dla input i toggle (relative positioning)
  - `Input` (type="password" lub "text", aria-describedby, aria-invalid)
  - `Button` (variant="ghost", type="button") z ikoną Eye/EyeOff
  - `<p>` dla komunikatu błędu
- **Obsługiwane interakcje:**
  - onChange - aktualizacja stanu hasła
  - onBlur - walidacja niepustości
  - onClick na toggle - zmiana widoczności hasła
- **Obsługiwana walidacja:**
  - Pole wymagane
- **Typy:** Część `LoginFormData`
- **Propsy:**
  - `value: string`
  - `error: string | undefined`
  - `showPassword: boolean`
  - `onChange: (value: string) => void`
  - `onBlur: () => void`
  - `onToggleVisibility: () => void`
  - `disabled: boolean`

## 5. Typy

### 5.1 LoginFormData

```typescript
interface LoginFormData {
  email: string;
  password: string;
}
```

### 5.2 LoginFormErrors

```typescript
interface LoginFormErrors {
  email?: string;
  password?: string;
}
```

### 5.3 LoginFormState

```typescript
interface LoginFormState {
  data: LoginFormData;
  errors: LoginFormErrors;
  isSubmitting: boolean;
  showPassword: boolean;
  serverError: string | null;
}
```

### 5.4 Zod Schema (opcjonalnie)

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

## 6. Zarządzanie stanem

### 6.1 Stan lokalny komponentu

Stan formularza będzie zarządzany lokalnie w komponencie `LoginForm` przy użyciu `useState`:

```typescript
const [formData, setFormData] = useState<LoginFormData>({
  email: "",
  password: "",
});

const [errors, setErrors] = useState<LoginFormErrors>({});
const [isSubmitting, setIsSubmitting] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [serverError, setServerError] = useState<string | null>(null);
```

### 6.2 Custom Hook (opcjonalnie)

Można wyodrębnić logikę formularza do custom hooka `useLoginForm`:

```typescript
// src/components/hooks/useLoginForm.ts
export function useLoginForm() {
  // Stan formularza
  // Funkcje walidacji
  // Handler submit
  // Return: { formData, errors, isSubmitting, showPassword, handlers }
}
```

Ze względu na prostotę formularza, custom hook nie jest wymagany, ale może być przydatny dla zachowania spójności z innymi formularzami w aplikacji.

## 7. Integracja API

### 7.1 Mock logowania (obecna implementacja)

Na obecnym etapie rozwoju Supabase Auth nie jest zaimplementowane. Logowanie działa w trybie mock:

```typescript
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";

async function handleLogin(data: LoginFormData): Promise<void> {
  // Symulacja opóźnienia sieciowego (opcjonalnie)
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Walidacja przeszła - logowanie zawsze kończy się sukcesem
  // W przyszłości tutaj będzie wywołanie Supabase Auth:
  // const { error } = await supabase.auth.signInWithPassword({...})

  console.log("Mock login successful, user:", DEFAULT_USER_PROFILE);
}
```

### 7.2 Przyszła implementacja (Supabase Auth)

W przyszłości logowanie będzie wykorzystywać metodę `signInWithPassword` z Supabase Auth:

```typescript
import { createSupabaseBrowserClient } from "@/db/supabase.client";

async function handleLogin(data: LoginFormData): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    throw error;
  }
}
```

### 7.3 Przekierowanie po zalogowaniu

Po pomyślnym zalogowaniu (lub po przejściu walidacji w trybie mock) użytkownik jest przekierowywany do `/briefs` przy użyciu `useRouter` z `next/navigation`:

```typescript
import { useRouter } from "next/navigation";

const router = useRouter();
// Po pomyślnym logowaniu:
router.push("/briefs");
```

## 8. Interakcje użytkownika

| Interakcja              | Element           | Akcja                                                              |
| ----------------------- | ----------------- | ------------------------------------------------------------------ |
| Wpisanie email          | Input email       | Aktualizacja `formData.email`, czyszczenie błędu pola              |
| Wpisanie hasła          | Input password    | Aktualizacja `formData.password`, czyszczenie błędu pola           |
| Blur na email           | Input email       | Walidacja formatu email, ustawienie błędu jeśli niepoprawny        |
| Blur na hasło           | Input password    | Walidacja niepustości, ustawienie błędu jeśli puste                |
| Kliknięcie toggle hasła | Button (Eye icon) | Toggle `showPassword`                                              |
| Submit formularza       | Form / Button     | Walidacja wszystkich pól, mock login (sukces), redirect do /briefs |
| Enter w formularzu      | Input (dowolny)   | Submit formularza                                                  |
| Kliknięcie "Sign up"    | Link              | Nawigacja do `/register`                                           |

## 9. Warunki i walidacja

### 9.1 Walidacja client-side

| Pole     | Warunek      | Komunikat błędu                      | Kiedy walidowane |
| -------- | ------------ | ------------------------------------ | ---------------- |
| Email    | Niepuste     | "Email is required"                  | onBlur, onSubmit |
| Email    | Format email | "Please enter a valid email address" | onBlur, onSubmit |
| Password | Niepuste     | "Password is required"               | onBlur, onSubmit |

### 9.2 Walidacja formatu email

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
```

### 9.3 Wpływ na stan UI

- Błędy walidacji są wyświetlane pod odpowiednimi polami
- Pola z błędami mają `aria-invalid="true"` i są koloru czerwonego
- Przycisk "Sign In" jest disabled podczas `isSubmitting`
- Przycisk pokazuje loading spinner podczas `isSubmitting`

## 10. Obsługa błędów

### 10.1 Błędy walidacji client-side

- Wyświetlane bezpośrednio pod polem formularza
- Czerwony tekst, mała czcionka
- Powiązane z polem przez `aria-describedby`

### 10.2 Mock - brak błędów serwera (obecna implementacja)

Na obecnym etapie logowanie zawsze kończy się sukcesem po przejściu walidacji client-side. Błędy serwera nie występują.

### 10.3 Przyszłe błędy serwera (Supabase Auth)

Po implementacji Supabase Auth będą obsługiwane następujące błędy:

| Kod błędu                   | Komunikat dla użytkownika                 | Sposób wyświetlenia |
| --------------------------- | ----------------------------------------- | ------------------- |
| `invalid_credentials` / 401 | "Invalid email or password"               | Toast error         |
| `user_not_found`            | "Invalid email or password"               | Toast error         |
| Inne błędy / 500            | "Something went wrong. Please try again." | Toast error         |

**Ważne:** Komunikaty błędów nie ujawniają, czy email istnieje w systemie (zapobieganie enumeracji użytkowników).

### 10.4 Implementacja obsługi błędów (obecna - mock)

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
    await handleLogin(formData);
    // Mock: zawsze sukces
    router.push("/briefs");
  } catch {
    // Na obecnym etapie błędy nie występują
    // W przyszłości: obsługa błędów Supabase Auth
    toast.error("Something went wrong. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
}
```

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

1. Utwórz folder `src/app/(auth)/login/`
2. Utwórz plik `src/app/(auth)/login/page.tsx`
3. Utwórz folder `src/components/auth/`
4. Utwórz plik `src/components/auth/LoginForm.tsx`

### Krok 2: Instalacja zależności

```bash
npx shadcn@latest add sonner
npm install lucide-react  # Dla ikon Eye/EyeOff
```

### Krok 3: Konfiguracja Toaster

1. Dodaj `Toaster` z Sonner do root layout (`src/app/layout.tsx`):

```tsx
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

### Krok 4: Implementacja LoginPage

1. Utwórz podstawowy layout strony
2. Importuj i wyrenderuj `LoginForm`
3. Dodaj centrowanie i odpowiednie style tła

### Krok 5: Implementacja LoginForm

1. Utwórz komponent jako Client Component (`"use client"`)
2. Zaimplementuj strukturę Card z Shadcn/ui
3. Dodaj pola formularza (email, password)
4. Dodaj przycisk submit z loading state
5. Dodaj link do rejestracji

### Krok 6: Implementacja walidacji

1. Utwórz funkcje walidacji dla email i hasła
2. Podłącz walidację do onBlur i onSubmit
3. Wyświetl komunikaty błędów pod polami

### Krok 7: Implementacja mock logowania

1. Zaimportuj `DEFAULT_USER_PROFILE` z `@/db/supabase.client`
2. Zaimplementuj funkcję `handleLogin` która symuluje logowanie (opcjonalne opóźnienie)
3. Po walidacji zawsze przekieruj do `/briefs`
4. Dodaj komentarz TODO dla przyszłej integracji z Supabase Auth

### Krok 8: Implementacja toggle hasła

1. Dodaj stan `showPassword`
2. Dodaj przycisk z ikoną Eye/EyeOff
3. Zaimplementuj przełączanie typu input

### Krok 9: Dostępność

1. Dodaj `Label` z `htmlFor` dla każdego pola
2. Dodaj `aria-describedby` dla komunikatów błędów
3. Dodaj `aria-invalid` dla pól z błędami
4. Upewnij się, że Enter submituje formularz
5. Dodaj `aria-label` dla przycisku toggle hasła

### Krok 10: Testy i walidacja

1. Przetestuj walidację client-side (błędny email, puste pola)
2. Przetestuj logowanie z poprawnymi danymi (powinno przekierować do /briefs)
3. Przetestuj dostępność (nawigacja klawiaturą, screen reader)
4. Przetestuj responsywność (mobile-first)

### Krok 11: Opcjonalnie - Zod Schema

1. Utwórz plik `src/lib/schemas/auth.schema.ts`
2. Zdefiniuj `loginSchema` z Zod
3. Użyj do walidacji przed wysłaniem formularza
