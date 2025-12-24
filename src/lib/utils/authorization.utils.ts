/**
 * Authorization Utilities
 *
 * Centralized authorization helpers for checking user access to resources.
 * These functions handle common authorization patterns across the codebase:
 * - Brief ownership checks
 * - Brief access checks (owner OR recipient)
 * - Comment authorship checks
 */

import type { SupabaseClient, BriefEntity } from "@/types";
import { ForbiddenError, NotFoundError } from "@/lib/errors/api-errors";

/**
 * Access check result with authorization details
 */
export interface BriefAccessCheck {
  brief: BriefEntity;
  isOwner: boolean;
  isRecipient: boolean;
  hasAccess: boolean;
}

/**
 * Comment record shape from database query
 */
export interface CommentRecord {
  id: string;
  brief_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

/**
 * Check if user has access to a brief (owner OR recipient)
 * Does NOT throw - returns access information for caller to decide
 *
 * Use cases:
 * - When you need to check access without throwing errors
 * - When you need to know both ownership and recipient status
 * - When the caller wants to handle the authorization logic themselves
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief to check
 * @param userId - Current user's UUID from auth
 * @param userEmail - Current user's email from auth (for recipient_email matching)
 * @returns Access check result with brief data, or null if brief not found
 */
export async function checkBriefAccess(
  supabase: SupabaseClient,
  briefId: string,
  userId: string,
  userEmail: string
): Promise<BriefAccessCheck | null> {
  // Fetch brief
  const { data: brief, error } = await supabase.from("briefs").select("*").eq("id", briefId).single();

  if (error || !brief) {
    return null;
  }

  const isOwner = brief.owner_id === userId;

  if (isOwner) {
    return { brief, isOwner: true, isRecipient: false, hasAccess: true };
  }

  // Check recipient access (by recipient_id OR recipient_email)
  const { data: recipient } = await supabase
    .from("brief_recipients")
    .select("id")
    .eq("brief_id", briefId)
    .or(`recipient_id.eq.${userId},recipient_email.eq.${userEmail}`)
    .maybeSingle();

  const isRecipient = !!recipient;

  return { brief, isOwner: false, isRecipient, hasAccess: isRecipient };
}

/**
 * Require owner access to a brief
 * Throws appropriate error if not authorized
 *
 * Use cases:
 * - Updating brief content (only owner can edit)
 * - Deleting a brief (only owner can delete)
 * - Sharing a brief with recipients (only owner can share)
 * - Revoking recipient access (only owner can revoke)
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief to check
 * @param userId - Current user's UUID from auth
 * @param userEmail - Current user's email from auth (for access check)
 * @returns Brief entity if user is owner
 * @throws {NotFoundError} If brief doesn't exist
 * @throws {ForbiddenError} If user is not the brief owner
 */
export async function requireBriefOwner(
  supabase: SupabaseClient,
  briefId: string,
  userId: string,
  userEmail: string
): Promise<BriefEntity> {
  const access = await checkBriefAccess(supabase, briefId, userId, userEmail);

  if (!access) {
    throw new NotFoundError("Brief", briefId);
  }

  if (!access.isOwner) {
    throw new ForbiddenError("Only the brief owner can perform this action");
  }

  return access.brief;
}

/**
 * Require any access to a brief (owner OR recipient)
 * Throws appropriate error if not authorized
 *
 * Use cases:
 * - Viewing brief details (owner and recipients can view)
 * - Adding comments to a brief (owner and recipients can comment)
 * - Viewing comments on a brief (owner and recipients can view)
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief to check
 * @param userId - Current user's UUID from auth
 * @param userEmail - Current user's email from auth (for recipient_email matching)
 * @returns Access check result with brief and role information
 * @throws {NotFoundError} If brief doesn't exist
 * @throws {ForbiddenError} If user has no access to the brief
 */
export async function requireBriefAccess(
  supabase: SupabaseClient,
  briefId: string,
  userId: string,
  userEmail: string
): Promise<BriefAccessCheck> {
  const access = await checkBriefAccess(supabase, briefId, userId, userEmail);

  if (!access) {
    throw new NotFoundError("Brief", briefId);
  }

  if (!access.hasAccess) {
    throw new ForbiddenError("You do not have access to this brief");
  }

  return access;
}

/**
 * Require comment authorship
 * Throws if user is not the comment author
 *
 * Use cases:
 * - Deleting a comment (only author can delete their own comments)
 * - Editing a comment (only author can edit their own comments)
 *
 * @param supabase - Supabase client instance
 * @param commentId - UUID of the comment to check
 * @param userId - Current user's UUID from auth
 * @returns Comment record if user is the author
 * @throws {NotFoundError} If comment doesn't exist
 * @throws {ForbiddenError} If user is not the comment author
 */
export async function requireCommentAuthor(
  supabase: SupabaseClient,
  commentId: string,
  userId: string
): Promise<CommentRecord> {
  const { data: comment, error } = await supabase
    .from("comments")
    .select("id, brief_id, author_id, content, created_at")
    .eq("id", commentId)
    .single();

  if (error || !comment) {
    throw new NotFoundError("Comment", commentId);
  }

  if (comment.author_id !== userId) {
    throw new ForbiddenError("You can only delete your own comments");
  }

  return comment;
}

/**
 * Check if user is a recipient of a brief (not owner)
 * Used when you need to verify recipient-only access
 *
 * Use cases:
 * - Client status updates (only recipients can change status)
 * - Checking recipient-specific permissions
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief
 * @param userId - Current user's UUID from auth
 * @param userEmail - Current user's email from auth
 * @returns true if user is a recipient (not owner), false otherwise
 */
export async function isRecipient(
  supabase: SupabaseClient,
  briefId: string,
  userId: string,
  userEmail: string
): Promise<boolean> {
  const access = await checkBriefAccess(supabase, briefId, userId, userEmail);
  return access?.isRecipient ?? false;
}

/**
 * Require recipient access to a brief (NOT owner)
 * Used for operations that only recipients can perform
 *
 * Use cases:
 * - Updating brief status (only recipients can accept/reject)
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief
 * @param userId - Current user's UUID from auth
 * @param userEmail - Current user's email from auth
 * @returns Access check result with brief data
 * @throws {NotFoundError} If brief doesn't exist
 * @throws {ForbiddenError} If user is owner (not recipient) or has no access
 */
export async function requireRecipientAccess(
  supabase: SupabaseClient,
  briefId: string,
  userId: string,
  userEmail: string
): Promise<BriefAccessCheck> {
  const access = await checkBriefAccess(supabase, briefId, userId, userEmail);

  if (!access) {
    throw new NotFoundError("Brief", briefId);
  }

  if (access.isOwner) {
    throw new ForbiddenError("Brief owners cannot perform this action");
  }

  if (!access.isRecipient) {
    throw new ForbiddenError("You do not have access to this brief");
  }

  return access;
}
