# Brief Details - Part 6: Main Page & Error Handling

## Przegląd

Ten dokument opisuje implementację głównego komponentu strony (`BriefDetailsPage`), obsługi błędów (error boundaries), oraz pliku `not-found.tsx`.

## Struktura plików

```
src/app/(dashboard)/briefs/[id]/
├── page.tsx          # Main page component (Server Component)
├── not-found.tsx     # Custom 404 page
├── error.tsx         # Error boundary
└── loading.tsx       # Loading skeleton
```

---

## BriefDetailsPage (page.tsx)

**Lokalizacja:** `src/app/(dashboard)/briefs/[id]/page.tsx`

**Typ:** Server Component (async)

**Opis:** Główny komponent strony odpowiedzialny za pobranie danych briefu z API i przekazanie ich do komponentów potomnych.

### Implementacja

```typescript
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { BriefHeader } from '@/components/briefs/BriefHeader';
import { BriefContentSection } from '@/components/briefs/BriefContentSection';
import { BriefFooterSection } from '@/components/briefs/BriefFooterSection';
import { BriefRecipientsSection } from '@/components/briefs/BriefRecipientsSection';
import { BriefCommentsSection } from '@/components/briefs/BriefCommentsSection';
import type { BriefDetailDto, PaginatedResponse, CommentDto, BriefRecipientDto } from '@/types';

interface BriefDetailsPageProps {
  params: Promise<{ id: string }>;
}

async function getBriefDetails(id: string): Promise<BriefDetailDto | null> {
  const cookieStore = await cookies();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/briefs/${id}`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (response.status === 403) {
    redirect('/briefs?error=no-access');
  }

  if (!response.ok) {
    throw new Error('Failed to fetch brief details');
  }

  return response.json();
}

async function getBriefComments(id: string): Promise<PaginatedResponse<CommentDto>> {
  const cookieStore = await cookies();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/briefs/${id}/comments`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
  }

  return response.json();
}

async function getBriefRecipients(id: string): Promise<BriefRecipientDto[]> {
  const cookieStore = await cookies();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/briefs/${id}/recipients`, {
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.data || [];
}

export default async function BriefDetailsPage({ params }: BriefDetailsPageProps) {
  const { id } = await params;

  const brief = await getBriefDetails(id);

  if (!brief) {
    notFound();
  }

  // Fetch additional data in parallel
  const [comments, recipients] = await Promise.all([
    getBriefComments(id),
    brief.isOwned ? getBriefRecipients(id) : Promise.resolve([]),
  ]);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <BriefHeader brief={brief} />

      <BriefContentSection content={brief.content} />

      <BriefFooterSection footer={brief.footer} />

      {brief.isOwned && (
        <BriefRecipientsSection
          briefId={brief.id}
          initialRecipients={recipients}
        />
      )}

      <BriefCommentsSection
        briefId={brief.id}
        initialComments={comments}
      />
    </div>
  );
}

// Metadata generation
export async function generateMetadata({ params }: BriefDetailsPageProps) {
  const { id } = await params;
  const brief = await getBriefDetails(id);

  if (!brief) {
    return {
      title: 'Brief Not Found',
    };
  }

  return {
    title: brief.header,
    description: `Brief details for ${brief.header}`,
  };
}
```

---

## Loading State (loading.tsx)

**Lokalizacja:** `src/app/(dashboard)/briefs/[id]/loading.tsx`

**Typ:** Server Component

**Opis:** Skeleton loader wyświetlany podczas ładowania strony.

### Implementacja

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function BriefDetailsLoading() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <Skeleton className="h-8 w-2/3" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Content Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>

      {/* Comments Skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Not Found Page (not-found.tsx)

**Lokalizacja:** `src/app/(dashboard)/briefs/[id]/not-found.tsx`

**Typ:** Server Component

**Opis:** Custom 404 page dla nieistniejących briefów.

### Implementacja

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function BriefNotFound() {
  return (
    <div className="container max-w-md py-16">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Brief Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The brief you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button asChild>
            <Link href="/briefs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Briefs
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Error Boundary (error.tsx)

**Lokalizacja:** `src/app/(dashboard)/briefs/[id]/error.tsx`

**Typ:** Client Component

**Opis:** Error boundary z możliwością retry.

### Implementacja

```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BriefDetailsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Brief details error:', error);
  }, [error]);

  return (
    <div className="container max-w-md py-16">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We couldn&apos;t load this brief. Please try again or go back to the briefs list.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <pre className="text-left text-xs bg-muted p-2 rounded overflow-auto max-h-32">
              {error.message}
            </pre>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/briefs">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Briefs
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Layout (opcjonalny)

Jeśli potrzebny jest specyficzny layout dla widoku szczegółów briefu:

**Lokalizacja:** `src/app/(dashboard)/briefs/[id]/layout.tsx`

```typescript
interface BriefDetailsLayoutProps {
  children: React.ReactNode;
}

export default function BriefDetailsLayout({ children }: BriefDetailsLayoutProps) {
  return (
    <main className="min-h-screen bg-background">
      {children}
    </main>
  );
}
```

---

## Obsługa błędów HTTP

### 403 Forbidden

```typescript
if (response.status === 403) {
  redirect('/briefs?error=no-access');
}
```

Na stronie `/briefs` można wyświetlić toast na podstawie query param:

```typescript
// src/app/(dashboard)/briefs/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

export default function BriefsPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get('error') === 'no-access') {
      toast({
        title: 'Access denied',
        description: "You don't have permission to view this brief.",
        variant: 'destructive',
      });
      // Clean up URL
      window.history.replaceState({}, '', '/briefs');
    }
  }, [searchParams, toast]);

  // rest of component
}
```

### 404 Not Found

```typescript
if (response.status === 404) {
  return null;
}

// In main component
if (!brief) {
  notFound();
}
```

### 500 Internal Server Error

```typescript
if (!response.ok) {
  throw new Error('Failed to fetch brief details');
}
```

Błąd zostanie przechwycony przez `error.tsx`.

---

## Warunki renderowania

| Sekcja | Warunek |
|--------|---------|
| `BriefHeader` | Zawsze |
| `BriefContentSection` | Zawsze |
| `BriefFooterSection` | `brief.footer !== null` |
| `BriefRecipientsSection` | `brief.isOwned === true` |
| `BriefCommentsSection` | Zawsze |

---

## Data Fetching Strategy

### Server-Side Rendering

- Wszystkie dane pobierane są na serwerze przed renderowaniem
- `cache: 'no-store'` zapewnia świeże dane przy każdym request
- Równoległe pobieranie danych dla optymalizacji (`Promise.all`)

### Client-Side Revalidation

- Komentarze: auto-refresh co 30s przez `useBriefComments`
- Odbiorcy: manual refresh po akcjach przez `useBriefRecipients`
- Brief details: `router.refresh()` po zmianie statusu

---

## Responsywność

### Mobile Layout

```css
.container {
  @apply px-4;
}

/* Cards stack vertically */
.space-y-6 > * {
  @apply w-full;
}
```

### Tablet/Desktop Layout

```css
.container {
  @apply max-w-4xl mx-auto;
}

/* Horizontal action buttons */
.flex-wrap {
  @apply flex-nowrap;
}
```

---

## Accessibility

### Page Title

```typescript
export async function generateMetadata({ params }: BriefDetailsPageProps) {
  // Dynamic title for screen readers
  return {
    title: brief.header,
  };
}
```

### Heading Hierarchy

```
h1 - Brief header (in BriefHeader)
  h2 - "Brief Content" (in BriefContentSection)
  h2 - "Footer" (in BriefFooterSection)
  h2 - "Recipients" (in BriefRecipientsSection)
  h2 - "Comments" (in BriefCommentsSection)
```

### Skip Links

```typescript
// W layout.tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>

// W page.tsx
<main id="main-content">
  {/* content */}
</main>
```

---

## Performance Optimization

### Parallel Data Fetching

```typescript
const [comments, recipients] = await Promise.all([
  getBriefComments(id),
  brief.isOwned ? getBriefRecipients(id) : Promise.resolve([]),
]);
```

### Lazy Loading Dialogs

```typescript
import dynamic from 'next/dynamic';

const ShareBriefDialog = dynamic(
  () => import('./ShareBriefDialog').then(mod => mod.ShareBriefDialog),
  { ssr: false }
);
```

### Streaming (opcjonalne)

```typescript
import { Suspense } from 'react';

export default async function BriefDetailsPage({ params }: BriefDetailsPageProps) {
  const { id } = await params;
  const brief = await getBriefDetails(id);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <BriefHeader brief={brief} />
      <BriefContentSection content={brief.content} />

      <Suspense fallback={<CommentsSkeleton />}>
        <BriefCommentsSection briefId={id} />
      </Suspense>
    </div>
  );
}
```

---

## Checklist implementacji

- [ ] Utworzyć `page.tsx` (Server Component)
- [ ] Utworzyć `loading.tsx` (Skeleton)
- [ ] Utworzyć `not-found.tsx` (404 page)
- [ ] Utworzyć `error.tsx` (Error boundary)
- [ ] Zaimplementować funkcje fetch (`getBriefDetails`, `getBriefComments`, `getBriefRecipients`)
- [ ] Dodać `generateMetadata` dla dynamic title
- [ ] Przetestować wszystkie scenariusze błędów (403, 404, 500)
- [ ] Przetestować responsywność (mobile, tablet, desktop)
- [ ] Przetestować accessibility (screen reader, keyboard navigation)
- [ ] Przetestować performance (parallel data fetching)

---

## Zależności od innych części

- **Wymaga wszystkie poprzednie części:**
  - [Part 1: Infrastructure](./brief-details-infrastructure.md)
  - [Part 2: Header & Status](./brief-details-header.md)
  - [Part 3: Content & Footer](./brief-details-content.md)
  - [Part 4: Recipients Section](./brief-details-recipients.md)
  - [Part 5: Comments Section](./brief-details-comments.md)

---

## Podsumowanie całej implementacji

### Kolejność implementacji

1. **Part 1: Infrastructure** - typy, hooki, stałe
2. **Part 2: Header & Status** - nagłówek, badge, akcje
3. **Part 3: Content & Footer** - TipTap renderer, stopka
4. **Part 4: Recipients** - tabela, formularz, dialog
5. **Part 5: Comments** - lista, paginacja, formularz
6. **Part 6: Main Page** - strona, loading, error, not-found

### Kluczowe komponenty

| Komponent | Typ | Opis |
|-----------|-----|------|
| `BriefDetailsPage` | Server | Główny komponent strony |
| `BriefHeader` | Client | Nagłówek z akcjami |
| `BriefContentRenderer` | Client | TipTap read-only |
| `BriefRecipientsSection` | Client | Zarządzanie odbiorcami |
| `BriefCommentsSection` | Client | Komentarze z polling |

### Custom Hooks

| Hook | Cel |
|------|-----|
| `useBriefComments` | State + polling dla komentarzy |
| `useBriefRecipients` | State dla odbiorców |
| `useBriefStatusChange` | Zmiana statusu przez odbiorcę |

### Testowanie

- [ ] Owner flows (edit, delete, share)
- [ ] Recipient flows (accept, reject, needs modification)
- [ ] Comments (add, delete, pagination, polling)
- [ ] Recipients (add, remove, limit)
- [ ] Error scenarios (403, 404, 500, network errors)
- [ ] Loading states
- [ ] Responsywność
- [ ] Accessibility
