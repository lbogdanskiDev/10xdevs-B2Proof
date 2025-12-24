import { NextRequest, NextResponse } from "next/server";
import { createCommentSchema, getCommentsQuerySchema, type CreateCommentInput } from "@/lib/schemas/comment.schema";
import { createComment, getCommentsByBriefId } from "@/lib/services/comments.service";
import { BriefIdSchema } from "@/lib/schemas/brief.schema";
import {
  validateInput,
  getAuthContext,
  handleApiError,
  errorResponse,
  validateRequestBody,
  formatZodErrors,
  logValidationError,
} from "@/lib/utils/api-handler.utils";
import type { CommentDto, ErrorReturn, PaginatedResponse } from "@/types";

// Force dynamic rendering (no static optimization)
export const dynamic = "force-dynamic";

/**
 * POST /api/briefs/:id/comments
 * Create a new comment on a brief (requires access)
 * Enforces authorization: user must be the brief owner OR a shared recipient
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CommentDto | ErrorReturn>> {
  try {
    const { id: briefId } = await params;

    // Validate brief ID format
    const idValidation = validateInput(BriefIdSchema, { id: briefId }, "Invalid brief ID format");
    if (!idValidation.success) return errorResponse(idValidation);

    // Parse and validate request body
    const bodyValidation = await validateRequestBody<CreateCommentInput>(
      request,
      createCommentSchema,
      "POST /api/briefs/:id/comments"
    );
    if (!bodyValidation.success) return errorResponse(bodyValidation);

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId, userEmail } = auth.data;

    // Create comment via service
    const comment = await createComment(supabase, briefId, userId, userEmail, bodyValidation.data.content);

    return NextResponse.json<CommentDto>(comment, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/briefs/:id/comments");
  }
}

/**
 * GET /api/briefs/:id/comments
 * Retrieve paginated list of comments for a specific brief
 * Enforces authorization: user must be the brief owner OR a shared recipient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PaginatedResponse<CommentDto> | ErrorReturn>> {
  try {
    const { id: briefId } = await params;

    // Validate brief ID format
    const idValidation = validateInput(BriefIdSchema, { id: briefId }, "Invalid brief ID format");
    if (!idValidation.success) return errorResponse(idValidation);

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryValidation = getCommentsQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!queryValidation.success) {
      const details = formatZodErrors(queryValidation.error);
      logValidationError("GET /api/briefs/:id/comments", details);
      return NextResponse.json<ErrorReturn>({ error: "Invalid query parameters", details }, { status: 400 });
    }

    const { page, limit } = queryValidation.data;

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId, userEmail } = auth.data;

    // Fetch comments via service
    const result = await getCommentsByBriefId(supabase, {
      briefId,
      userId,
      userEmail,
      page,
      limit,
    });

    return NextResponse.json<PaginatedResponse<CommentDto>>(result, { status: 200 });
  } catch (error) {
    return handleApiError(error, "GET /api/briefs/:id/comments");
  }
}
