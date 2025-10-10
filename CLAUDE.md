# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Next.js 15** (v15.1.0) - React framework with App Router
- **React 19** (v19.0.0) - UI library for building components
- **TypeScript 5** (v5.8.0) - Type-safe development
- **Tailwind CSS 4** (v4.0.0) - Utility-first styling
- **Shadcn/ui** - UI component library (New York style)
- **Supabase** - Backend for database and authentication
- **TipTap** - Rich text editor
- **Node.js v22.14.0** - Runtime (see `.nvmrc`)

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)

# Build & Production
npm run build           # Production build
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Auto-fix ESLint issues
npm run format          # Format with Prettier
npm run type-check      # Run TypeScript type checking
```

## Project Structure

```
./src
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── api/                 # API routes (Route Handlers)
│   └── [...routes]/         # Other app routes
├── components/              # React components
│   ├── ui/                  # Shadcn/ui components
│   └── hooks/               # Custom React hooks
├── lib/                     # Utilities and helpers
│   ├── utils.ts             # cn() utility for class merging
│   └── services/            # Business logic services
├── db/                      # Database clients and types
├── types.ts                 # Shared types (Entities, DTOs)
└── styles/                  # Global styles (global.css)

./public/                    # Public static assets
```

## Key Architecture Patterns

### Component Strategy
- **Server Components** (default) - Use for static content, data fetching, and SEO-critical content
- **Client Components** (`.tsx` with `"use client"`) - Use only when interactivity is required (event handlers, hooks, browser APIs)
- Server Components can import Client Components, but not vice versa
- Keep components as Server Components by default unless client interactivity is needed

### API Routes (Route Handlers)
- Place in `src/app/api/` directory
- Use uppercase HTTP methods: `export async function GET()`, `export async function POST()`
- File naming: `route.ts` for API endpoints
- Validate input with Zod schemas
- Extract business logic to services in `src/lib/services/`
- Return `Response` objects or use `NextResponse` helper

### Backend Integration
- Use Supabase for database and authentication
- Import `SupabaseClient` type from `src/db/supabase.client.ts`
- Validate data exchanged with backend using Zod schemas
- Use Server Actions for form submissions and mutations

### Environment & Configuration
- Access environment variables via `process.env` (server-side)
- Server-side cookie management: use `cookies()` from `next/headers`
- Path aliases: `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Use `next.config.ts` for Next.js configuration

## Code Quality Standards

### Error Handling
- Handle errors and edge cases at the beginning of functions
- Use early returns for error conditions (avoid deeply nested ifs)
- Place happy path last in functions
- Use guard clauses for preconditions
- Implement proper error logging with user-friendly messages

### React Best Practices
- Use functional components with hooks
- Extract reusable logic to custom hooks in `src/components/hooks/`
- Use `React.memo()` for expensive components with stable props
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive calculations
- Use `useId()` for accessibility attribute IDs
- Consider `useOptimistic` for optimistic UI updates
- Use `useTransition` for non-urgent state updates
- Implement code-splitting with `React.lazy()` and `Suspense`

### Next.js Best Practices
- Use Server Components by default; only use Client Components when needed
- Leverage App Router file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Use `next/image` for optimized image loading
- Implement loading states with `loading.tsx` files
- Handle errors gracefully with `error.tsx` boundaries
- Use middleware (`middleware.ts`) for request/response modification
- Implement parallel routes and intercepting routes when needed
- Use Server Actions for mutations instead of API routes when possible

### Styling with Tailwind
- Use `@layer` directive to organize styles (components, utilities, base)
- Use arbitrary values with square brackets for one-off designs: `w-[123px]`
- Use responsive variants: `sm:`, `md:`, `lg:`, etc.
- Use state variants: `hover:`, `focus-visible:`, `active:`
- Implement dark mode with `dark:` variant

### Accessibility (ARIA)
- Use ARIA landmarks for page regions (main, navigation, search)
- Use `aria-expanded` and `aria-controls` for expandable content
- Use `aria-live` regions for dynamic content updates
- Use `aria-label` or `aria-labelledby` for elements without visible labels
- Use `aria-describedby` for descriptive text associations
- Avoid redundant ARIA that duplicates native HTML semantics

### Linting & Formatting
- Use ESLint feedback to improve code during changes
- Project uses lint-staged with Husky for pre-commit checks
- Auto-formatted files: `*.{ts,tsx}` (ESLint), `*.{json,css,md}` (Prettier)

## Next.js App Router Specific Patterns

### File Conventions
- `page.tsx` - UI for a route segment
- `layout.tsx` - Shared UI for a segment and its children
- `loading.tsx` - Loading UI for a segment and its children
- `error.tsx` - Error UI for a segment and its children
- `not-found.tsx` - Not found UI for a segment
- `route.ts` - API endpoint (Route Handler)

### Data Fetching
- Fetch data directly in Server Components using `async/await`
- Use `fetch()` with Next.js automatic request deduplication
- Implement caching strategies with `revalidate` option
- Use `unstable_cache` for manual caching when needed

### Routing
- File-system based routing in `src/app/` directory
- Dynamic routes: `[id]/page.tsx`
- Catch-all routes: `[...slug]/page.tsx`
- Route groups: `(group)/page.tsx` (doesn't affect URL)
- Use `useRouter` from `next/navigation` (not `next/router`)
- Use `Link` component from `next/link` for navigation

## Shadcn/ui Integration

### Component Usage
- Components are installed in `src/components/ui/`
- Use the `cn()` utility from `@/lib/utils` for conditional class merging
- Configuration in `components.json`:
  - Style: "new-york"
  - Icon library: "lucide-react"
  - Path aliases configured for `@/components`, `@/lib/utils`, etc.

### Adding New Components
```bash
npx shadcn@latest add [component-name]
```

## ESLint Configuration

The project uses a modern flat config with:
- TypeScript ESLint (strict + stylistic)
- React plugin with hooks validation
- React Compiler plugin (enforces React Compiler rules)
- JSX accessibility plugin (jsx-a11y)
- Prettier integration
- React 19 support (no need for `React` import in JSX)
