import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/db/supabase.server";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";
import { getBriefs, createBrief } from "@/lib/services/brief.service";
import { BriefQuerySchema, CreateBriefSchema } from "@/lib/schemas/brief.schema";
import { ApiError } from "@/lib/errors/api-errors";
import type { BriefListItemDto, PaginatedResponse, ErrorReturn, BriefDetailDto, CreateBriefCommand } from "@/types";

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
      return NextResponse.json<ErrorReturn>({ error: "Invalid query parameters", details }, { status: 400 });
    }

    // Step 3: Fetch briefs from service
    const result = await getBriefs(supabase, userId, validationResult.data);

    // Happy path: Return paginated briefs
    return NextResponse.json<PaginatedResponse<BriefListItemDto>>(result, { status: 200 });
  } catch (error) {
    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[GET /api/briefs] Unexpected error:", error);
    return NextResponse.json<ErrorReturn>({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/briefs
 * Creates a new brief for the authenticated creator user
 * Enforces role-based access (creators only) and business rules (20 brief limit)
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse request body
    const body = await request.json();

    // Step 2: Validate input
    const validationResult = CreateBriefSchema.safeParse(body);

    // Guard: Check validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[POST /api/briefs] Validation error:", details);
      return NextResponse.json<ErrorReturn>({ error: "Validation failed", details }, { status: 400 });
    }

    const data: CreateBriefCommand = validationResult.data;

    // Step 3: Get Supabase admin client (bypasses RLS) and mock user
    // TEMPORARY: Using admin client for development with mock authentication
    // TODO: Replace with createSupabaseServerClient() and real auth
    const supabase = createSupabaseAdminClient();

    // TEMPORARY: Using mock user profile for development
    // TODO: Replace with real authentication: await supabase.auth.getUser()
    const userId = DEFAULT_USER_PROFILE.id;

    // Step 4: Create brief via service
    const brief = await createBrief(supabase, userId, data);

    // Happy path: Return created brief with 201 status
    return NextResponse.json<BriefDetailDto>(brief, { status: 201 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error(`[POST /api/briefs] API error (${error.statusCode}):`, error.message);
      return NextResponse.json<ErrorReturn>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[POST /api/briefs] Unexpected error:", error);
    return NextResponse.json<ErrorReturn>({ error: "Internal server error" }, { status: 500 });
  }
}

// Force dynamic rendering (no caching for auth endpoints)
export const dynamic = "force-dynamic";
