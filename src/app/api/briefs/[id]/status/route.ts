import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/db/supabase.server";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";
import { updateBriefStatus } from "@/lib/services/brief.service";
import { BriefIdSchema, updateBriefStatusSchema } from "@/lib/schemas/brief.schema";
import { ApiError } from "@/lib/errors/api-errors";
import type { ErrorResponse, UpdateBriefStatusCommand, UpdateBriefStatusWithCommentResponseDto } from "@/types";

/**
 * PATCH /api/briefs/:id/status
 * Updates brief status (client only)
 *
 * Allows clients with access to update brief status to:
 * - 'accepted' - Client accepts the brief
 * - 'rejected' - Client rejects the brief
 * - 'needs_modification' - Client requests changes (requires comment)
 *
 * Business rules:
 * - User must be a recipient (not owner) of the brief
 * - Brief must be in 'sent' state to allow status updates
 * - Comment is required when status is 'needs_modification'
 * - Comment is created atomically with status update when needed
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 *
 * @param request - Next.js request object with JSON body
 * @param params - Route parameters containing brief ID
 * @returns Updated brief status with optional comment
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id } = await params;

    // Step 2: Validate UUID format
    const validationResult = BriefIdSchema.safeParse({ id });

    // Guard: Check UUID validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[PATCH /api/briefs/:id/status] UUID validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Invalid brief ID format", details }, { status: 400 });
    }

    // Step 3: Parse request body
    const body = (await request.json()) as UpdateBriefStatusCommand;

    // Guard: Check if body is empty
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json<ErrorResponse>({ error: "Request body is required" }, { status: 400 });
    }

    // Step 4: Validate status update data
    const statusValidation = updateBriefStatusSchema.safeParse(body);

    // Guard: Check status validation
    if (!statusValidation.success) {
      const details = statusValidation.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[PATCH /api/briefs/:id/status] Status validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Validation failed", details }, { status: 400 });
    }

    // Step 5: Get Supabase admin client and mock user
    // TEMPORARY: Using admin client for development with mock authentication
    // TODO: Replace with createSupabaseServerClient() and real auth
    const supabase = createSupabaseAdminClient();

    // TEMPORARY: Using mock user profile for development
    // TODO: Replace with real authentication: await supabase.auth.getUser()
    const userId = DEFAULT_USER_PROFILE.id;

    // Step 6: Execute status update
    const result = await updateBriefStatus(supabase, userId, validationResult.data.id, statusValidation.data);

    // Happy path: Return status update response
    return NextResponse.json<UpdateBriefStatusWithCommentResponseDto>(result, { status: 200 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[PATCH /api/briefs/:id/status] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}

// Force dynamic rendering (no caching for auth endpoints)
export const dynamic = "force-dynamic";
