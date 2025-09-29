# AI Rules for {{project-name}}

{{project-description}}

## Tech Stack

- Next.js 15
- TypeScript 5
- React 19
- Tailwind 4
- Shadcn/ui
- TipTap 3

## Project Structure

When introducing changes to the project, always follow the directory structure below:

- `./src` - source code
- `./src/app` - Next.js App Router pages and layouts
- `./src/layouts` - Layout components
- `./src/pages` - Next.js Pages Router (legacy)
- `./src/pages/api` - API endpoints
- `./src/db` - Supabase clients and types
- `./src/types.ts` - Shared types for backend and frontend (Entities, DTOs)
- `./src/components` - React components
- `./src/components/ui` - Client-side components from Shadcn/ui
- `./src/lib` - Services and helpers
- `./src/styles` - Global styles
- `./public` - public assets

When modifying the directory structure, always update this section.

## Coding practices

### Guidelines for clean code

- Use feedback from linters to improve the code when making changes.
- Prioritize error handling and edge cases.
- Handle errors and edge cases at the beginning of functions.
- Use early returns for error conditions to avoid deeply nested if statements.
- Place the happy path last in the function for improved readability.
- Avoid unnecessary else statements; use if-return pattern instead.
- Use guard clauses to handle preconditions and invalid states early.
- Implement proper error logging and user-friendly error messages.
- Consider using custom error types or error factories for consistent error handling.

## Frontend

### General Guidelines

- Use React Server Components for static content and layout where possible
- Use Client Components ("use client") only when interactivity is needed

### Guidelines for Styling

#### Tailwind

- Use the @layer directive to organize styles into components, utilities, and base layers
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus-visible:, active:, etc.) for interactive elements

### Guidelines for Accessibility

#### ARIA Best Practices

- Use ARIA landmarks to identify regions of the page (main, navigation, search, etc.)
- Apply appropriate ARIA roles to custom interface elements that lack semantic HTML equivalents
- Set aria-expanded and aria-controls for expandable content like accordions and dropdowns
- Use aria-live regions with appropriate politeness settings for dynamic content updates
- Implement aria-hidden to hide decorative or duplicative content from screen readers
- Apply aria-label or aria-labelledby for elements without visible text labels
- Use aria-describedby to associate descriptive text with form inputs or complex elements
- Implement aria-current for indicating the current item in a set, navigation, or process
- Avoid redundant ARIA that duplicates the semantics of native HTML elements

### Guidelines for Next.js

- Use App Router for new features and pages
- Leverage Server Actions for form handling and mutations
- Use API Routes in `/pages/api` for external API endpoints
- Use POST, GET - uppercase format for API route handlers
- Use zod for input validation in API routes and Server Actions
- Extract logic into services in `src/lib/services`
- Implement middleware in `middleware.ts` for request/response modification
- Use Next.js Image component for automatic image optimization
- Leverage Server Components by default, use Client Components when needed
- Use cookies() from 'next/headers' for server-side cookie management
- Use process.env for environment variables

### Guidelines for React

- Use functional components with hooks instead of class components
- Use "use client" directive for Client Components that need interactivity
- Extract logic into custom hooks in `src/components/hooks`
- Implement React.memo() for expensive components that render often with the same props
- Utilize React.lazy() and Suspense for code-splitting and performance optimization
- Use the useCallback hook for event handlers passed to child components to prevent unnecessary re-renders
- Prefer useMemo for expensive calculations to avoid recomputation on every render
- Implement useId() for generating unique IDs for accessibility attributes
- Consider using the new useOptimistic hook for optimistic UI updates in forms
- Use useTransition for non-urgent state updates to keep the UI responsive

### Backend and Database

- Use Supabase for backend services, including authentication and database interactions.
- Follow Supabase guidelines for security and performance.
- Use Zod schemas to validate data exchanged with the backend.
- Import supabaseClient directly in Server Components and API routes
- Use SupabaseClient type from `src/db/supabase.client.ts`, not from `@supabase/supabase-js`