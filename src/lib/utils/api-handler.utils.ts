/**
 * API Handler Utilities
 *
 * Reusable utilities for reducing boilerplate in API route handlers:
 * - Input validation with Zod
 * - Authentication context management
 * - Standardized error handling
 * - JSON body parsing
 */

import { NextResponse } from "next/server";
import type { ZodSchema, ZodError } from "zod";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { ApiError } from "@/lib/errors/api-errors";
import type { ErrorReturn, ValidationErrorDetail, SupabaseClient } from "@/types";
import type { User } from "@supabase/supabase-js";

/**
 * Result type for operations that may fail
 * Used for consistent success/error handling without exceptions
 */
type Result<T, E = ErrorReturn> = { success: true; data: T } | { success: false; error: E; status: number };

/**
 * Authenticated user context with Supabase client
 * Contains all necessary data for authorized API operations
 */
export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
  userId: string;
  userEmail: string;
}

/**
 * Format Zod errors into ValidationErrorDetail array
 * Transforms Zod error objects into a consistent API response format
 */
export function formatZodErrors(error: ZodError): ValidationErrorDetail[] {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}

/**
 * Validate input against a Zod schema
 * Returns typed validation result with error details
 *
 * @param schema - Zod schema to validate against
 * @param data - Input data to validate
 * @param errorMessage - Custom error message for validation failures
 * @returns Result with validated data or error details
 */
export function validateInput<T>(schema: ZodSchema<T>, data: unknown, errorMessage = "Validation failed"): Result<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const details = formatZodErrors(result.error);
    return {
      success: false,
      error: { error: errorMessage, details },
      status: 400,
    };
  }

  return { success: true, data: result.data };
}

/**
 * Get authenticated user context
 * Creates Supabase client and validates authentication
 *
 * @returns Result with auth context or 401 error
 */
export async function getAuthContext(): Promise<Result<AuthContext>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      success: false,
      error: { error: "Unauthorized" },
      status: 401,
    };
  }

  return {
    success: true,
    data: {
      supabase,
      user,
      userId: user.id,
      userEmail: user.email ?? "",
    },
  };
}

/**
 * Handle API errors and convert to NextResponse
 * Logs errors and returns appropriate HTTP response
 *
 * @param error - Error object (ApiError or unknown)
 * @param endpoint - API endpoint identifier for logging
 * @returns NextResponse with error details
 */
export function handleApiError(error: unknown, endpoint: string): NextResponse<ErrorReturn> {
  if (error instanceof ApiError) {
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error(`[${endpoint}] API error (${error.statusCode}):`, error.message);
    return NextResponse.json<ErrorReturn>({ error: error.message }, { status: error.statusCode });
  }

  // eslint-disable-next-line no-console -- API error logging for debugging
  console.error(`[${endpoint}] Unexpected error:`, error);
  return NextResponse.json<ErrorReturn>({ error: "Internal server error" }, { status: 500 });
}

/**
 * Create error response from Result
 * Converts a failed Result into a NextResponse
 *
 * @param result - Failed result containing error and status
 * @returns NextResponse with error JSON
 */
export function errorResponse(result: { error: ErrorReturn; status: number }): NextResponse<ErrorReturn> {
  return NextResponse.json<ErrorReturn>(result.error, { status: result.status });
}

/**
 * Parse JSON body from request with error handling
 * Safely parses request body and returns Result
 *
 * @param request - Request object with JSON body
 * @returns Result with parsed body or parse error
 */
export async function parseJsonBody<T>(request: Request): Promise<Result<T>> {
  try {
    const body = await request.json();
    return { success: true, data: body as T };
  } catch {
    return {
      success: false,
      error: { error: "Invalid JSON body" },
      status: 400,
    };
  }
}

/**
 * Log validation error with endpoint context
 * Utility for consistent validation error logging
 *
 * @param endpoint - API endpoint identifier
 * @param details - Validation error details
 */
export function logValidationError(endpoint: string, details: ValidationErrorDetail[]): void {
  // eslint-disable-next-line no-console -- API error logging for debugging
  console.error(`[${endpoint}] Validation error:`, details);
}

/**
 * Parse and validate JSON request body against a Zod schema
 * Combines parseJsonBody + validation into a single step
 *
 * @param request - Request object with JSON body
 * @param schema - Zod schema to validate against
 * @param endpoint - API endpoint identifier for logging
 * @param options - Additional options
 * @returns Result with validated data or error
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: ZodSchema<T>,
  endpoint: string,
  options: { requireNonEmpty?: boolean } = {}
): Promise<Result<T>> {
  const { requireNonEmpty = false } = options;

  // Parse JSON body
  const bodyResult = await parseJsonBody<unknown>(request);
  if (!bodyResult.success) {
    return bodyResult;
  }

  // Check for empty body if required
  if (requireNonEmpty) {
    if (!bodyResult.data || (typeof bodyResult.data === "object" && Object.keys(bodyResult.data).length === 0)) {
      return {
        success: false,
        error: { error: "Request body is required" },
        status: 400,
      };
    }
  }

  // Validate against schema
  const validationResult = schema.safeParse(bodyResult.data);
  if (!validationResult.success) {
    const details = formatZodErrors(validationResult.error);
    logValidationError(endpoint, details);
    return {
      success: false,
      error: { error: "Validation failed", details },
      status: 400,
    };
  }

  return { success: true, data: validationResult.data };
}
