# Authentication Module Technical Specification - B2Proof

## Table of Contents

1. [Introduction](#1-introduction)
2. [User Interface Architecture](#2-user-interface-architecture)
3. [Backend Logic](#3-backend-logic)
4. [Authentication System](#4-authentication-system)
5. [Error Handling and Validation](#5-error-handling-and-validation)
6. [Use Case Scenarios](#6-use-case-scenarios)

---

## 1. Introduction

### 1.1 Document Purpose

This specification defines the architecture of the authentication module for the B2Proof application, covering registration (US-001), login (US-002), password change (US-015), account deletion (US-016), and logout (US-019) functionalities.

### 1.2 Functional Scope

| User Story | Functionality | Priority |
|------------|---------------|----------|
| US-001 | New user registration | Critical |
| US-002 | User login | Critical |
| US-015 | Password change | High |
| US-016 | Account deletion | High |
| US-019 | Logout | Critical |

### 1.3 Constraints and Assumptions

- Application uses Supabase Auth as the only authentication provider
- User session is stored in HTTP-only cookies
- One active session per user (per US-002)
- No password reset via email functionality in MVP (not listed in PRD)
- No OAuth/SSO in MVP
- **Email confirmation disabled** for MVP (user is active immediately after registration)
- **Interface in English** (per PRD section 3.6)

---

## 2. User Interface Architecture

### 2.1 Routing Structure

```
src/app/
├── (auth)/                          # Route group - public pages
│   ├── layout.tsx                   # Layout for auth pages (centering, branding)
│   ├── login/
│   │   └── page.tsx                 # Server Component - login page
│   └── register/
│       └── page.tsx                 # Server Component - registration page
│
├── (dashboard)/                     # Route group - protected pages
│   └── profile/
│       └── page.tsx                 # Profile page (password change, account deletion)
```

### 2.2 New and Modified Components

#### 2.2.1 Authentication Layout (NEW)

**Location:** `src/app/(auth)/layout.tsx`

**Type:** Server Component

**Responsibilities:**
- Rendering shared layout for `/login` and `/register` pages
- Centering form on page
- Displaying application logo/branding
- Redirect to `/briefs` if user is already logged in

**Dependencies:**
- `createSupabaseServerClient` - session check
- `redirect` from `next/navigation`

---

#### 2.2.2 Login Page (MODIFICATION)

**Location:** `src/app/(auth)/login/page.tsx`

**Type:** Server Component (wrapper)

**Responsibilities:**
- Rendering `LoginForm` as Client Component
- Passing potential URL parameters (e.g., `?error=session_expired`)
- SEO metadata

**Supported URL Parameters:**
- `?error=session_expired` - display session expiration message
- `?redirectTo=/path` - redirect after login

---

#### 2.2.3 Login Form (MODIFICATION)

**Location:** `src/components/auth/LoginForm.tsx`

**Type:** Client Component (`"use client"`)

**Component State:**
```typescript
interface LoginFormState {
  email: string;
  password: string;
  showPassword: boolean;
  isSubmitting: boolean;
  errors: {
    email?: string;
    password?: string;
    general?: string;
  };
}
```

**Responsibilities:**
- Client-side form field validation
- Calling Server Action `loginAction`
- Handling loading/error/success states
- Redirect after successful login
- Password visibility toggle
- Link to registration: "Don't have an account? Create one"

**Backend Integration:**
- Call: `loginAction(formData: FormData)`
- Return: `{ success: boolean; error?: string; redirectTo?: string }`

**Form Fields:**

| Field | Type | Validation | Error Message |
|-------|------|------------|---------------|
| email | email | Email format, required | "Enter a valid email address" |
| password | password | Required | "Password is required" |

---

#### 2.2.4 Registration Page (MODIFICATION)

**Location:** `src/app/(auth)/register/page.tsx`

**Type:** Server Component (wrapper)

**Responsibilities:**
- Rendering `RegisterForm` as Client Component
- SEO metadata
- Account limit information

---

#### 2.2.5 Registration Form (MODIFICATION)

**Location:** `src/components/auth/RegisterForm.tsx`

**Type:** Client Component (`"use client"`)

**Component State:**
```typescript
interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  role: 'creator' | 'client';
  showPassword: boolean;
  showConfirmPassword: boolean;
  isSubmitting: boolean;
  errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
    general?: string;
  };
}
```

**Responsibilities:**
- Client-side validation of all fields
- Real-time password requirements validation (`PasswordRequirements` component)
- Password and confirmation match validation (client-side only)
- User role selection (creator/client)
- Calling Server Action `registerAction`
- Handling loading/error/success states
- Link to login: "Already have an account? Sign in" (per PRD US-001)

**Backend Integration:**
- Call: `registerAction(formData: FormData)`
- Return: `{ success: boolean; error?: string }`
- Note: `confirmPassword` is NOT sent to backend (client-side validation only)

**Form Fields:**

| Field | Type | Validation | Error Message |
|-------|------|------------|---------------|
| email | email | Email format, required, uniqueness (server) | "Enter a valid email address" / "This email is already registered" |
| password | password | Min 8 characters, min 1 digit | "Password must be at least 8 characters" / "Password must contain a digit" |
| confirmPassword | password | Match with password | "Passwords must match" |
| role | radio | Required | "Select account type" |

---

#### 2.2.6 Password Requirements Component (EXISTING)

**Location:** `src/components/auth/PasswordRequirements.tsx`

**Type:** Stateless Client Component

**Props:**
```typescript
interface PasswordRequirementsProps {
  password: string;
  showRequirements: boolean;
}
```

**Responsibilities:**
- Displaying password requirements checklist
- Visual indication of met/unmet requirements
- Show/hide animation

---

#### 2.2.7 Profile Page - Security Section (MODIFICATION)

**Location:** `src/app/(dashboard)/profile/page.tsx`

**Type:** Server Component (wrapper) + Client Components

**Page Sections:**
1. Account information (email, role, registration date) - Server Component
2. Password change - Client Component `ChangePasswordForm`
3. Account deletion - Client Component `DeleteAccountSection`

---

#### 2.2.8 Change Password Form (MODIFICATION)

**Location:** `src/components/profile/ChangePasswordForm.tsx`

**Type:** Client Component (`"use client"`)

**Component State:**
```typescript
interface ChangePasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  isSubmitting: boolean;
  errors: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  };
  successMessage?: string;
}
```

**Responsibilities:**
- Current password validation (server-side)
- New password requirements validation (client + server)
- New password and confirmation match validation (client-side)
- Calling Server Action `changePasswordAction`
- Displaying success message
- Form reset after success

**Form Fields:**

| Field | Type | Validation | Error Message |
|-------|------|------------|---------------|
| currentPassword | password | Required, correctness (server) | "Enter current password" / "Invalid password" |
| newPassword | password | Min 8 characters, min 1 digit, different from current | "Password must be at least 8 characters" / "New password must be different from current" |
| confirmPassword | password | Match with newPassword | "Passwords must match" |

---

#### 2.2.9 Delete Account Section (MODIFICATION)

**Location:** `src/components/profile/DeleteAccountSection.tsx`

**Type:** Client Component (`"use client"`)

**Subcomponents:**
- `DeleteAccountButton` - button initiating the process
- `DeleteAccountModal` - confirmation modal (shadcn/ui AlertDialog)

**Component State:**
```typescript
interface DeleteAccountState {
  isModalOpen: boolean;
  isDeleting: boolean;
  error?: string;
}
```

**Responsibilities:**
- Displaying irreversibility warning
- Confirmation modal with consequence information
- Calling Server Action `deleteAccountAction`
- Logout and redirect after deletion

**Modal Content:**
- Title: "Delete Account"
- Warning: "This action is irreversible. All your data will be deleted, including briefs and comments."
- Buttons: "Cancel" / "Delete Account" (destructive)

---

#### 2.2.10 User Menu - Logout (EXISTING)

**Location:** `src/components/layout/UserMenu.tsx`

**Type:** Client Component (`"use client"`)

**Modification:**
- Integration with `useAuth` hook for `logout()` function
- Loading state handling during logout
- Redirect to `/login` after logout

---

### 2.3 Server/Client Components Responsibility Division

| Component | Type | Justification |
|-----------|------|---------------|
| `(auth)/layout.tsx` | Server | Session check, redirect |
| `login/page.tsx` | Server | SEO, URL parameters |
| `LoginForm.tsx` | Client | Interactivity, form state |
| `register/page.tsx` | Server | SEO |
| `RegisterForm.tsx` | Client | Interactivity, real-time validation |
| `PasswordRequirements.tsx` | Client | Animations, reactivity |
| `profile/page.tsx` | Server | User data, authorization |
| `ChangePasswordForm.tsx` | Client | Form interactivity |
| `DeleteAccountSection.tsx` | Client | Modal, interactivity |
| `UserMenu.tsx` | Client | Dropdown, interactions |

### 2.4 Navigation and Redirects

| Scenario | Source | Target | Condition |
|----------|--------|--------|-----------|
| After login | `/login` | `/briefs` | Login success |
| After registration | `/register` | `/briefs` | Registration success |
| After logout | any | `/login` | Logout call |
| After account deletion | `/profile` | `/login` | Deletion success |
| Access to protected page | `/briefs`, `/profile` | `/login` | No session |
| Access to auth pages | `/login`, `/register` | `/briefs` | Active session |

---

## 3. Backend Logic

### 3.1 Server Actions

#### 3.1.1 Login Action

**Location:** `src/lib/actions/auth.actions.ts`

**Signature:**
```typescript
async function loginAction(formData: FormData): Promise<AuthActionResult>
```

**Result Type:**
```typescript
interface AuthActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
}
```

**Logic:**
1. Extract and validate input data (Zod schema)
2. Call `supabase.auth.signInWithPassword()`
3. Handle Supabase errors (invalid credentials, user not found)
4. Set session cookies
5. Return result

**Handled Errors:**
- `invalid_credentials` → "Invalid email or password"
- `user_not_found` → "Invalid email or password" (intentionally the same for security)

---

#### 3.1.2 Registration Action

**Location:** `src/lib/actions/auth.actions.ts`

**Signature:**
```typescript
async function registerAction(formData: FormData): Promise<AuthActionResult>
```

**Logic:**
1. Extract and validate input data (Zod schema)
2. Call `supabase.auth.signUp()` with metadata `{ role }`
3. Database trigger creates record in `profiles` table
4. Automatic login after registration
5. Return result

**Handled Errors:**
- `user_already_exists` → "This email is already registered"
- `weak_password` → "Password does not meet security requirements"
- `invalid_email` → "Invalid email format"

---

#### 3.1.3 Change Password Action

**Location:** `src/lib/actions/auth.actions.ts`

**Signature:**
```typescript
async function changePasswordAction(formData: FormData): Promise<AuthActionResult>
```

**Logic:**
1. Check active session
2. Validate input data (Zod schema)
3. Verify current password via `signInWithPassword()`
4. Call `supabase.auth.updateUser({ password })`
5. Return result

**Handled Errors:**
- `invalid_credentials` → "Invalid current password"
- `same_password` → "New password must be different from current"
- `weak_password` → "Password does not meet security requirements"

---

#### 3.1.4 Delete Account Action

**Location:** `src/lib/actions/auth.actions.ts`

**Signature:**
```typescript
async function deleteAccountAction(): Promise<AuthActionResult>
```

**Logic:**
1. Check active session
2. Get user ID
3. Call `userService.deleteUserAccount()` (cascade deletion)
4. Logout user
5. Return result with redirect

**Cascade Operations (handled by FK constraints):**
- Delete all user briefs
- Delete all user comments
- Delete brief_recipients entries where user is recipient
- Delete profile
- Delete auth account

---

#### 3.1.5 Logout Action

**Location:** `src/lib/actions/auth.actions.ts`

**Signature:**
```typescript
async function logoutAction(): Promise<AuthActionResult>
```

**Logic:**
1. Call `supabase.auth.signOut()`
2. Clear session cookies
3. Return result with redirect to `/login`

---

### 3.2 Zod Validation Schemas

**Location:** `src/lib/schemas/auth.schema.ts`

```typescript
// Login schema
const loginSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z.string()
    .min(1, "Password is required"),
});

// Registration schema
const registerSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain at least one digit"),
  role: z.enum(['creator', 'client'], {
    required_error: "Select account type",
  }),
});

// Change password schema
const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain at least one digit"),
  confirmPassword: z.string()
    .min(1, "Password confirmation is required"),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Passwords must match",
    path: ["confirmPassword"],
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: "New password must be different from current",
    path: ["newPassword"],
  }
);
```

---

### 3.3 Data Types

**Location:** `src/lib/types/auth.types.ts`

```typescript
// Action input data
interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
  role: 'creator' | 'client';
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Action result
interface AuthActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
}

// Session data
interface SessionUser {
  id: string;
  email: string;
  role: 'creator' | 'client';
}
```

---

### 3.4 Authentication Service

**Location:** `src/lib/services/auth.service.ts`

**Methods:**

```typescript
class AuthService {
  /**
   * Gets current user session
   */
  async getSession(): Promise<Session | null>;

  /**
   * Gets user data from session
   */
  async getCurrentUser(): Promise<SessionUser | null>;

  /**
   * Checks if email is already registered
   */
  async isEmailRegistered(email: string): Promise<boolean>;

  /**
   * Verifies user password
   */
  async verifyPassword(email: string, password: string): Promise<boolean>;

  /**
   * Terminates all user sessions except current
   */
  async terminateOtherSessions(userId: string): Promise<void>;
}
```

---

### 3.5 Middleware Modification

**Location:** `src/middleware.ts`

**Changes:**
1. Remove mock authentication (DEFAULT_USER_PROFILE)
2. Implement actual Supabase session checking
3. Handle token refresh

**Logic:**
```typescript
export async function middleware(request: NextRequest) {
  const supabase = createSupabaseMiddlewareClient(request);

  // Refresh session if expired
  const { data: { session }, error } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // Public pages (auth)
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  // Protected pages
  const isProtectedPage = pathname.startsWith('/briefs') || pathname.startsWith('/profile');

  // Redirect logged-in user from auth pages
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/briefs', request.url));
  }

  // Redirect non-logged-in user from protected pages
  if (isProtectedPage && !session) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect from root
  if (pathname === '/') {
    return NextResponse.redirect(
      new URL(session ? '/briefs' : '/login', request.url)
    );
  }

  return NextResponse.next();
}
```

---

### 3.6 Supabase Client Configuration

#### 3.6.1 Browser Client (MODIFICATION)

**Location:** `src/db/supabase.client.ts`

**Changes:**
- Remove `DEFAULT_USER_PROFILE`
- Configure cookie storage for session

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

#### 3.6.2 Server Client (MODIFICATION)

**Location:** `src/db/supabase.server.ts`

**Changes:**
- Configure cookie handling for Server Components
- Remove mock auth logic

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  );
}
```

#### 3.6.3 Middleware Client (NEW)

**Location:** `src/db/supabase.middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, response };
}
```

---

## 4. Authentication System

### 4.1 Registration Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌────────────┐
│  RegisterForm│────▶│registerAction│────▶│Supabase signUp()│────▶│  Trigger   │
│  (Client)   │     │(Server Action)│     │                 │     │creates     │
└─────────────┘     └──────────────┘     └─────────────────┘     │profile     │
       │                   │                      │               └────────────┘
       │                   │                      │
       ▼                   ▼                      ▼
   Client-side         Zod validation       Account creation
   validation          server-side          in auth.users
       │                   │                      │
       │                   │                      ▼
       │                   │              Automatic login
       │                   │                      │
       ▼                   ▼                      ▼
   UI errors          Return errors        Redirect /briefs
```

**Detailed Steps:**

1. User fills registration form
2. Client-side validation (email format, password requirements, confirm match)
3. Submit calls `registerAction` with FormData
4. Server Action validates via Zod schema
5. Call `supabase.auth.signUp()` with `user_metadata: { role }`
6. Database trigger `on_auth_user_created` creates record in `profiles`
7. Automatic login (signUp returns session)
8. Redirect to `/briefs`

**Database Trigger:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'client')::user_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### 4.2 Login Flow

```
┌───────────┐     ┌────────────┐     ┌───────────────────────┐
│ LoginForm │────▶│loginAction │────▶│signInWithPassword()   │
│ (Client)  │     │(Server)    │     │                       │
└───────────┘     └────────────┘     └───────────────────────┘
      │                 │                       │
      │                 │                       ▼
      │                 │              Credentials verification
      │                 │                       │
      ▼                 ▼                       ▼
  Client-side      Zod validation         Session creation
  validation       server-side            (JWT + refresh token)
      │                 │                       │
      │                 │                       ▼
      │                 │               Set cookies
      │                 │                       │
      ▼                 ▼                       ▼
  UI errors        Return errors        Redirect /briefs
```

**Session Management (US-002 - one active session):**

Supabase allows multiple sessions by default. To enforce single session:

1. On login, check for active user sessions
2. If other sessions exist, terminate them via `signOut({ scope: 'others' })`
3. Create new session

```typescript
// In loginAction after successful signIn:
await supabase.auth.signOut({ scope: 'others' });
```

---

### 4.3 Logout Flow

```
┌────────────┐     ┌─────────────┐     ┌──────────────┐
│ UserMenu   │────▶│logoutAction │────▶│auth.signOut()│
│ (Client)   │     │(Server)     │     │              │
└────────────┘     └─────────────┘     └──────────────┘
      │                  │                    │
      │                  │                    ▼
      │                  │            Session deletion
      │                  │                    │
      │                  │                    ▼
      │                  │            Clear cookies
      │                  │                    │
      ▼                  ▼                    ▼
  Loading state    Server redirect      Redirect /login
```

---

### 4.4 Password Change Flow

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│ChangePasswordForm│────▶│changePasswordAction │────▶│Password verify   │
│ (Client)         │     │(Server)             │     │(signInWithPassword)
└──────────────────┘     └─────────────────────┘     └──────────────────┘
        │                         │                          │
        │                         │                          ▼
        │                         │                   If correct:
        │                         │                          │
        ▼                         ▼                          ▼
   Client-side              Zod validation            updateUser()
   validation               server-side              { password: new }
        │                         │                          │
        │                         │                          ▼
        │                         │                   Session remains
        │                         │                          │
        ▼                         ▼                          ▼
   UI errors              Return errors             Success message
```

---

### 4.5 Account Deletion Flow

```
┌───────────────────┐     ┌──────────────┐     ┌───────────────────┐
│DeleteAccountSection│────▶│Confirmation  │────▶│deleteAccountAction│
│ (Client)          │     │Modal         │     │(Server)           │
└───────────────────┘     └──────────────┘     └───────────────────┘
         │                       │                      │
         │                       │                      ▼
         │                       │              Session check
         │                       │                      │
         ▼                       ▼                      ▼
    Button                "Yes, delete"        userService.deleteAccount()
    "Delete Account"                                    │
                                                        ▼
                                               Cascade deletion:
                                               - briefs
                                               - comments
                                               - recipients
                                               - profile
                                                        │
                                                        ▼
                                               auth.admin.deleteUser()
                                                        │
                                                        ▼
                                               signOut + redirect /login
```

**Cascade Deletion (database constraints):**
```sql
-- Briefs owned by user
ALTER TABLE briefs
  ADD CONSTRAINT fk_briefs_owner
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Comments by user
ALTER TABLE comments
  ADD CONSTRAINT fk_comments_author
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Brief recipients entries
ALTER TABLE brief_recipients
  ADD CONSTRAINT fk_recipients_user
  FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;
```

---

### 4.6 Session Storage

**Mechanism:** HTTP-only cookies with Supabase SSR

**Cookies set by Supabase:**
- `sb-<project-ref>-auth-token` - JWT access token
- `sb-<project-ref>-auth-token-code-verifier` - PKCE code verifier (if used)

**Cookie Configuration:**
```typescript
{
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 7 // 7 days
}
```

**Token Refresh:**
- Middleware automatically refreshes expired tokens
- Refresh token valid for 7 days (Supabase default)
- Access token valid for 1 hour (default)

---

## 5. Error Handling and Validation

### 5.1 Error Hierarchy

```
AuthError (base)
├── ValidationError (400)
│   ├── InvalidEmailError
│   ├── WeakPasswordError
│   └── MissingFieldError
├── AuthenticationError (401)
│   ├── InvalidCredentialsError
│   └── SessionExpiredError
├── ConflictError (409)
│   └── EmailAlreadyExistsError
└── ServerError (500)
    └── DatabaseError
```

### 5.2 Supabase Error Mapping

| Supabase Code | HTTP Status | User Message |
|---------------|-------------|--------------|
| `invalid_credentials` | 401 | "Invalid email or password" |
| `user_already_exists` | 409 | "This email is already registered" |
| `weak_password` | 400 | "Password does not meet security requirements" |
| `invalid_email` | 400 | "Invalid email format" |
| `session_not_found` | 401 | "Session expired. Please log in again" |
| `user_not_found` | 401 | "Invalid email or password" |

**Note:** Email confirmation is disabled in Supabase for MVP (no email verification).

### 5.3 Client-side Validation

**Purpose:** Immediate feedback, reduce unnecessary requests

**Implementation:**
```typescript
// In form component
const validateEmail = (email: string): string | undefined => {
  if (!email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Invalid email format";
  }
  return undefined;
};

const validatePassword = (password: string): string | undefined => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/\d/.test(password)) return "Password must contain at least one digit";
  return undefined;
};
```

### 5.4 Server-side Validation

**Purpose:** Security, final verification before operation

**Zod Implementation:**
```typescript
// In Server Action
const result = loginSchema.safeParse({
  email: formData.get('email'),
  password: formData.get('password'),
});

if (!result.success) {
  const fieldErrors = result.error.flatten().fieldErrors;
  return {
    success: false,
    fieldErrors: Object.fromEntries(
      Object.entries(fieldErrors).map(([key, errors]) => [key, errors?.[0]])
    ),
  };
}
```

### 5.5 UI Error Display

**Form Field Errors:**
- Displayed directly below field
- Red text color
- Warning icon
- Red field border

**General Errors:**
- Displayed above form in Alert component
- Destructive variant shadcn/ui Alert
- AlertCircle icon

**Example:**
```tsx
{errors.general && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{errors.general}</AlertDescription>
  </Alert>
)}
```

---

## 6. Use Case Scenarios

### 6.1 New User Registration (US-001)

**Actor:** New user

**Preconditions:** User doesn't have an account in the system

**Main Flow:**
1. User opens `/register`
2. System displays registration form
3. User fills email, password, password confirmation
4. User selects role (creator/client)
5. System validates data in real-time
6. User clicks "Create Account"
7. System creates account and automatically logs in
8. System redirects to `/briefs`

**Alternative Flows:**

*3a. Email already registered:*
- System displays error "This email is already registered"
- "Sign in" link below message

*3b. Password doesn't meet requirements:*
- System displays requirements as checklist
- Unmet requirements marked in red

*3c. Passwords don't match:*
- System displays error at confirmation field
- Error "Passwords must match"

---

### 6.2 User Login (US-002)

**Actor:** Registered user

**Preconditions:** User has an account in the system

**Main Flow:**
1. User opens `/login`
2. System displays login form
3. User enters email and password
4. User clicks "Sign in"
5. System verifies data
6. System terminates previous session (if exists)
7. System creates new session
8. System redirects to `/briefs` (or `redirectTo` from URL)

**Alternative Flows:**

*5a. Invalid login credentials:*
- System displays error "Invalid email or password"
- Form is not cleared (password is cleared)

*5b. Account inactive/blocked:*
- System displays appropriate message
- Login not possible

---

### 6.3 Password Change (US-015)

**Actor:** Logged-in user

**Preconditions:** User is logged in

**Main Flow:**
1. User opens `/profile`
2. System displays "Change Password" section
3. User enters current password
4. User enters new password
5. User confirms new password
6. System validates password requirements
7. User clicks "Change Password"
8. System verifies current password
9. System updates password
10. System displays success message
11. User remains logged in

**Alternative Flows:**

*8a. Invalid current password:*
- System displays error "Invalid current password"

*4a. New password same as current:*
- System displays error "New password must be different from current"

*5a. Passwords don't match:*
- System displays error "Passwords must match"

---

### 6.4 Account Deletion (US-016)

**Actor:** Logged-in user

**Preconditions:** User is logged in

**Main Flow:**
1. User opens `/profile`
2. System displays "Delete Account" section
3. User clicks "Delete Account"
4. System displays confirmation modal with warning
5. User confirms deletion
6. System deletes all user data
7. System logs out user
8. System redirects to `/login`

**Alternative Flows:**

*5a. User cancels:*
- Modal closes
- No changes made

*6a. Error during deletion:*
- System displays error message
- Account remains intact

---

### 6.5 Logout (US-019)

**Actor:** Logged-in user

**Preconditions:** User is logged in

**Main Flow:**
1. User clicks user menu in navigation
2. User clicks "Sign out"
3. System terminates session
4. System clears cookies
5. System redirects to `/login`

**Alternative Flows:**

*3a. Logout error:*
- System retries logout
- On subsequent failure - forced cookie clearing

---

### 6.6 Protected Page Access Without Authorization

**Actor:** Non-logged-in user

**Main Flow:**
1. User tries to open `/briefs` or `/profile`
2. Middleware detects no session
3. System redirects to `/login?redirectTo=/briefs`
4. User logs in
5. System redirects to original page

---

### 6.7 Session Expiration During Work

**Actor:** Logged-in user

**Main Flow:**
1. User works in application
2. Session expires (after 7 days of inactivity)
3. User performs action requiring authorization
4. System detects expired session
5. System redirects to `/login?error=session_expired`
6. System displays message "Session expired. Please log in again"

---

## Appendix A: Configuration Constants

**Location:** `src/lib/constants/auth.constants.ts`

```typescript
export const AUTH_CONSTANTS = {
  // Password validation
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_DIGIT: true,

  // Session
  SESSION_DURATION_DAYS: 7,
  ACCESS_TOKEN_DURATION_HOURS: 1,

  // Routing
  ROUTES: {
    LOGIN: '/login',
    REGISTER: '/register',
    BRIEFS: '/briefs',
    PROFILE: '/profile',
  },

  // Messages (English - per PRD requirement)
  MESSAGES: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_EXISTS: 'This email is already registered',
    SESSION_EXPIRED: 'Session expired. Please log in again',
    ACCOUNT_DELETED: 'Account has been deleted',
    PASSWORD_CHANGED: 'Password has been changed',
    WEAK_PASSWORD: 'Password does not meet security requirements',
    PASSWORDS_MUST_MATCH: 'Passwords must match',
    NEW_PASSWORD_MUST_DIFFER: 'New password must be different from current',
    SELECT_ACCOUNT_TYPE: 'Select account type',
  },
} as const;
```

---

## Appendix B: File Structure for Creation/Modification

### New Files:
```
src/
├── app/
│   └── (auth)/
│       └── layout.tsx                    # Auth pages layout
├── db/
│   └── supabase.middleware.ts            # Middleware client
├── lib/
│   ├── actions/
│   │   └── auth.actions.ts               # Server Actions
│   ├── schemas/
│   │   └── auth.schema.ts                # Zod schemas
│   ├── services/
│   │   └── auth.service.ts               # Auth service
│   ├── types/
│   │   └── auth.types.ts                 # Auth types
│   └── constants/
│       └── auth.constants.ts             # Auth constants
```

### Files to Modify:
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx                # Server Action integration
│   │   └── register/page.tsx             # Server Action integration
│   └── (dashboard)/
│       └── profile/page.tsx              # Password change and deletion sections
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx                 # Remove mock auth
│   │   └── RegisterForm.tsx              # Remove mock auth
│   ├── profile/
│   │   ├── ChangePasswordForm.tsx        # Server Action integration
│   │   └── DeleteAccountSection.tsx      # Server Action integration
│   ├── layout/
│   │   └── UserMenu.tsx                  # Logout integration
│   └── hooks/
│       └── use-auth.tsx                  # Remove mock data
├── db/
│   ├── supabase.client.ts                # Remove DEFAULT_USER_PROFILE
│   └── supabase.server.ts                # Cookie configuration
├── lib/
│   └── services/
│       └── user.service.ts               # Remove mock profile
└── middleware.ts                          # Real session verification
```

---

## Appendix C: Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only, for admin operations
```

---

## Appendix D: Security Requirements

1. **Passwords:**
   - Never log passwords
   - Don't store plain-text (Supabase uses bcrypt)
   - Minimum 8 characters + 1 digit

2. **Sessions:**
   - HTTP-only cookies
   - Secure flag in production
   - SameSite=Lax
   - Automatic token refresh

3. **Error Messages:**
   - Don't reveal if email exists (on login)
   - Generic messages for invalid credentials

4. **CSRF:**
   - Server Actions have built-in CSRF protection
   - SameSite cookies provide additional protection

5. **Supabase Configuration (MVP):**
   - Email confirmation: **DISABLED** (Supabase Dashboard → Authentication → Email Settings → "Confirm email" = OFF)
   - Rate limiting: default Supabase settings (no custom implementation in MVP)
