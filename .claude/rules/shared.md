---
description:
globs:
alwaysApply: true
---

# AI Rules for B2Proof

{project-description}

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
- `./src/app` - Next.js App Router pages, layouts, and API routes
- `./src/app/api` - API endpoints (Route Handlers in `route.ts` files)
- `./src/db` - Supabase clients and database types
- `./src/types.ts` - Shared types for backend and frontend (Entities, DTOs)
- `./src/components` - React components
- `./src/components/ui` - Client-side UI components from Shadcn/ui
- `./src/components/hooks` - Custom React hooks
- `./src/lib` - Services and utility helpers
- `./src/lib/services` - Business logic services
- `./src/styles` - Global styles
- `./public` - public static assets
- `./supabase` - Supabase configuration and migrations

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
