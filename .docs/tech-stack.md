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
Headless WYSIWYG editor for brief content. Full UI/UX control, extensible node system, JSON-based content storage (not HTML), collaborative-ready (Y.js for future).

**Allowed Extensions (MVP):**
- **Document** (root node) - Container for all content
- **Paragraph** - Basic text blocks
- **Text** - Plain text nodes with marks
- **Bold** - Bold text formatting
- **Italic** - Italic text formatting
- **Underline** - Underlined text
- **Strike** - Strikethrough text
- **Heading** - Headings (levels 1-3 only)
- **BulletList / OrderedList / ListItem** - Lists (bulleted and numbered)
- **HardBreak** - Manual line breaks

**Disabled for MVP:**
- Image upload (no file attachments in MVP)
- Code blocks (not needed for briefs)
- Tables (too complex for MVP)
- Embeds (videos, iframes)
- Custom colors/fonts (simplified design)
- Horizontal rules
- Blockquotes

**Content Structure:**
- Stored as JSON in PostgreSQL JSONB column
- Maximum content length: 10,000 text characters (validated via Zod)
- No user-provided HTML (prevents XSS)
- Output sanitized before rendering

**XSS Prevention:**
- Content stored as structured JSON (not HTML strings)
- TipTap only renders allowed node types
- No script tags or dangerous HTML
- Automatic sanitization on render

**Content Validation:**
- Zod schema validates TipTap document structure
- Recursive character counting for 10,000 limit
- Type checking ensures valid node types
- Helper function `countTipTapTextLength()` in [brief.schema.ts](../src/lib/schemas/brief.schema.ts)

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

---

## Testing

### Unit & Integration Testing

#### Vitest (v4.0+)
Fast test runner with native TypeScript support. Compatible with Jest API, built-in code coverage (v8), watch mode, parallel test execution. Preferred over Jest for Vite/Next.js projects due to faster execution and better ESM support.

**Configuration:** Uses `vmThreads` pool and `v8` coverage provider for stable execution on Windows with ESM modules.

#### @testing-library/react
Component testing utilities focused on user behavior. Encourages accessible queries (getByRole, getByLabelText), avoids testing implementation details, works with React 19 and Server Components.

#### msw (Mock Service Worker)
API mocking at the network level. Intercepts requests in browser and Node.js, realistic testing without backend dependencies, reusable handlers for integration tests.

### End-to-End Testing

#### Playwright
Cross-browser E2E testing framework by Microsoft. Supports Chromium, Firefox, WebKit (Safari), auto-waiting for elements, parallel test execution, built-in test runner (@playwright/test), trace viewer for debugging, screenshot/video recording.

**E2E Test Coverage:**
- All 22 user stories from PRD
- Critical user journeys (authentication, brief management, sharing)
- Role-specific workflows (Creator vs Client)

### Accessibility Testing

#### axe-core
Automated accessibility testing engine. WCAG 2.1 AA compliance checking, integrates with Playwright and Testing Library, catches common accessibility issues.

#### @testing-library/jest-dom
Custom Jest/Vitest matchers for DOM assertions. Readable assertions (toBeVisible, toHaveAccessibleName), accessibility-focused matchers.

### Coverage Reporting

#### c8 / istanbul
Code coverage metrics collection. Statement, branch, function, and line coverage, integrates with Vitest, generates HTML/LCOV reports.

#### Codecov
Coverage reporting in CI/CD. PR comments with coverage changes, historical tracking, coverage badges.

**Coverage Targets:**
| Metric | Target |
|--------|--------|
| Unit Test Coverage | ≥80% for services and utilities |
| Integration Test Coverage | 100% of API endpoints |
| Critical Path E2E Coverage | 100% of user stories |