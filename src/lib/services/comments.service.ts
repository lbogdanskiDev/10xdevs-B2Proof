import type { SupabaseClient, CommentDto } from "@/types";
import { ForbiddenError, DatabaseError } from "@/lib/errors/api-errors";

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
 * @param content - Comment content (1-1000 characters, already validated)
 * @returns Created comment with author details
 * @throws {ForbiddenError} If user doesn't have access to the brief
 * @throws {DatabaseError} If database operation fails
 */
export async function createComment(
  supabase: SupabaseClient,
  briefId: string,
  authorId: string,
  content: string
): Promise<CommentDto> {
  // Step 1: Check if brief exists and user has access (owner or recipient)
  // Use a single query that combines both checks for efficiency
  const { data: accessCheck, error: accessError } = await supabase
    .from("briefs")
    .select(
      `
      id,
      owner_id
    `
    )
    .eq("id", briefId)
    .single();

  if (accessError || !accessCheck) {
    // Brief doesn't exist - return 403 (don't reveal existence to unauthorized users)
    throw new ForbiddenError("You do not have access to this brief");
  }

  // Check if user is owner
  const isOwner = accessCheck.owner_id === authorId;

  // If not owner, check if user is a recipient
  if (!isOwner) {
    const { data: recipientCheck } = await supabase
      .from("brief_recipients")
      .select("recipient_id")
      .eq("brief_id", briefId)
      .eq("recipient_id", authorId)
      .single();

    if (!recipientCheck) {
      throw new ForbiddenError("You do not have access to this brief");
    }
  }

  // Step 2: Insert comment
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

  // Step 4: Create audit log entry
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: authorId,
    action: "comment_created",
    entity_type: "comment",
    entity_id: newComment.id,
    new_data: {
      brief_id: newComment.brief_id,
      author_id: newComment.author_id,
      content: newComment.content,
      created_at: newComment.created_at,
    },
  });

  if (auditError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[comments.service] Failed to create audit log:", auditError);
    // Non-critical error - don't rollback the comment
  }

  // Step 5: Fetch author details for response
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authorId).single();

  const { data: authUser } = await supabase.auth.admin.getUserById(authorId);

  // Map to CommentDto
  const commentDto: CommentDto = {
    id: newComment.id,
    briefId: newComment.brief_id,
    authorId: newComment.author_id,
    authorEmail: authUser?.user?.email || "",
    authorRole: profile?.role || "client",
    content: newComment.content,
    isOwn: true, // Always true for the creator
    createdAt: newComment.created_at,
  };

  return commentDto;
}
