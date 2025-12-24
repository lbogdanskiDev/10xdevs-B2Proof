/**
 * Authentication module configuration constants
 * Based on auth-spec.md Appendix A
 */
export const AUTH_CONSTANTS = {
  // Password validation
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_DIGIT: true,

  // Session
  SESSION_DURATION_DAYS: 7,
  ACCESS_TOKEN_DURATION_HOURS: 1,

  // Routing
  ROUTES: {
    HOME: "/",
    LOGIN: "/login",
    REGISTER: "/register",
    BRIEFS: "/briefs",
    PROFILE: "/profile",
  },

  /**
   * Route protection configuration
   * - PUBLIC_PATHS: Routes accessible without authentication
   * - PROTECTED_PATHS: Routes requiring authentication (prefix matching)
   * - AUTH_PATHS: Auth pages that redirect authenticated users away
   */
  ROUTE_PROTECTION: {
    // Routes accessible without authentication
    PUBLIC_PATHS: ["/login", "/register", "/api/auth/login", "/api/auth/register", "/api/auth/callback"],
    // Routes requiring authentication (uses startsWith matching)
    PROTECTED_PATHS: ["/briefs", "/profile"],
    // Auth pages - logged-in users should be redirected away
    AUTH_PATHS: ["/login", "/register"],
    // Default redirect for authenticated users on auth pages
    DEFAULT_AUTHENTICATED_REDIRECT: "/briefs",
    // Default redirect for unauthenticated users on protected pages
    DEFAULT_UNAUTHENTICATED_REDIRECT: "/login",
  },

  // Messages (English - per PRD requirement)
  MESSAGES: {
    INVALID_CREDENTIALS: "Invalid email or password",
    EMAIL_EXISTS: "This email is already registered",
    SESSION_EXPIRED: "Session expired. Please log in again",
    ACCOUNT_DELETED: "Account has been deleted",
    PASSWORD_CHANGED: "Password has been changed",
    WEAK_PASSWORD: "Password does not meet security requirements",
    PASSWORDS_MUST_MATCH: "Passwords must match",
    NEW_PASSWORD_MUST_DIFFER: "New password must be different from current",
    SELECT_ACCOUNT_TYPE: "Select account type",
    EMAIL_REQUIRED: "Email is required",
    PASSWORD_REQUIRED: "Password is required",
    INVALID_EMAIL_FORMAT: "Invalid email format",
    PASSWORD_MIN_LENGTH: "Password must be at least 8 characters",
    PASSWORD_REQUIRE_DIGIT: "Password must contain at least one digit",
  },

  // URL Parameters
  URL_PARAMS: {
    ERROR: "error",
    REDIRECT_TO: "redirectTo",
  },

  // Error codes
  ERROR_CODES: {
    SESSION_EXPIRED: "session_expired",
    INVALID_CREDENTIALS: "invalid_credentials",
    USER_ALREADY_EXISTS: "user_already_exists",
    WEAK_PASSWORD: "weak_password",
    INVALID_EMAIL: "invalid_email",
    SESSION_NOT_FOUND: "session_not_found",
    USER_NOT_FOUND: "user_not_found",
  },
} as const;

/**
 * Type for auth route paths
 */
export type AuthRoute = (typeof AUTH_CONSTANTS.ROUTES)[keyof typeof AUTH_CONSTANTS.ROUTES];

/**
 * Type for auth error codes
 */
export type AuthErrorCode = (typeof AUTH_CONSTANTS.ERROR_CODES)[keyof typeof AUTH_CONSTANTS.ERROR_CODES];
