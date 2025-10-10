# Tech Stack - B2Proof

## Frontend

### Next.js 15 (v15.1.0)
React framework with App Router and Server Components. Hybrid rendering (Server Components by default, Client Components where interactivity is needed), built-in optimizations (code-splitting, prefetching), SEO-friendly SSR, API Route Handlers for backend endpoints.

### TypeScript 5 (v5.8.0)
Static typing with better IDE support. Auto-generated types from Supabase database, type-safe API routes and Server Actions, Zod schemas for validation.

### Tailwind CSS 4 (v4.0.0)
Utility-first CSS framework. Minimal bundles (only used classes), built-in design system (spacing, colors), responsive + dark mode prefixes, zero runtime overhead.

### Shadcn/ui (New York style)
Copy-paste UI components (full control, zero vendor lock-in). Accessibility built-in (ARIA + Radix UI), Tailwind-native, components in `src/components/ui/`.

### TipTap 3
Headless WYSIWYG editor. Full UI/UX control, extensible (custom nodes for proof annotations), Markdown support, collaborative-ready (Y.js).

---

## Backend

### Supabase - Comprehensive Backend Solution

#### PostgreSQL Database
Relational database ideal for structured data (users, proofs, tags). ACID compliance for proof consistency, Row Level Security (each user sees only their data), full-text search.

#### Backend-as-a-Service
Auto-generated REST API (CRUD endpoints for all tables), TypeScript SDK with type-safe queries, Storage API for images and attachments, Realtime subscriptions (WebSocket).

#### Authentication & Authorization
Built-in authentication (Email/Password + OAuth Google/GitHub), JWT tokens, role-based access, RLS policies at database level.

#### Open Source
Self-hosting capability for the future, zero vendor lock-in (PostgreSQL is a standard), local development (Supabase CLI + Docker).

---

## CI/CD & Hosting

### GitHub Actions
Native integration with GitHub repo (zero setup). Pipeline: Lint → Type Check → Build → Deploy. Triggers: PR checks (blocks merge if fails), auto-deploy on merge to main. Free tier: 2000 min/month.

### Vercel
Best Next.js integration (framework creators). Global Edge Network CDN, instant deployments (~30s), preview URLs for each PR, automatic HTTPS, Web Vitals monitoring. Free tier sufficient for MVP.