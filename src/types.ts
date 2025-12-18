/**
 * Type Definitions for B2Proof Application
 *
 * This file contains all DTO (Data Transfer Object) and Command Model types
 * used for API request/response payloads. All types are derived from the
 * database schema defined in src/db/database.types.ts
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/db/database.types";
import type { createSupabaseServerClient } from "@/db/supabase.server";

// ============================================================================
// Supabase Client Type
// ============================================================================

/**
 * Supabase client type inferred from createSupabaseServerClient helper
 * Use this type instead of importing SupabaseClient from @supabase/supabase-js
 *
 * @example
 * import type { SupabaseClient } from '@/types'
 *
 * async function getUserProfile(supabase: SupabaseClient, userId: string) {
 *   // ...
 * }
 */
export type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// ============================================================================
// Database Entity Aliases
// ============================================================================

/**
 * Database entity type aliases for cleaner code
 * These provide direct access to table row types with snake_case fields
 */

// Profiles
export type ProfileEntity = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;

// Briefs
export type BriefEntity = Tables<"briefs">;
export type BriefInsert = TablesInsert<"briefs">;
export type BriefUpdate = TablesUpdate<"briefs">;

// Brief Recipients
export type BriefRecipientEntity = Tables<"brief_recipients">;
export type BriefRecipientInsert = TablesInsert<"brief_recipients">;
export type BriefRecipientUpdate = TablesUpdate<"brief_recipients">;

// Comments
export type CommentEntity = Tables<"comments">;
export type CommentInsert = TablesInsert<"comments">;
export type CommentUpdate = TablesUpdate<"comments">;

// Audit Log
export type AuditLogEntity = Tables<"audit_log">;
export type AuditLogInsert = TablesInsert<"audit_log">;
export type AuditLogUpdate = TablesUpdate<"audit_log">;

// Enums
export type UserRole = Enums<"user_role">;
export type BriefStatus = Enums<"brief_status">;
export type AuditAction = Enums<"audit_action">;

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Metadata for paginated responses
 */
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

// ============================================================================
// User / Profile Types
// ============================================================================

/**
 * User profile response DTO
 * Used in: GET /api/users/me
 * Source: profiles table + auth.users (email)
 */
export interface UserProfileDto {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Brief Types
// ============================================================================

/**
 * Brief list item DTO (summary view)
 * Used in: GET /api/briefs (list response)
 * Source: briefs table
 */
export interface BriefListItemDto {
  id: string;
  ownerId: string;
  header: string;
  footer: string | null;
  status: BriefStatus;
  commentCount: number;
  /** Whether the current user is the owner of this brief */
  isOwned: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Brief detail DTO (full view with content)
 * Used in: GET /api/briefs/:id
 * Source: briefs table
 */
export interface BriefDetailDto extends BriefListItemDto {
  /** TipTap JSON content structure */
  content: BriefEntity["content"];
  statusChangedAt: string | null;
  statusChangedBy: string | null;
}

/**
 * Brief query parameters
 * Used in: GET /api/briefs (query string)
 */
export interface BriefQueryParams {
  page?: number;
  limit?: number;
  filter?: "owned" | "shared";
  status?: BriefStatus;
}

/**
 * Create brief command
 * Used in: POST /api/briefs
 * Source: briefs table insert type
 */
export interface CreateBriefCommand {
  header: string;
  content: BriefInsert["content"];
  footer?: string | null;
}

/**
 * Update brief command (owner content update)
 * Used in: PATCH /api/briefs/:id (owner content update)
 * Source: briefs table update type
 */
export interface UpdateBriefCommand {
  header?: string;
  content?: BriefUpdate["content"];
  footer?: string | null;
}

/**
 * Update brief status command (client status update)
 * Used in: PATCH /api/briefs/:id (client status update)
 */
export interface UpdateBriefStatusCommand {
  status: BriefStatus;
  comment?: string;
}

/**
 * Brief status response DTO
 * Used in: POST /api/briefs/:id/accept, POST /api/briefs/:id/reject
 * Source: briefs table (status fields only)
 */
export interface BriefStatusResponseDto {
  id: string;
  status: BriefStatus;
  statusChangedAt: string | null;
  statusChangedBy: string | null;
}

/**
 * Request modification command
 * Used in: POST /api/briefs/:id/request-modification
 */
export interface RequestModificationCommand {
  comment: string;
}

/**
 * Request modification response DTO
 * Used in: POST /api/briefs/:id/request-modification (response)
 * Includes the status change and the created comment
 */
export interface RequestModificationResponseDto extends BriefStatusResponseDto {
  comment: CommentDto;
}

/**
 * Update brief status response with optional comment
 * Used in: PATCH /api/briefs/:id (response for status updates, includes comment for needs_modification)
 */
export interface UpdateBriefStatusWithCommentResponseDto extends BriefStatusResponseDto {
  commentCount: number;
  updatedAt: string;
  comment?: CommentDto;
}

// ============================================================================
// Brief Recipients Types
// ============================================================================

/**
 * Brief recipient DTO
 * Used in: GET /api/briefs/:id/recipients
 * Source: brief_recipients table + auth.users (email via join)
 */
export interface BriefRecipientDto {
  id: string;
  recipientId: string;
  recipientEmail: string;
  sharedBy: string;
  sharedAt: string;
}

/**
 * Share brief command
 * Used in: POST /api/briefs/:id/recipients
 */
export interface ShareBriefCommand {
  email: string;
}

/**
 * Share brief response DTO
 * Used in: POST /api/briefs/:id/recipients (response)
 * Source: brief_recipients table + recipient email
 */
export interface ShareBriefResponseDto extends BriefRecipientDto {
  briefId: string;
}

// ============================================================================
// Comment Types
// ============================================================================

/**
 * Comment DTO
 * Used in: GET /api/briefs/:id/comments, POST /api/briefs/:id/comments (response)
 * Source: comments table + auth.users (email) + profiles (role)
 */
export interface CommentDto {
  id: string;
  briefId: string;
  authorId: string;
  authorEmail: string;
  authorRole: UserRole;
  content: string;
  /** Whether the current user is the author of this comment */
  isOwn: boolean;
  createdAt: string;
}

/**
 * Create comment command
 * Used in: POST /api/briefs/:id/comments
 * Source: comments table insert type
 */
export interface CreateCommentCommand {
  content: string;
}

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Generic error response
 */
export interface ErrorReturn {
  error: string;
  details?: ValidationErrorDetail[];
  retryAfter?: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a response is an error
 */
export function isErrorResponse(response: unknown): response is ErrorReturn {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    typeof (response as ErrorReturn).error === "string"
  );
}

/**
 * Type guard to check if a response is paginated
 */
export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  return (
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    "pagination" in response &&
    Array.isArray((response as PaginatedResponse<T>).data)
  );
}
