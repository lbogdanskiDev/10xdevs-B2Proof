# Plan implementacji widoku Nawigacji

## 1. Przegląd

System nawigacji B2Proof to zestaw komponentów odpowiedzialnych za umożliwienie użytkownikom poruszania się po aplikacji. Nawigacja obsługuje dwa layouty:

- **Desktop (>1024px)**: Stały sidebar po lewej stronie ekranu
- **Mobile (<640px)**: Hamburger menu otwierające Sheet z nawigacją

Nawigacja uwzględnia rolę użytkownika (creator/client) i dynamicznie pokazuje/ukrywa elementy (np. "New Brief" tylko dla creatorów). Zawiera również informacje o limicie briefów użytkownika oraz przełącznik motywu (dark/light mode).

## 2. Routing widoku

### 2.1 Strona główna (`/`) i przekierowania

Strona główna (`/`) pełni rolę punktu wejścia do aplikacji. Nie wyświetla własnej zawartości - zamiast tego przekierowuje użytkownika w zależności od stanu autentykacji:

**Logika przekierowań:**

- **Użytkownik zalogowany** → przekierowanie do `/briefs`
- **Użytkownik niezalogowany** → przekierowanie do `/login`

**Implementacja w `src/app/page.tsx`:**

```typescript
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/db/supabase.client";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/briefs");
  } else {
    redirect("/login");
  }
}
```

**Alternatywnie - implementacja w middleware (`src/middleware.ts`):**

```typescript
// Dodać do istniejącego middleware
const { pathname } = request.nextUrl;

// Sprawdź sesję użytkownika
const {
  data: { user },
} = await supabase.auth.getUser();

// Przekierowanie ze strony głównej
if (pathname === "/") {
  const redirectUrl = user ? "/briefs" : "/login";
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}

// Ochrona ścieżek dashboard - niezalogowani → /login
if (pathname.startsWith("/briefs") || pathname === "/profile") {
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

// Zalogowani użytkownicy nie powinni widzieć /login
if (pathname === "/login" && user) {
  return NextResponse.redirect(new URL("/briefs", request.url));
}
```

**Rekomendowana implementacja:** Middleware - zapewnia spójną ochronę wszystkich ścieżek w jednym miejscu i działa przed renderowaniem strony.

### 2.2 Komponenty nawigacji

Komponenty nawigacji nie mają własnych ścieżek - są renderowane jako część layoutu `(dashboard)`:

```
src/app/(dashboard)/layout.tsx - Główny layout z nawigacją
```

### 2.3 Ścieżki aplikacji

| Ścieżka        | Dostęp              | Opis                                                             |
| -------------- | ------------------- | ---------------------------------------------------------------- |
| `/`            | Publiczna           | Przekierowanie: zalogowany → `/briefs`, niezalogowany → `/login` |
| `/login`       | Tylko niezalogowani | Strona logowania (zalogowani są przekierowywani do `/briefs`)    |
| `/briefs`      | Tylko zalogowani    | Lista briefów (domyślna strona po zalogowaniu)                   |
| `/briefs/new`  | Tylko creator       | Tworzenie nowego briefu                                          |
| `/briefs/[id]` | Tylko zalogowani    | Szczegóły briefu                                                 |
| `/profile`     | Tylko zalogowani    | Profil użytkownika                                               |

## 3. Struktura komponentów

```
src/app/(dashboard)/layout.tsx
└── DashboardLayoutClient                    # Client Component wrapper
    ├── AuthProvider                         # Context użytkownika
    │   ├── ThemeProvider                    # next-themes wrapper
    │   │   ├── Sidebar                      # Desktop navigation (>1024px)
    │   │   │   ├── SidebarHeader            # Logo + nazwa aplikacji
    │   │   │   ├── SidebarNavigation        # Lista linków nawigacyjnych
    │   │   │   │   ├── NavLink              # Pojedynczy link nawigacyjny
    │   │   │   │   └── BriefCountBadge      # Badge z licznikiem (15/20)
    │   │   │   ├── SidebarSeparator         # Separator wizualny
    │   │   │   └── SidebarFooter            # Przycisk logout
    │   │   ├── TopBar                       # Górny pasek (mobile)
    │   │   │   ├── MobileMenuTrigger        # Hamburger button
    │   │   │   ├── Logo                     # Logo aplikacji (center)
    │   │   │   ├── ThemeToggle              # Przełącznik motywu
    │   │   │   └── UserMenu                 # Avatar + dropdown
    │   │   ├── MobileNav (Sheet)            # Mobile navigation
    │   │   │   ├── SheetHeader              # Logo
    │   │   │   ├── SheetNavigation          # Lista linków
    │   │   │   └── SheetFooter              # Logout
    │   │   └── {children}                   # Zawartość strony
    │   └── Toaster                          # Sonner notifications
```

## 4. Szczegóły komponentów

### 4.1 DashboardLayoutClient

**Opis:** Client Component wrapper dla layoutu dashboard. Odpowiada za pobieranie danych użytkownika i renderowanie nawigacji.

**Główne elementy:**

- `AuthProvider` - context z danymi użytkownika
- `ThemeProvider` - obsługa dark/light mode
- `Sidebar` - nawigacja desktop
- `TopBar` - górny pasek mobile z hamburger menu
- `MobileNav` - Sheet z nawigacją mobile
- `main` - kontener na zawartość strony

**Obsługiwane interakcje:**

- Brak bezpośrednich - deleguje do komponentów dzieci

**Obsługiwana walidacja:**

- Sprawdzenie czy użytkownik jest zalogowany (redirect do /login jeśli nie)

**Typy:**

```typescript
interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: UserProfileDto | null;
  briefCount: number;
}
```

**Propsy:**

- `children: React.ReactNode` - zawartość strony
- `user: UserProfileDto | null` - dane zalogowanego użytkownika
- `briefCount: number` - aktualna liczba briefów użytkownika

---

### 4.2 AuthProvider

**Opis:** Context provider dostarczający dane użytkownika do całej aplikacji. Przechowuje informacje o zalogowanym użytkowniku i udostępnia metodę logout.

**Główne elementy:**

- `AuthContext.Provider` - wrapper context
- `children` - komponenty dzieci

**Obsługiwane interakcje:**

- `logout()` - wylogowanie użytkownika via Supabase Auth

**Obsługiwana walidacja:**

- Brak

**Typy:**

```typescript
interface AuthContextValue {
  user: UserProfileDto | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}
```

**Propsy:**

- `children: React.ReactNode`
- `initialUser: UserProfileDto | null`

---

### 4.3 Sidebar

**Opis:** Stały panel nawigacyjny widoczny na desktop (>1024px). Zawiera logo, linki nawigacyjne, licznik briefów i przycisk logout.

**Główne elementy:**

- `aside` (fixed, left, h-full, w-64)
- `SidebarHeader` - logo i nazwa aplikacji
- `nav` - kontener nawigacji
- `SidebarNavigation` - lista linków
- `Separator` - wizualny separator
- `SidebarFooter` - przycisk logout

**Obsługiwane interakcje:**

- Kliknięcie logo → nawigacja do `/briefs`
- Kliknięcie linku → nawigacja do odpowiedniej strony
- Kliknięcie "Logout" → wywołanie `logout()` z AuthContext

**Obsługiwana walidacja:**

- Warunkowe renderowanie "New Brief" tylko dla role === "creator"
- Disabled state dla "New Brief" gdy briefCount >= 20

**Typy:**

```typescript
interface SidebarProps {
  user: UserProfileDto;
  briefCount: number;
  navigation: NavigationItem[];
}
```

**Propsy:**

- `user: UserProfileDto` - dane użytkownika
- `briefCount: number` - liczba briefów
- `navigation: NavigationItem[]` - lista elementów nawigacji

---

### 4.4 SidebarNavigation

**Opis:** Lista linków nawigacyjnych w sidebarze. Renderuje linki warunkowe zależnie od roli użytkownika.

**Główne elementy:**

- `ul` - lista linków
- `NavLink` - pojedynczy link nawigacyjny
- `BriefCountBadge` - badge z licznikiem briefów (tylko dla creatorów)

**Obsługiwane interakcje:**

- Kliknięcie linku → nawigacja

**Obsługiwana walidacja:**

- Sprawdzenie `disabled` dla linku "New Brief"

**Typy:**

```typescript
interface SidebarNavigationProps {
  items: NavigationItem[];
  currentPath: string;
  briefCount: number;
  maxBriefs: number;
}
```

**Propsy:**

- `items: NavigationItem[]` - elementy nawigacji
- `currentPath: string` - aktualna ścieżka (do podświetlenia)
- `briefCount: number` - liczba briefów
- `maxBriefs: number` - limit briefów (20)

---

### 4.5 NavLink

**Opis:** Pojedynczy link nawigacyjny z ikoną, tekstem i opcjonalnym badge.

**Główne elementy:**

- `Link` (next/link) lub `button` (jeśli disabled)
- `LucideIcon` - ikona linku
- `span` - tekst linku
- `Badge` (opcjonalny) - np. licznik briefów

**Obsługiwane interakcje:**

- Kliknięcie → nawigacja do `href` (jeśli nie disabled)
- Focus visible → outline dla dostępności

**Obsługiwana walidacja:**

- `disabled` prop blokuje nawigację i zmienia styl

**Typy:**

```typescript
interface NavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  badge?: React.ReactNode;
}
```

**Propsy:**

- `href: string` - ścieżka docelowa
- `icon: LucideIcon` - ikona z lucide-react
- `label: string` - tekst linku
- `isActive?: boolean` - czy link jest aktywny
- `disabled?: boolean` - czy link jest wyłączony
- `badge?: React.ReactNode` - opcjonalny badge

---

### 4.6 BriefCountBadge

**Opis:** Badge wyświetlający aktualną liczbę briefów użytkownika w formacie "15/20".

**Główne elementy:**

- `Badge` (Shadcn/ui)
- `span` - tekst licznika

**Obsługiwane interakcje:**

- Brak (komponent prezentacyjny)

**Obsługiwana walidacja:**

- Zmiana koloru gdy briefCount >= 18 (warning)
- Zmiana koloru gdy briefCount >= 20 (destructive)

**Typy:**

```typescript
interface BriefCountBadgeProps {
  current: number;
  max: number;
}
```

**Propsy:**

- `current: number` - aktualna liczba briefów
- `max: number` - maksymalna liczba briefów (20)

---

### 4.7 TopBar

**Opis:** Górny pasek widoczny na mobile (<640px). Zawiera hamburger menu, logo i akcje użytkownika.

**Główne elementy:**

- `header` (sticky top-0, h-16)
- `MobileMenuTrigger` - przycisk hamburger
- `Logo` - nazwa/logo aplikacji
- `div` - kontener akcji (ThemeToggle, UserMenu)

**Obsługiwane interakcje:**

- Kliknięcie hamburger → otwarcie MobileNav
- Kliknięcie logo → nawigacja do `/briefs`

**Obsługiwana walidacja:**

- Brak

**Typy:**

```typescript
interface TopBarProps {
  onMenuClick: () => void;
  user: UserProfileDto;
}
```

**Propsy:**

- `onMenuClick: () => void` - callback do otwarcia mobile menu
- `user: UserProfileDto` - dane użytkownika

---

### 4.8 MobileMenuTrigger

**Opis:** Przycisk hamburger otwierający mobilną nawigację.

**Główne elementy:**

- `Button` (variant="ghost", size="icon")
- `Menu` icon (lucide-react)

**Obsługiwane interakcje:**

- Kliknięcie → wywołanie `onClick`

**Obsługiwana walidacja:**

- Brak

**Typy:**

```typescript
interface MobileMenuTriggerProps {
  onClick: () => void;
}
```

**Propsy:**

- `onClick: () => void` - callback

---

### 4.9 ThemeToggle

**Opis:** Przełącznik motywu dark/light mode.

**Główne elementy:**

- `Button` (variant="ghost", size="icon")
- `Sun` / `Moon` icon (lucide-react)

**Obsługiwane interakcje:**

- Kliknięcie → przełączenie motywu via `setTheme()` z next-themes

**Obsługiwana walidacja:**

- Brak

**Typy:**

```typescript
interface ThemeToggleProps {
  className?: string;
}
```

**Propsy:**

- `className?: string` - dodatkowe klasy CSS

---

### 4.10 UserMenu

**Opis:** Menu użytkownika z avatarem/inicjałem i dropdown z opcjami.

**Główne elementy:**

- `DropdownMenu` (Shadcn/ui)
- `DropdownMenuTrigger` - przycisk z avatarem
- `DropdownMenuContent` - lista opcji
- `DropdownMenuItem` - opcje: Profile, Logout

**Obsługiwane interakcje:**

- Kliknięcie avatara → otwarcie dropdown
- Kliknięcie "Profile" → nawigacja do `/profile`
- Kliknięcie "Logout" → wywołanie `logout()` i redirect do `/login`

**Obsługiwana walidacja:**

- Brak

**Typy:**

```typescript
interface UserMenuProps {
  user: UserProfileDto;
  onLogout: () => Promise<void>;
}
```

**Propsy:**

- `user: UserProfileDto` - dane użytkownika
- `onLogout: () => Promise<void>` - callback logout

---

### 4.11 MobileNav

**Opis:** Mobilna nawigacja jako Sheet (sliding panel) otwierana z lewej strony.

**Główne elementy:**

- `Sheet` (Shadcn/ui)
- `SheetContent` (side="left")
- `SheetHeader` - logo aplikacji
- `nav` - lista linków nawigacyjnych
- `SheetFooter` - przycisk logout

**Obsługiwane interakcje:**

- Kliknięcie linku → nawigacja + zamknięcie sheet
- Kliknięcie "Logout" → logout + redirect
- Kliknięcie poza sheet → zamknięcie
- Swipe left → zamknięcie

**Obsługiwana walidacja:**

- Identyczne jak Sidebar (warunkowe "New Brief", disabled state)

**Typy:**

```typescript
interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfileDto;
  briefCount: number;
  navigation: NavigationItem[];
  onLogout: () => Promise<void>;
}
```

**Propsy:**

- `open: boolean` - stan otwarcia
- `onOpenChange: (open: boolean) => void` - callback zmiany stanu
- `user: UserProfileDto` - dane użytkownika
- `briefCount: number` - liczba briefów
- `navigation: NavigationItem[]` - elementy nawigacji
- `onLogout: () => Promise<void>` - callback logout

---

### 4.12 Logo

**Opis:** Logo/nazwa aplikacji B2Proof jako link do strony głównej.

**Główne elementy:**

- `Link` (href="/briefs")
- `span` - tekst "B2Proof"

**Obsługiwane interakcje:**

- Kliknięcie → nawigacja do `/briefs`

**Obsługiwana walidacja:**

- Brak

**Typy:**

```typescript
interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}
```

**Propsy:**

- `className?: string` - dodatkowe klasy
- `size?: "sm" | "md" | "lg"` - rozmiar tekstu

## 5. Typy

### 5.1 Istniejące typy (z src/types.ts)

```typescript
// Profil użytkownika
interface UserProfileDto {
  id: string;
  email: string;
  role: UserRole; // "creator" | "client"
  createdAt: string;
  updatedAt: string;
}

// Role użytkownika
type UserRole = "creator" | "client";
```

### 5.2 Nowe typy do utworzenia

```typescript
// src/lib/types/navigation.types.ts

import type { LucideIcon } from "lucide-react";

/**
 * Element nawigacji
 */
export interface NavigationItem {
  /** Unikalna nazwa elementu */
  name: string;
  /** Ścieżka docelowa */
  href: string;
  /** Ikona z lucide-react */
  icon: LucideIcon;
  /** Czy element jest wyłączony */
  disabled?: boolean;
  /** Czy wymagana rola "creator" */
  creatorOnly?: boolean;
  /** Opcjonalny badge do wyświetlenia */
  badge?: React.ReactNode;
}

/**
 * Props dla AuthContext
 */
export interface AuthContextValue {
  /** Zalogowany użytkownik lub null */
  user: UserProfileDto | null;
  /** Czy trwa ładowanie danych użytkownika */
  isLoading: boolean;
  /** Funkcja wylogowania */
  logout: () => Promise<void>;
}

/**
 * Props dla hook useBriefCount
 */
export interface BriefCountData {
  /** Aktualna liczba briefów */
  count: number;
  /** Maksymalny limit */
  max: number;
  /** Czy limit osiągnięty */
  isAtLimit: boolean;
  /** Czy zbliża się do limitu (>=18) */
  isNearLimit: boolean;
  /** Czy trwa ładowanie */
  isLoading: boolean;
  /** Funkcja odświeżenia */
  refresh: () => Promise<void>;
}
```

## 6. Zarządzanie stanem

### 6.1 AuthContext

Globalny context przechowujący dane zalogowanego użytkownika.

```typescript
// src/hooks/use-auth.tsx

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser
}: {
  children: React.ReactNode;
  initialUser: UserProfileDto | null;
}) {
  const [user, setUser] = useState<UserProfileDto | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const logout = async () => {
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      setUser(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
```

### 6.2 useBriefCount Hook

Hook do pobierania i cachowania liczby briefów użytkownika.

```typescript
// src/hooks/use-brief-count.tsx

export function useBriefCount(): BriefCountData {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/briefs?limit=1");
      const data = await response.json();
      setCount(data.pagination.total);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return {
    count,
    max: MAX_BRIEFS_PER_USER,
    isAtLimit: count >= MAX_BRIEFS_PER_USER,
    isNearLimit: count >= BRIEF_LIMIT_WARNING_THRESHOLD,
    isLoading,
    refresh,
  };
}
```

### 6.3 Stan mobile menu

Lokalny stan w komponencie DashboardLayoutClient:

```typescript
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

## 7. Integracja API

### 7.1 Pobieranie profilu użytkownika

**Endpoint:** `GET /api/users/me`

**Request:** Brak body (autoryzacja via cookies)

**Response:**

```typescript
// Success (200)
interface UserProfileDto {
  id: string;
  email: string;
  role: "creator" | "client";
  createdAt: string;
  updatedAt: string;
}

// Error (401)
interface ErrorReturn {
  error: "Unauthorized";
}
```

**Implementacja w layout:**

```typescript
// src/app/(dashboard)/layout.tsx

export default async function DashboardLayout({ children }) {
  // Server-side: pobierz użytkownika
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Pobierz profil
  const response = await fetch(`${baseUrl}/api/users/me`, {
    headers: { Cookie: cookies().toString() },
    cache: "no-store",
  });

  const profile = await response.json();

  return (
    <DashboardLayoutClient user={profile} briefCount={0}>
      {children}
    </DashboardLayoutClient>
  );
}
```

### 7.2 Pobieranie liczby briefów

**Endpoint:** `GET /api/briefs?limit=1`

**Response:**

```typescript
interface PaginatedResponse<BriefListItemDto> {
  data: BriefListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number; // <-- używamy tej wartości
    totalPages: number;
  };
}
```

### 7.3 Wylogowanie

**Metoda:** Supabase Auth client-side

```typescript
const supabase = createSupabaseBrowserClient();
await supabase.auth.signOut();
```

## 8. Interakcje użytkownika

| Interakcja                        | Komponent              | Rezultat                             |
| --------------------------------- | ---------------------- | ------------------------------------ |
| Kliknięcie logo                   | Logo                   | Nawigacja do `/briefs`               |
| Kliknięcie "Briefs"               | NavLink                | Nawigacja do `/briefs`               |
| Kliknięcie "New Brief" (creator)  | NavLink                | Nawigacja do `/briefs/new`           |
| Kliknięcie "New Brief" (disabled) | NavLink                | Brak akcji, tooltip z info o limicie |
| Kliknięcie "Profile"              | NavLink/UserMenu       | Nawigacja do `/profile`              |
| Kliknięcie "Logout"               | SidebarFooter/UserMenu | Wylogowanie, redirect do `/login`    |
| Kliknięcie hamburger (mobile)     | MobileMenuTrigger      | Otwarcie Sheet z nawigacją           |
| Kliknięcie poza Sheet             | MobileNav              | Zamknięcie Sheet                     |
| Kliknięcie linku w Sheet          | MobileNav NavLink      | Nawigacja + zamknięcie Sheet         |
| Kliknięcie ThemeToggle            | ThemeToggle            | Przełączenie dark/light mode         |
| Kliknięcie avatara                | UserMenu               | Otwarcie dropdown menu               |

## 9. Warunki i walidacja

### 9.1 Warunkowe renderowanie elementów nawigacji

| Warunek                   | Element             | Zachowanie                      |
| ------------------------- | ------------------- | ------------------------------- |
| `user.role === "creator"` | NavLink "New Brief" | Renderowany tylko dla creatorów |
| `briefCount >= 20`        | NavLink "New Brief" | `disabled=true`, zmieniony styl |
| `briefCount >= 18`        | BriefCountBadge     | Kolor warning (żółty)           |
| `briefCount >= 20`        | BriefCountBadge     | Kolor destructive (czerwony)    |
| `currentPath === href`    | NavLink             | `isActive=true`, podświetlenie  |

### 9.2 Konfiguracja nawigacji

```typescript
// src/lib/constants/navigation.ts

import { FileText, Plus, User, LogOut } from "lucide-react";
import type { NavigationItem } from "@/lib/types/navigation.types";

export const getNavigationItems = (briefCount: number, maxBriefs: number): NavigationItem[] => [
  {
    name: "Briefs",
    href: "/briefs",
    icon: FileText,
  },
  {
    name: "New Brief",
    href: "/briefs/new",
    icon: Plus,
    creatorOnly: true,
    disabled: briefCount >= maxBriefs,
  },
  {
    name: "Profile",
    href: "/profile",
    icon: User,
  },
];
```

### 9.3 Walidacja dostępu

- Middleware sprawdza czy użytkownik jest zalogowany
- Niezalogowani użytkownicy są przekierowywani do `/login`
- Layout server-side sprawdza rolę przed renderowaniem

## 10. Obsługa błędów

### 10.1 Błąd pobierania profilu użytkownika

**Scenariusz:** API `/api/users/me` zwraca 401 lub 500

**Obsługa:**

```typescript
// W layout.tsx
if (!response.ok) {
  if (response.status === 401) {
    redirect("/login");
  }
  // Dla innych błędów - przekaż do error boundary
  throw new Error("Failed to fetch user profile");
}
```

### 10.2 Błąd wylogowania

**Scenariusz:** Supabase signOut() rzuca błąd

**Obsługa:**

```typescript
const logout = async () => {
  try {
    await supabase.auth.signOut();
    router.push("/login");
  } catch (error) {
    toast.error("Failed to logout. Please try again.");
    console.error("Logout error:", error);
  }
};
```

### 10.3 Błąd pobierania liczby briefów

**Scenariusz:** API `/api/briefs` zwraca błąd

**Obsługa:**

```typescript
// W useBriefCount hook
const refresh = async () => {
  try {
    const response = await fetch("/api/briefs?limit=1");
    if (!response.ok) throw new Error();
    const data = await response.json();
    setCount(data.pagination.total);
  } catch {
    // Fallback: ustaw 0, nie blokuj UI
    setCount(0);
    console.error("Failed to fetch brief count");
  }
};
```

### 10.4 Brak połączenia sieciowego

**Obsługa:**

- Nawigacja działa offline (client-side routing)
- Akcje wymagające API (logout) pokazują toast z błędem
- Licznik briefów może być nieaktualny

## 11. Kroki implementacji

### Krok 1: Zaktualizuj middleware dla przekierowań i ochrony ścieżek

Zaktualizuj `src/middleware.ts`:

- Dodaj przekierowanie ze strony głównej (`/`) w zależności od stanu logowania
- Dodaj ochronę ścieżek dashboard (`/briefs`, `/profile`) - przekierowanie do `/login` dla niezalogowanych
- Dodaj przekierowanie zalogowanych użytkowników z `/login` do `/briefs`

```typescript
// src/middleware.ts - dodać po sprawdzeniu sesji

const { pathname } = request.nextUrl;
const {
  data: { user },
} = await supabase.auth.getUser();

// Przekierowanie ze strony głównej
if (pathname === "/") {
  const redirectUrl = user ? "/briefs" : "/login";
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}

// Ochrona ścieżek dashboard
const protectedPaths = ["/briefs", "/profile"];
const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

if (isProtectedPath && !user) {
  return NextResponse.redirect(new URL("/login", request.url));
}

// Zalogowani nie powinni widzieć /login
if (pathname === "/login" && user) {
  return NextResponse.redirect(new URL("/briefs", request.url));
}
```

### Krok 2: Zaktualizuj stronę główną (opcjonalnie)

Zaktualizuj `src/app/page.tsx` - można usunąć obecną zawartość starter template lub zostawić jako fallback (middleware obsłuży przekierowanie zanim strona się wyrenderuje):

```typescript
// src/app/page.tsx
// Minimalna wersja - middleware obsługuje przekierowanie
export default function HomePage() {
  return null;
}
```

### Krok 3: Zainstaluj wymagane komponenty Shadcn/ui

```bash
npx shadcn@latest add sheet dropdown-menu separator avatar tooltip
```

### Krok 4: Utwórz typy nawigacji

Utwórz plik `src/lib/types/navigation.types.ts` z definicjami:

- `NavigationItem`
- `AuthContextValue`
- `BriefCountData`

### Krok 5: Utwórz stałe nawigacji

Utwórz plik `src/lib/constants/navigation.ts`:

- Funkcja `getNavigationItems()`
- Stałe dla breakpointów

### Krok 6: Utwórz AuthProvider i useAuth hook

Utwórz plik `src/hooks/use-auth.tsx`:

- `AuthContext`
- `AuthProvider` component
- `useAuth` hook

### Krok 7: Utwórz useBriefCount hook

Utwórz plik `src/hooks/use-brief-count.tsx`:

- Hook do pobierania i cachowania liczby briefów
- Obsługa loading state i błędów

### Krok 8: Utwórz komponent Logo

Utwórz plik `src/components/layout/Logo.tsx`:

- Link do `/briefs`
- Responsywne rozmiary

### Krok 9: Utwórz komponent ThemeToggle

Utwórz plik `src/components/layout/ThemeToggle.tsx`:

- Integracja z next-themes
- Ikony Sun/Moon

### Krok 10: Utwórz komponent NavLink

Utwórz plik `src/components/layout/NavLink.tsx`:

- Obsługa active state
- Obsługa disabled state
- Obsługa badge

### Krok 11: Utwórz komponent BriefCountBadge

Utwórz plik `src/components/layout/BriefCountBadge.tsx`:

- Wyświetlanie licznika "X/20"
- Warunkowe kolory (normal, warning, destructive)

### Krok 12: Utwórz komponent SidebarNavigation

Utwórz plik `src/components/layout/SidebarNavigation.tsx`:

- Lista NavLink
- Filtrowanie elementów wg roli

### Krok 13: Utwórz komponent Sidebar

Utwórz plik `src/components/layout/Sidebar.tsx`:

- SidebarHeader z Logo
- SidebarNavigation
- Separator
- SidebarFooter z Logout

### Krok 14: Utwórz komponent UserMenu

Utwórz plik `src/components/layout/UserMenu.tsx`:

- DropdownMenu z avatarem
- Opcje: Profile, Logout

### Krok 15: Utwórz komponent TopBar

Utwórz plik `src/components/layout/TopBar.tsx`:

- MobileMenuTrigger
- Logo (center)
- ThemeToggle + UserMenu

### Krok 16: Utwórz komponent MobileNav

Utwórz plik `src/components/layout/MobileNav.tsx`:

- Sheet component
- Nawigacja identyczna jak Sidebar
- Zamykanie po kliknięciu linku

### Krok 17: Utwórz komponent DashboardLayoutClient

Utwórz plik `src/components/layout/DashboardLayoutClient.tsx`:

- Client Component wrapper
- AuthProvider
- ThemeProvider
- Sidebar (desktop)
- TopBar + MobileNav (mobile)
- Container na children

### Krok 18: Zaktualizuj layout.tsx

Zaktualizuj `src/app/(dashboard)/layout.tsx`:

- Pobieranie użytkownika server-side
- Pobieranie liczby briefów
- Renderowanie DashboardLayoutClient

### Krok 19: Dodaj ThemeProvider do root layout

Zaktualizuj `src/app/layout.tsx`:

- Dodaj ThemeProvider z next-themes
- Skonfiguruj attribute="class"

### Krok 20: Testowanie i poprawki

- Przetestuj nawigację na różnych breakpointach
- Sprawdź accessibility (keyboard navigation, ARIA)
- Zweryfikuj warunkowe renderowanie
- Przetestuj logout flow
- Sprawdź dark/light mode
- Zweryfikuj przekierowania: `/` → `/briefs` lub `/login`
- Sprawdź ochronę ścieżek: `/briefs/*`, `/profile` niedostępne bez logowania
- Zweryfikuj przekierowanie zalogowanych z `/login` do `/briefs`

### Krok 21: Export komponentów

Utwórz plik `src/components/layout/index.ts`:

```typescript
export { Sidebar } from "./Sidebar";
export { TopBar } from "./TopBar";
export { MobileNav } from "./MobileNav";
export { ThemeToggle } from "./ThemeToggle";
export { Logo } from "./Logo";
export { NavLink } from "./NavLink";
export { BriefCountBadge } from "./BriefCountBadge";
export { UserMenu } from "./UserMenu";
export { DashboardLayoutClient } from "./DashboardLayoutClient";
```
