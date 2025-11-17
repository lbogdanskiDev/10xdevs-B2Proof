import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/db/supabase.server";
import { createCommentSchema } from "@/lib/schemas/comment.schema";
import { createComment } from "@/lib/services/comments.service";
import { ApiError } from "@/lib/errors/api-errors";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";
import type { CommentDto, ErrorResponse } from "@/types";

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
