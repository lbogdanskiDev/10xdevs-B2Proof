import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/db/supabase.server";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";
import { getBriefs } from "@/lib/services/brief.service";
import { BriefQuerySchema } from "@/lib/schemas/brief.schema";
import type { BriefListItemDto, PaginatedResponse, ErrorResponse } from "@/types";

/**
 * GET /api/briefs
 * Retrieves paginated list of briefs for the authenticated user
 * Supports filtering by ownership (owned/shared) and status
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Get Supabase admin client (bypasses RLS) and mock user
    // TEMPORARY: Using admin client for development with mock authentication
    // TODO: Replace with createSupabaseServerClient() and real auth
    const supabase = createSupabaseAdminClient();

    // TEMPORARY: Using mock user profile for development
    // TODO: Replace with real authentication: await supabase.auth.getUser()
    const userId = DEFAULT_USER_PROFILE.id;

    // Step 2: Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const validationResult = BriefQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      filter: searchParams.get("filter") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    // Guard: Check validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[GET /api/briefs] Validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Invalid query parameters", details }, { status: 400 });
    }

    // Step 3: Fetch briefs from service
    const result = await getBriefs(supabase, userId, validationResult.data);

    // Happy path: Return paginated briefs
    return NextResponse.json<PaginatedResponse<BriefListItemDto>>(result, { status: 200 });
  } catch (error) {
    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[GET /api/briefs] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}

// Force dynamic rendering (no caching for auth endpoints)
export const dynamic = "force-dynamic";
