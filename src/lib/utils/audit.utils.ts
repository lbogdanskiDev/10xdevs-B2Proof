/**
 * Audit Logging Utilities
 *
 * Centralized audit logging functions for tracking user actions.
 * All audit functions are non-blocking - they log errors but don't throw.
 */

import type { SupabaseClient, AuditAction } from "@/types";
import type { Json } from "@/db/database.types";

/**
 * Entity types that can be audited
 */
type AuditEntityType = "brief" | "comment" | "user" | "brief_recipient";

/**
 * Audit data type - compatible with database Json type
 */
type AuditData = Record<string, Json | undefined> | null;

/**
 * Log an audit event to the audit_log table
 * Non-blocking: errors are logged but don't throw
 *
 * @param supabase - Supabase client instance
 * @param options - Audit event options
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  options: {
    userId: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    oldData?: AuditData;
    newData?: AuditData;
  }
): Promise<void> {
  const { userId, action, entityType, entityId, oldData = null, newData = null } = options;

  const { error } = await supabase.from("audit_log").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData,
    new_data: newData,
  });

  if (error) {
    // Non-critical: log but don't throw
    // eslint-disable-next-line no-console -- Audit logging for debugging
    console.error(`[audit] Failed to log ${action} for ${entityType}:${entityId}:`, error);
  }
}

// ============================================================================
// Specialized Audit Functions for Briefs
// ============================================================================

/**
 * Log brief creation event
 */
export function auditBriefCreated(
  supabase: SupabaseClient,
  userId: string,
  briefId: string,
  briefData: AuditData
): Promise<void> {
  return logAuditEvent(supabase, {
    userId,
    action: "brief_created",
    entityType: "brief",
    entityId: briefId,
    newData: briefData,
  });
}

/**
 * Log brief update event
 */
export function auditBriefUpdated(
  supabase: SupabaseClient,
  userId: string,
  briefId: string,
  oldData: AuditData,
  newData: AuditData
): Promise<void> {
  return logAuditEvent(supabase, {
    userId,
    action: "brief_updated",
    entityType: "brief",
    entityId: briefId,
    oldData,
    newData,
  });
}

/**
 * Log brief deletion event
 */
export function auditBriefDeleted(
  supabase: SupabaseClient,
  userId: string,
  briefId: string,
  briefData: AuditData
): Promise<void> {
  return logAuditEvent(supabase, {
    userId,
    action: "brief_deleted",
    entityType: "brief",
    entityId: briefId,
    oldData: briefData,
  });
}

/**
 * Log brief status change event
 */
export function auditStatusChanged(
  supabase: SupabaseClient,
  userId: string,
  briefId: string,
  oldStatus: string,
  newStatus: string,
  additionalData?: AuditData
): Promise<void> {
  return logAuditEvent(supabase, {
    userId,
    action: "brief_status_changed",
    entityType: "brief",
    entityId: briefId,
    oldData: { status: oldStatus },
    newData: { status: newStatus, ...additionalData },
  });
}

// ============================================================================
// Specialized Audit Functions for Brief Sharing
// ============================================================================

/**
 * Log brief sharing event
 */
export function auditBriefShared(
  supabase: SupabaseClient,
  userId: string,
  recipientRecordId: string,
  shareData: AuditData
): Promise<void> {
  return logAuditEvent(supabase, {
    userId,
    action: "brief_shared",
    entityType: "brief_recipient",
    entityId: recipientRecordId,
    newData: shareData,
  });
}

/**
 * Log brief unsharing (revoke access) event
 */
export function auditBriefUnshared(
  supabase: SupabaseClient,
  userId: string,
  recipientRecordId: string,
  shareData: AuditData
): Promise<void> {
  return logAuditEvent(supabase, {
    userId,
    action: "brief_unshared",
    entityType: "brief_recipient",
    entityId: recipientRecordId,
    oldData: shareData,
  });
}

// ============================================================================
// Specialized Audit Functions for Comments
// ============================================================================

/**
 * Log comment creation event
 */
export function auditCommentCreated(
  supabase: SupabaseClient,
  userId: string,
  commentId: string,
  commentData: AuditData
): Promise<void> {
  return logAuditEvent(supabase, {
    userId,
    action: "comment_created",
    entityType: "comment",
    entityId: commentId,
    newData: commentData,
  });
}

/**
 * Log comment deletion event
 */
export function auditCommentDeleted(
  supabase: SupabaseClient,
  userId: string,
  commentId: string,
  commentData: AuditData
): Promise<void> {
  return logAuditEvent(supabase, {
    userId,
    action: "comment_deleted",
    entityType: "comment",
    entityId: commentId,
    oldData: commentData,
  });
}

// ============================================================================
// Specialized Audit Functions for Users
// ============================================================================

/**
 * Log user registration event
 */
export function auditUserRegistered(supabase: SupabaseClient, userId: string, userData: AuditData): Promise<void> {
  return logAuditEvent(supabase, {
    userId,
    action: "user_registered",
    entityType: "user",
    entityId: userId,
    newData: userData,
  });
}

/**
 * Log user deletion event
 */
export function auditUserDeleted(supabase: SupabaseClient, userId: string, userData: AuditData): Promise<void> {
  return logAuditEvent(supabase, {
    userId,
    action: "user_deleted",
    entityType: "user",
    entityId: userId,
    oldData: userData,
  });
}
