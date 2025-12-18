import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/db/supabase.server";
import { deleteCommentParamsSchema } from "@/lib/schemas/comment.schema";
import { deleteComment } from "@/lib/services/comments.service";
import { ApiError, NotFoundError, ForbiddenError } from "@/lib/errors/api-errors";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";
import type { ErrorReturn } from "@/types";

// Force dynamic rendering (no static optimization)
export const dynamic = "force-dynamic";

/**
 * DELETE /api/comments/:id
 *
 * Delete own comment (author only)
 *
 * Enforces authorization: user must be the comment author
 * Updates brief's comment_count and creates audit log entry
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 *
 * @param request - Next.js request object
 * @param params - Route parameters { id: string }
 * @returns 204 No Content on success or error response
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ErrorReturn | null>> {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id } = await params;

    // Step 2: Validate comment ID format
    const validation = deleteCommentParamsSchema.safeParse({ id });

    if (!validation.success) {
      return NextResponse.json<ErrorReturn>(
        {
          error: "Invalid comment ID format",
          details: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    const { id: commentId } = validation.data;

    // Step 3: Get authenticated user
    // TODO: Replace with real authentication
    const supabase = await createSupabaseAdminClient();
    const userId = DEFAULT_USER_PROFILE.id;

    // Step 4: Delete comment via service
    await deleteComment(supabase, commentId, userId);

    // Step 5: Return 204 No Content on success
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      const statusCode = error instanceof NotFoundError ? 404 : error instanceof ForbiddenError ? 403 : 500;

      return NextResponse.json<ErrorReturn>(
        {
          error: error.message,
        },
        { status: statusCode }
      );
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- Route handler error logging
    console.error("[DELETE /api/comments/:id] Unexpected error:", error);

    return NextResponse.json<ErrorReturn>(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
