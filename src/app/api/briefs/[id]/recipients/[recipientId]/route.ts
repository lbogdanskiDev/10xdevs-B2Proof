import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { RevokeRecipientSchema } from "@/lib/schemas/brief.schema";
import { revokeBriefRecipient } from "@/lib/services/brief.service";
import { ApiError, UnauthorizedError } from "@/lib/errors/api-errors";
import type { ErrorResponse } from "@/types";

/**
 * DELETE /api/briefs/:id/recipients/:recipientId
 *
 * Revoke recipient access to brief (owner only)
 *
 * Automatically resets brief status to 'draft' if last recipient is removed.
 *
 * Authentication: Required (Bearer token)
 * Authorization: User must be brief owner
 *
 * Success Response: 204 No Content
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
): Promise<NextResponse<ErrorResponse | void>> {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id, recipientId } = await params;

    // Step 2: Validate path parameters
    const validationResult = RevokeRecipientSchema.safeParse({ id, recipientId });

    // Guard clause: Check validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[DELETE /api/briefs/:id/recipients/:recipientId] Validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Invalid request parameters", details }, { status: 400 });
    }

    const { id: briefId, recipientId: validRecipientId } = validationResult.data;

    // Step 3: Create Supabase client and validate authentication
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Guard clause: Check authentication
    if (authError || !user) {
      throw new UnauthorizedError();
    }

    // Step 4: Revoke recipient access (service handles all business logic)
    await revokeBriefRecipient(supabase, briefId, validRecipientId, user.id);

    // Happy path: Return 204 No Content
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[DELETE /api/briefs/:id/recipients/:recipientId] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}
