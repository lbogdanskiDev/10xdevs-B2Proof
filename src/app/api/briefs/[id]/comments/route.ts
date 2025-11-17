import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/db/supabase.server";
import { createCommentSchema, getCommentsQuerySchema } from "@/lib/schemas/comment.schema";
import { createComment, getCommentsByBriefId } from "@/lib/services/comments.service";
import { ApiError } from "@/lib/errors/api-errors";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";
import type { CommentDto, ErrorResponse, PaginatedResponse } from "@/types";
import { z } from "zod";

// Force dynamic rendering (no static optimization)
export const dynamic = "force-dynamic";

/**
 * POST /api/briefs/:id/comments
 *
 * Create a new comment on a brief (requires access)
 *
 * Enforces authorization: user must be the brief owner OR a shared recipient
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 *
 * @param request - Next.js request object
 * @param params - Route parameters { id: string }
 * @returns 201 Created with CommentDto or error response
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CommentDto | ErrorResponse>> {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id: briefId } = await params;

    // Step 2: Validate brief ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(briefId)) {
      return NextResponse.json<ErrorResponse>(
        {
          error: "Validation failed",
          details: [{ field: "id", message: "Invalid brief ID format" }],
        },
        { status: 400 }
      );
    }

    // Step 3: Parse and validate request body
    const body = await request.json();
    const validation = createCommentSchema.safeParse(body);

    // Guard: Check validation
    if (!validation.success) {
      const details = validation.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[POST /api/briefs/:id/comments] Validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Validation failed", details }, { status: 400 });
    }

    // Step 4: Get Supabase admin client and mock user
    // TEMPORARY: Using admin client for development with mock authentication
    // TODO: Replace with createSupabaseServerClient() and real auth
    const supabase = createSupabaseAdminClient();

    // TEMPORARY: Using mock user profile for development
    // TODO: Replace with real authentication: await supabase.auth.getUser()
    const userId = DEFAULT_USER_PROFILE.id;

    // Step 5: Create comment via service
    const comment = await createComment(supabase, briefId, userId, validation.data.content);

    // Happy path: Return success response
    return NextResponse.json<CommentDto>(comment, { status: 201 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[POST /api/briefs/:id/comments] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/briefs/:id/comments
 *
 * Retrieve paginated list of comments for a specific brief
 *
 * Enforces authorization: user must be the brief owner OR a shared recipient
 * Supports pagination via query parameters (page, limit)
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 *
 * @param request - Next.js request object
 * @param params - Route parameters { id: string }
 * @returns 200 OK with PaginatedResponse<CommentDto> or error response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PaginatedResponse<CommentDto> | ErrorResponse>> {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id: briefId } = await params;

    // Step 2: Validate brief ID format (UUID)
    const briefIdSchema = z.string().uuid();
    const briefIdValidation = briefIdSchema.safeParse(briefId);

    // Guard: Check brief ID format
    if (!briefIdValidation.success) {
      return NextResponse.json<ErrorResponse>(
        {
          error: "Invalid brief ID format",
          details: briefIdValidation.error.errors.map((err) => ({
            field: "id",
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    // Step 3: Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = getCommentsQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    // Guard: Check query parameters
    if (!queryValidation.success) {
      return NextResponse.json<ErrorResponse>(
        {
          error: "Invalid query parameters",
          details: queryValidation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { page, limit } = queryValidation.data;

    // Step 4: Get Supabase admin client and mock user
    // TEMPORARY: Using admin client for development with mock authentication
    // TODO: Replace with createSupabaseServerClient() and real auth
    const supabase = createSupabaseAdminClient();

    // TEMPORARY: Using mock user profile for development
    // TODO: Replace with real authentication: await supabase.auth.getUser()
    const userId = DEFAULT_USER_PROFILE.id;

    // Step 5: Fetch comments via service
    const result = await getCommentsByBriefId(supabase, {
      briefId,
      userId,
      page,
      limit,
    });

    // Happy path: Return success response
    return NextResponse.json<PaginatedResponse<CommentDto>>(result, { status: 200 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[GET /api/briefs/:id/comments] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}
