import type { SupabaseClient, CommentDto, PaginatedResponse } from "@/types";
import { DatabaseError } from "@/lib/errors/api-errors";
import { mapCommentToDto } from "@/lib/utils/mappers";
import { requireBriefAccess, requireCommentAuthor } from "@/lib/utils/authorization.utils";
import { auditCommentCreated, auditCommentDeleted } from "@/lib/utils/audit.utils";
import { batchGetAuthorInfo, getAuthorInfo } from "@/lib/utils/user-lookup.utils";
import { calculateOffset, calculatePagination } from "@/lib/utils/query.utils";

/**
 * Create a new comment on a brief
 * Validates user access and increments comment count
 *
 * Business rules enforced:
 * - User must be the brief owner OR a shared recipient
 * - Comment count is incremented atomically
 * - Audit log entry is created for comment creation
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief to comment on
 * @param authorId - UUID of the comment author (from auth)
 * @param authorEmail - Author's email (for recipient_email matching)
 * @param content - Comment content (1-1000 characters, already validated)
 * @returns Created comment with author details
 * @throws {NotFoundError} If brief doesn't exist
 * @throws {ForbiddenError} If user doesn't have access to the brief
 * @throws {DatabaseError} If database operation fails
 */
export async function createComment(
  supabase: SupabaseClient,
  briefId: string,
  authorId: string,
  authorEmail: string,
  content: string
): Promise<CommentDto> {
  // Require brief access - throws NotFoundError or ForbiddenError if not authorized
  await requireBriefAccess(supabase, briefId, authorId, authorEmail);

  // Insert comment
  const { data: newComment, error: insertError } = await supabase
    .from("comments")
    .insert({
      brief_id: briefId,
      author_id: authorId,
      content: content,
    })
    .select("id, brief_id, author_id, content, created_at")
    .single();

  if (insertError || !newComment) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[comments.service] Failed to create comment:", insertError);
    throw new DatabaseError("comment creation", insertError?.message);
  }

  // Step 3: Increment comment count on brief
  // First, get current count
  const { data: currentBrief } = await supabase.from("briefs").select("comment_count").eq("id", briefId).single();

  const newCount = (currentBrief?.comment_count || 0) + 1;

  const { error: updateError } = await supabase.from("briefs").update({ comment_count: newCount }).eq("id", briefId);

  if (updateError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[comments.service] Failed to update comment count:", updateError);
    // Rollback comment if count update fails
    await supabase.from("comments").delete().eq("id", newComment.id);
    throw new DatabaseError("comment count update", updateError.message);
  }

  // Step 4: Create audit log entry (non-blocking)
  await auditCommentCreated(supabase, authorId, newComment.id, {
    brief_id: newComment.brief_id,
    author_id: newComment.author_id,
    content: newComment.content,
    created_at: newComment.created_at,
  });

  // Step 5: Fetch author details for response using utility
  const authorInfo = await getAuthorInfo(supabase, authorId);

  // Map to CommentDto using mapper
  return mapCommentToDto(newComment, authorInfo.email, authorInfo.role, authorId);
}

/**
 * Parameters for fetching comments by brief ID
 */
interface GetCommentsParams {
  briefId: string;
  userId: string;
  userEmail: string;
  page: number;
  limit: number;
}

/**
 * Fetch paginated comments for a brief
 * Validates user access and enriches with author details
 *
 * Business rules enforced:
 * - User must be the brief owner OR a shared recipient
 * - Comments are ordered by created_at DESC (newest first)
 * - Pagination is enforced with max 100 items per page
 * - Author email and role are included via JOINs
 * - isOwn flag indicates if comment belongs to requesting user
 *
 * @param supabase - Supabase client instance
 * @param params - Query parameters (briefId, userId, userEmail, page, limit)
 * @returns Paginated list of comments with metadata
 * @throws {NotFoundError} If brief doesn't exist
 * @throws {ForbiddenError} If user doesn't have access to the brief
 * @throws {DatabaseError} If database operation fails
 */
export async function getCommentsByBriefId(
  supabase: SupabaseClient,
  params: GetCommentsParams
): Promise<PaginatedResponse<CommentDto>> {
  const { briefId, userId, userEmail, page, limit } = params;

  // Require brief access - throws NotFoundError or ForbiddenError if not authorized
  const { brief } = await requireBriefAccess(supabase, briefId, userId, userEmail);

  // Fetch paginated comments
  const offset = calculateOffset(page, limit);

  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select("id, brief_id, author_id, content, created_at")
    .eq("brief_id", briefId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (commentsError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[comments.service] Failed to fetch comments:", commentsError);
    throw new DatabaseError("comment fetch", commentsError.message);
  }

  // Step 4: Batch fetch author info (reduces N*2 queries to 1 + N parallel queries)
  // Before: 1 + (N × 2) = 21 queries for 10 comments
  // After: 1 (profiles) + N (emails in parallel) = 11 queries for 10 comments
  const authorIds = (comments || []).map((c) => c.author_id);
  const authorInfoMap = await batchGetAuthorInfo(supabase, authorIds);

  // Step 5: Map to DTOs using author info map
  const commentDtos: CommentDto[] = (comments || []).map((comment) => {
    const authorInfo = authorInfoMap.get(comment.author_id) ?? {
      email: "unknown@example.com",
      role: "client" as const,
    };
    return mapCommentToDto(comment, authorInfo.email, authorInfo.role, userId);
  });

  // Step 6: Calculate pagination metadata using denormalized comment_count
  const total = brief.comment_count || 0;

  return {
    data: commentDtos,
    pagination: calculatePagination(page, limit, total),
  };
}

/**
 * Delete a comment (author only)
 * Validates comment ownership and updates brief comment count
 *
 * Business rules enforced:
 * - User must be the comment author (authorization check)
 * - Brief comment count is decremented after deletion
 * - Audit log entry is created for compliance tracking
 *
 * @param supabase - Supabase client instance
 * @param commentId - UUID of the comment to delete
 * @param userId - UUID of the requesting user (from auth)
 * @throws {NotFoundError} If comment doesn't exist
 * @throws {ForbiddenError} If user is not the comment author
 * @throws {DatabaseError} If database operation fails
 */
export async function deleteComment(supabase: SupabaseClient, commentId: string, userId: string): Promise<void> {
  // Require comment authorship - throws NotFoundError or ForbiddenError
  const comment = await requireCommentAuthor(supabase, commentId, userId);

  // Delete comment
  const { error: deleteError } = await supabase.from("comments").delete().eq("id", commentId);

  if (deleteError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[comments.service] Failed to delete comment:", deleteError);
    throw new DatabaseError("comment deletion", deleteError.message);
  }

  // Step 4: Decrement comment count on brief
  const { data: currentBrief } = await supabase
    .from("briefs")
    .select("comment_count")
    .eq("id", comment.brief_id)
    .single();

  const newCount = Math.max((currentBrief?.comment_count || 1) - 1, 0);

  const { error: updateError } = await supabase
    .from("briefs")
    .update({ comment_count: newCount })
    .eq("id", comment.brief_id);

  if (updateError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[comments.service] Failed to update comment count:", updateError);
    // Comment is already deleted - log the error but don't fail the operation
  }

  // Step 5: Create audit log entry (non-blocking)
  await auditCommentDeleted(supabase, userId, commentId, {
    id: comment.id,
    brief_id: comment.brief_id,
    author_id: comment.author_id,
    content: comment.content,
    created_at: comment.created_at,
  });
}
