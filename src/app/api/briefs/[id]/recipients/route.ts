import { NextRequest, NextResponse } from "next/server";
import { BriefIdSchema } from "@/lib/schemas/brief.schema";
import { getBriefRecipients } from "@/lib/services/brief.service";
import { createSupabaseAdminClient } from "@/db/supabase.server";
import { ApiError, NotFoundError, ForbiddenError } from "@/lib/errors/api-errors";
import type { BriefRecipientDto, ErrorResponse } from "@/types";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";

// Force dynamic rendering (no static optimization)
export const dynamic = "force-dynamic";

/**
 * GET /api/briefs/:id/recipients
 *
 * Retrieve list of users with access to the brief (owner only)
 *
 * Enforces authorization: only the brief owner can view recipients list
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 *
 * @param request - Next.js request object
 * @param params - Route parameters { id: string }
 * @returns 200 OK with recipients array or error response
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id } = await params;

    // Step 2: Validate brief ID
    const validationResult = BriefIdSchema.safeParse({ id });

    // Guard: Check validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[GET /api/briefs/:id/recipients] Validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Invalid brief ID format", details }, { status: 400 });
    }

    // Step 3: Get Supabase admin client and mock user
    // TEMPORARY: Using admin client for development with mock authentication
    // TODO: Replace with createSupabaseServerClient() and real auth
    const supabase = createSupabaseAdminClient();

    // TEMPORARY: Using mock user profile for development
    // TODO: Replace with real authentication: await supabase.auth.getUser()
    const userId = DEFAULT_USER_PROFILE.id;

    const briefId = validationResult.data.id;

    // Step 4: Check brief exists and user is owner (authorization)
    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("owner_id")
      .eq("id", briefId)
      .single();

    // Guard: Check brief exists
    if (briefError || !brief) {
      throw new NotFoundError("Brief", briefId);
    }

    // Guard: Check user is owner
    if (brief.owner_id !== userId) {
      throw new ForbiddenError("Only the brief owner can view recipients");
    }

    // Step 5: Get recipients from service
    const recipients = await getBriefRecipients(supabase, briefId);

    // Happy path: Return success response
    return NextResponse.json<{ data: BriefRecipientDto[] }>({ data: recipients }, { status: 200 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[GET /api/briefs/:id/recipients] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}
