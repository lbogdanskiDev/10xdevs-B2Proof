/**
 * Base class for all API errors
 * Provides structured error handling with HTTP status codes
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 401 Unauthorized
 * Thrown when authentication is missing or invalid
 */
export class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

/**
 * 403 Forbidden
 * Thrown when user lacks permissions for the requested resource
 */
export class ForbiddenError extends ApiError {
  constructor(message = "Access forbidden") {
    super("FORBIDDEN", message, 403);
  }
}

/**
 * 404 Not Found
 * Thrown when requested resource doesn't exist
 */
export class NotFoundError extends ApiError {
  constructor(resource: string, identifier?: string) {
    const message = identifier ? `${resource} with ID ${identifier} not found` : `${resource} not found`;
    super("NOT_FOUND", message, 404);
  }
}

/**
 * 400 Bad Request
 * Thrown when request validation fails
 */
export class ValidationError extends ApiError {
  constructor(
    message: string,
    public readonly errors?: unknown
  ) {
    super("VALIDATION_ERROR", message, 400);
  }
}

/**
 * 500 Internal Server Error
 * Thrown for unexpected database or server errors
 */
export class DatabaseError extends ApiError {
  constructor(operation: string, details?: string) {
    const message = details ? `Database error during ${operation}: ${details}` : `Database error during ${operation}`;
    super("DATABASE_ERROR", message, 500);
  }
}

/**
 * 409 Conflict
 * Thrown when resource already exists or conflicts with existing data
 */
export class ConflictError extends ApiError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}
