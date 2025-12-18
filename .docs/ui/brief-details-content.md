# Brief Details - Part 3: Content & Footer

## Przegląd

Ten dokument opisuje implementację sekcji treści briefu (renderowanie TipTap JSON) oraz opcjonalnej sekcji stopki.

## Komponenty do implementacji

```
BriefContentSection (Server Component)
└── Card
    └── CardContent
        └── BriefContentRenderer (Client Component - TipTap read-only)

BriefFooterSection (Server Component - conditional)
└── Card
    └── CardContent
        └── p (footer text)
```

---

## BriefContentRenderer

**Lokalizacja:** `src/components/briefs/BriefContentRenderer.tsx`

**Typ:** Client Component

**Opis:** Komponent renderujący treść briefu w formacie TipTap JSON w trybie read-only z wykorzystaniem Tailwind Typography.

### Propsy

```typescript
interface BriefContentRendererProps {
  content: unknown; // TipTap JSON structure
}
```

### Konfiguracja TipTap

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import type { JSONContent } from '@tiptap/react';

interface BriefContentRendererProps {
  content: JSONContent;
}

export function BriefContentRenderer({ content }: BriefContentRendererProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Konfiguracja zgodna z tech stack
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Typography,
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none',
      },
    },
  });

  if (!editor) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-4" />
        <div className="h-4 bg-muted rounded w-full mb-4" />
        <div className="h-4 bg-muted rounded w-5/6 mb-4" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
    );
  }

  return <EditorContent editor={editor} />;
}
```

### Rozszerzenia TipTap

Zgodnie z tech stackiem, używamy następujących rozszerzeń:

1. **StarterKit** - podstawowy zestaw rozszerzeń:
   - `Paragraph`
   - `Text`
   - `Bold`
   - `Italic`
   - `Strike`
   - `Code`
   - `Heading` (levels 1-3)
   - `BulletList`
   - `OrderedList`
   - `ListItem`
   - `Blockquote`
   - `CodeBlock`
   - `HorizontalRule`
   - `HardBreak`

2. **Typography** - automatyczna typografia:
   - Cudzysłowy typograficzne
   - Myślniki
   - Wielokropek

### Styling z Tailwind Typography

Komponent używa klas Tailwind Typography:

```css
.prose {
  /* Podstawowe style dla treści tekstowej */
}

.dark:prose-invert {
  /* Odwrócone kolory dla trybu ciemnego */
}

.max-w-none {
  /* Usunięcie maksymalnej szerokości domyślnej dla prose */
}
```

### Fallback dla pustej treści

```typescript
export function BriefContentRenderer({ content }: BriefContentRendererProps) {
  // ... editor setup

  // Fallback gdy content jest pusty
  if (!content || (content.type === 'doc' && (!content.content || content.content.length === 0))) {
    return (
      <p className="text-muted-foreground italic">
        No content available.
      </p>
    );
  }

  // ... rest of component
}
```

---

## BriefContentSection

**Lokalizacja:** `src/components/briefs/BriefContentSection.tsx`

**Typ:** Server Component

**Opis:** Wrapper dla BriefContentRenderer w formie Card.

### Propsy

```typescript
interface BriefContentSectionProps {
  content: unknown; // TipTap JSON
}
```

### Implementacja

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BriefContentRenderer } from './BriefContentRenderer';
import type { JSONContent } from '@tiptap/react';

interface BriefContentSectionProps {
  content: JSONContent;
}

export function BriefContentSection({ content }: BriefContentSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Brief Content</CardTitle>
      </CardHeader>
      <CardContent>
        <BriefContentRenderer content={content} />
      </CardContent>
    </Card>
  );
}
```

---

## BriefFooterSection

**Lokalizacja:** `src/components/briefs/BriefFooterSection.tsx`

**Typ:** Server Component

**Opis:** Opcjonalna sekcja wyświetlająca stopkę briefu. Renderowana tylko gdy `footer !== null`.

### Propsy

```typescript
interface BriefFooterSectionProps {
  footer: string | null;
}
```

### Implementacja

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BriefFooterSectionProps {
  footer: string | null;
}

export function BriefFooterSection({ footer }: BriefFooterSectionProps) {
  // Nie renderuj jeśli footer jest null lub pusty
  if (!footer || footer.trim() === '') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Footer</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground whitespace-pre-wrap">
          {footer}
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## Wymagania dotyczące stylów

### Tailwind Typography Plugin

Upewnij się, że plugin `@tailwindcss/typography` jest zainstalowany i skonfigurowany:

```bash
npm install @tailwindcss/typography
```

W `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  // ... rest of config
  plugins: [
    typography,
  ],
};

export default config;
```

### Customowe style dla prose

Jeśli potrzebne są dostosowania, można je dodać w `global.css`:

```css
@layer components {
  .prose {
    /* Customowe style dla treści briefu */
  }

  .prose h1 {
    @apply text-2xl font-bold mb-4;
  }

  .prose h2 {
    @apply text-xl font-semibold mb-3;
  }

  .prose h3 {
    @apply text-lg font-medium mb-2;
  }

  .prose p {
    @apply mb-4;
  }

  .prose ul,
  .prose ol {
    @apply mb-4 pl-6;
  }

  .prose blockquote {
    @apply border-l-4 border-muted pl-4 italic;
  }

  .prose code {
    @apply bg-muted px-1 py-0.5 rounded text-sm;
  }

  .prose pre {
    @apply bg-muted p-4 rounded overflow-x-auto;
  }
}
```

---

## Warunki renderowania

| Komponent | Warunek |
|-----------|---------|
| `BriefContentSection` | Zawsze renderowany |
| `BriefFooterSection` | `footer !== null && footer.trim() !== ''` |

---

## Obsługa błędów

### Nieprawidłowy format JSON

```typescript
export function BriefContentRenderer({ content }: BriefContentRendererProps) {
  const editor = useEditor({
    // ... config
    content,
    onError: ({ editor, error }) => {
      console.error('TipTap error:', error);
    },
  });

  // Fallback gdy editor nie może wyrenderować treści
  if (!editor) {
    return (
      <div className="p-4 border border-destructive rounded-md">
        <p className="text-destructive">
          Unable to render brief content. The content format may be invalid.
        </p>
      </div>
    );
  }

  return <EditorContent editor={editor} />;
}
```

---

## Accessibility

### Semantyka HTML

- Używaj odpowiedniej hierarchii nagłówków (h1, h2, h3)
- Listy są renderowane jako `<ul>` lub `<ol>`
- Cytaty jako `<blockquote>`
- Kod jako `<code>` lub `<pre>`

### Focus Management

- Treść jest read-only, więc nie potrzebuje focusa
- `focus:outline-none` usuwa domyślny outline

### Screen Readers

TipTap generuje semantyczny HTML, który jest dobrze wspierany przez czytniki ekranu.

---

## Checklist implementacji

- [ ] Zainstalować TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-typography`)
- [ ] Zainstalować i skonfigurować `@tailwindcss/typography`
- [ ] Zaimplementować `BriefContentRenderer`
- [ ] Zaimplementować `BriefContentSection`
- [ ] Zaimplementować `BriefFooterSection`
- [ ] Dodać loading skeleton dla contentu
- [ ] Przetestować renderowanie różnych struktur TipTap JSON
- [ ] Przetestować dark mode
- [ ] Przetestować obsługę pustej treści

---

## Przykładowe struktury TipTap JSON

### Prosty paragraf

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello, world!" }
      ]
    }
  ]
}
```

### Nagłówek z paragrafem

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [
        { "type": "text", "text": "My Heading" }
      ]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Some text content." }
      ]
    }
  ]
}
```

### Lista

```json
{
  "type": "doc",
  "content": [
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "Item 1" }
              ]
            }
          ]
        },
        {
          "type": "listItem",
          "content": [
            {
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "Item 2" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Zależności od innych części

- **Wymaga:** [Part 1: Infrastructure](./brief-details-infrastructure.md) - typy
- **Używane przez:** [Part 6: Main Page](./brief-details-page.md)

## Następne kroki

Po zakończeniu tej części, przejdź do:
- [Part 4: Recipients Section](./brief-details-recipients.md)
