/**
 * DTO Mappers
 *
 * Centralized mapping functions for transforming database entities to DTOs.
 * Ensures consistent snake_case to camelCase conversion across the codebase.
 */

import type {
  BriefEntity,
  BriefListItemDto,
  BriefDetailDto,
  CommentDto,
  BriefRecipientDto,
  BriefRecipientEntity,
  UserRole,
} from "@/types";

/**
 * Map Brief entity to list item DTO
 * Used in: GET /api/briefs (list view)
 *
 * @param brief - Brief database entity
 * @param isOwned - Whether the current user owns this brief
 * @returns Brief list item DTO with camelCase fields
 */
export function mapBriefToListItem(brief: BriefEntity, isOwned: boolean): BriefListItemDto {
  return {
    id: brief.id,
    ownerId: brief.owner_id,
    header: brief.header,
    footer: brief.footer,
    status: brief.status,
    commentCount: brief.comment_count,
    isOwned,
    createdAt: brief.created_at,
    updatedAt: brief.updated_at,
  };
}

/**
 * Map Brief entity to detail DTO
 * Used in: GET /api/briefs/:id, POST /api/briefs, PATCH /api/briefs/:id
 *
 * @param brief - Brief database entity
 * @param isOwned - Whether the current user owns this brief
 * @returns Brief detail DTO with full content and camelCase fields
 */
export function mapBriefToDetail(brief: BriefEntity, isOwned: boolean): BriefDetailDto {
  return {
    ...mapBriefToListItem(brief, isOwned),
    content: brief.content,
    statusChangedAt: brief.status_changed_at,
    statusChangedBy: brief.status_changed_by,
  };
}

/**
 * Comment entity shape from database query
 */
interface CommentRecord {
  id: string;
  brief_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

/**
 * Map Comment entity to DTO
 * Used in: GET /api/briefs/:id/comments, POST /api/briefs/:id/comments
 *
 * @param comment - Comment database record
 * @param authorEmail - Author's email address
 * @param authorRole - Author's role (creator/client)
 * @param currentUserId - ID of the currently authenticated user
 * @returns Comment DTO with author info and ownership flag
 */
export function mapCommentToDto(
  comment: CommentRecord,
  authorEmail: string,
  authorRole: UserRole,
  currentUserId: string
): CommentDto {
  return {
    id: comment.id,
    briefId: comment.brief_id,
    authorId: comment.author_id,
    authorEmail,
    authorRole,
    content: comment.content,
    isOwn: comment.author_id === currentUserId,
    createdAt: comment.created_at,
  };
}

/**
 * Map BriefRecipient entity to DTO
 * Used in: GET /api/briefs/:id/recipients
 *
 * @param recipient - BriefRecipient database entity
 * @returns BriefRecipient DTO with camelCase fields
 */
export function mapRecipientToDto(recipient: BriefRecipientEntity): BriefRecipientDto {
  return {
    id: recipient.id,
    recipientId: recipient.recipient_id ?? "",
    recipientEmail: recipient.recipient_email ?? "",
    sharedBy: recipient.shared_by,
    sharedAt: recipient.shared_at,
  };
}

/**
 * Partial Brief entity shape for selected fields query
 */
interface PartialBriefRecord {
  id: string;
  owner_id: string;
  header: string;
  content: BriefEntity["content"];
  footer: string | null;
  status: BriefEntity["status"];
  status_changed_at: string | null;
  status_changed_by: string | null;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Map partial Brief record (from select query) to detail DTO
 * Used when querying specific fields instead of full entity
 *
 * @param brief - Partial brief record from query
 * @param isOwned - Whether the current user owns this brief
 * @returns Brief detail DTO
 */
export function mapPartialBriefToDetail(brief: PartialBriefRecord, isOwned: boolean): BriefDetailDto {
  return {
    id: brief.id,
    ownerId: brief.owner_id,
    header: brief.header,
    content: brief.content,
    footer: brief.footer,
    status: brief.status,
    statusChangedAt: brief.status_changed_at,
    statusChangedBy: brief.status_changed_by,
    commentCount: brief.comment_count,
    isOwned,
    createdAt: brief.created_at,
    updatedAt: brief.updated_at,
  };
}
