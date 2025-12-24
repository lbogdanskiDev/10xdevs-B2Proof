"use server";

import { createSupabaseServerClient } from "@/db/supabase.server";
import { AUTH_CONSTANTS } from "@/lib/constants/auth.constants";
import { loginSchema, registerSchema } from "@/lib/schemas/auth.schema";
import { updatePendingRecipients } from "@/lib/services/brief.service";
import type { AuthActionResult } from "@/lib/types/auth.types";

/**
 * Maps Supabase error messages to user-friendly messages
 */
function mapSupabaseError(errorMessage: string): string {
  if (errorMessage.includes("Invalid login credentials")) {
    return AUTH_CONSTANTS.MESSAGES.INVALID_CREDENTIALS;
  }
  if (errorMessage.includes("User already registered")) {
    return AUTH_CONSTANTS.MESSAGES.EMAIL_EXISTS;
  }
  if (errorMessage.includes("Password should")) {
    return AUTH_CONSTANTS.MESSAGES.WEAK_PASSWORD;
  }
  if (errorMessage.includes("Invalid email")) {
    return AUTH_CONSTANTS.MESSAGES.INVALID_EMAIL_FORMAT;
  }
  return "An unexpected error occurred. Please try again.";
}

/**
 * Flattens Zod field errors to a simple Record<string, string>
 */
function flattenFieldErrors(fieldErrors: Record<string, string[] | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter((entry): entry is [string, string[]] => {
        const errors = entry[1];
        return errors !== undefined && errors.length > 0;
      })
      .map(([key, errors]) => [key, errors[0]])
  );
}

/**
 * Server Action: Login user with email and password
 *
 * @param formData - FormData containing email and password
 * @returns AuthActionResult with success status or error messages
 *
 * Flow:
 * 1. Validate input with Zod schema
 * 2. Attempt sign in with Supabase Auth
 * 3. On success: terminate other sessions (enforce single session per US-002)
 * 4. Return result with redirect path or error
 */
export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  try {
    // Parse and validate input
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const validation = loginSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        fieldErrors: flattenFieldErrors(validation.error.flatten().fieldErrors),
      };
    }

    const { email, password } = validation.data;

    // Create Supabase client and attempt sign in
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: mapSupabaseError(error.message),
      };
    }

    // Enforce single session (US-002): terminate other sessions
    await supabase.auth.signOut({ scope: "others" });

    // Update pending recipient_id for briefs shared with this email before registration
    // This ensures the user sees all briefs shared with their email
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      await updatePendingRecipients(supabase, user.id, user.email);
    }

    return {
      success: true,
      redirectTo: AUTH_CONSTANTS.ROUTES.BRIEFS,
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Server Action: Register new user
 *
 * @param formData - FormData containing email, password, and role
 * @returns AuthActionResult with success status or error messages
 *
 * Flow:
 * 1. Validate input with Zod schema
 * 2. Create user with Supabase Auth (includes role in user_metadata)
 * 3. Database trigger creates profile automatically
 * 4. User is auto-logged in (email confirmation disabled for MVP)
 * 5. Return result with redirect path or error
 */
export async function registerAction(formData: FormData): Promise<AuthActionResult> {
  try {
    // Parse and validate input
    const rawData = {
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    };

    const validation = registerSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        fieldErrors: flattenFieldErrors(validation.error.flatten().fieldErrors),
      };
    }

    const { email, password, role } = validation.data;

    // Create Supabase client and attempt sign up
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role }, // Stored in user_metadata, used by DB trigger to create profile
      },
    });

    if (error) {
      return {
        success: false,
        error: mapSupabaseError(error.message),
      };
    }

    // Update pending recipient_id for briefs shared with this email before registration
    // This ensures the user sees all briefs shared with their email immediately after registration
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      await updatePendingRecipients(supabase, user.id, user.email);
    }

    // Success: user is auto-logged in (email confirmation is disabled)
    return {
      success: true,
      redirectTo: AUTH_CONSTANTS.ROUTES.BRIEFS,
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Server Action: Logout current user
 *
 * @returns AuthActionResult with redirect to login page
 *
 * Flow:
 * 1. Sign out from Supabase Auth (clears session cookies)
 * 2. Return result with redirect to login page
 */
export async function logoutAction(): Promise<AuthActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: "Failed to sign out. Please try again.",
      };
    }

    return {
      success: true,
      redirectTo: AUTH_CONSTANTS.ROUTES.LOGIN,
    };
  } catch {
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
