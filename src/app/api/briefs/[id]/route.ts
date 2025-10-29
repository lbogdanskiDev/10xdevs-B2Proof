import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/db/supabase.server";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";
import { getBriefById } from "@/lib/services/brief.service";
import { BriefIdSchema } from "@/lib/schemas/brief.schema";
import type { BriefDetailDto, ErrorResponse } from "@/types";

/**
 * GET /api/briefs/:id
 * Retrieves a single brief by ID with full content
 * Enforces authorization: user must be owner or recipient
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing brief ID
 * @returns Brief detail DTO or error response
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id } = await params;

    // Step 2: Validate UUID format
    const validationResult = BriefIdSchema.safeParse({ id });

    // Guard: Check validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[GET /api/briefs/:id] Validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Invalid brief ID format", details }, { status: 400 });
    }

    // Step 3: Get Supabase admin client and mock user
    // TEMPORARY: Using admin client for development with mock authentication
    // TODO: Replace with createSupabaseServerClient() and real auth
    const supabase = createSupabaseAdminClient();

    // TEMPORARY: Using mock user profile for development
    // TODO: Replace with real authentication: await supabase.auth.getUser()
    const userId = DEFAULT_USER_PROFILE.id;

    // Step 4: Fetch brief from service
    const brief = await getBriefById(supabase, validationResult.data.id, userId);

    // Guard: Check if brief exists
    if (!brief) {
      return NextResponse.json<ErrorResponse>({ error: "Brief not found" }, { status: 404 });
    }

    // Happy path: Return brief detail
    return NextResponse.json<BriefDetailDto>(brief, { status: 200 });
  } catch (error) {
    // Handle forbidden access (user not authorized)
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json<ErrorResponse>({ error: "You do not have access to this brief" }, { status: 403 });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[GET /api/briefs/:id] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}

// Force dynamic rendering (no caching for auth endpoints)
export const dynamic = "force-dynamic";
