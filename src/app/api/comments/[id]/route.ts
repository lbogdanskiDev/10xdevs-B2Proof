import { NextRequest, NextResponse } from "next/server";
import { deleteCommentParamsSchema } from "@/lib/schemas/comment.schema";
import { deleteComment } from "@/lib/services/comments.service";
import {
  validateInput,
  getAuthContext,
  handleApiError,
  errorResponse,
  logValidationError,
} from "@/lib/utils/api-handler.utils";
import type { ErrorReturn } from "@/types";

// Force dynamic rendering (no static optimization)
export const dynamic = "force-dynamic";

/**
 * DELETE /api/comments/:id
 * Delete own comment (author only)
 * Enforces authorization: user must be the comment author
 * Updates brief's comment_count and creates audit log entry
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ErrorReturn | null>> {
  try {
    const { id } = await params;

    // Validate comment ID format
    const validation = validateInput(deleteCommentParamsSchema, { id }, "Invalid comment ID format");
    if (!validation.success) {
      logValidationError("DELETE /api/comments/:id", validation.error.details ?? []);
      return errorResponse(validation);
    }

    const { id: commentId } = validation.data;

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId } = auth.data;

    // Delete comment via service
    await deleteComment(supabase, commentId, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, "DELETE /api/comments/:id");
  }
}
