import type {
  SupabaseClient,
  BriefListItemDto,
  BriefDetailDto,
  PaginatedResponse,
  BriefQueryParams,
  CreateBriefCommand,
  UpdateBriefCommand,
  UpdateBriefStatusCommand,
  UpdateBriefStatusWithCommentResponseDto,
  CommentDto,
  BriefRecipientDto,
  ShareBriefResponseDto,
  BriefEntity,
} from "@/types";
import {
  ApiError,
  ForbiddenError,
  UnauthorizedError,
  NotFoundError,
  DatabaseError,
  ConflictError,
} from "@/lib/errors/api-errors";
import { mapBriefToListItem, mapBriefToDetail, mapCommentToDto, mapRecipientToDto } from "@/lib/utils/mappers";
import { checkBriefAccess, requireBriefOwner, requireRecipientAccess } from "@/lib/utils/authorization.utils";
import {
  auditBriefCreated,
  auditBriefDeleted,
  auditStatusChanged,
  auditBriefShared,
  auditBriefUnshared,
} from "@/lib/utils/audit.utils";
import { calculatePagination, calculateOffset, emptyPagination } from "@/lib/utils/query.utils";
import { getAuthorInfo } from "@/lib/utils/user-lookup.utils";

/**
 * Retrieves paginated list of briefs for a user
 * Includes briefs owned by the user and briefs shared with them
 *
 * Refactored to use unified approach with filter functions.
 * Reduces code duplication from ~270 lines to ~100 lines.
 *
 * @param supabase - Supabase client instance
 * @param userId - Current user's UUID from auth
 * @param userEmail - Current user's email from auth (for recipient_email matching)
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated response with briefs and metadata
 * @throws {DatabaseError} If database query fails
 */
export async function getBriefs(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  params: BriefQueryParams
): Promise<PaginatedResponse<BriefListItemDto>> {
  const { page = 1, limit = 10, filter, status } = params;
  const offset = calculateOffset(page, limit);

  // Step 1: Get brief IDs accessible to user based on filter
  const { ownedIds, sharedIds } = await getBriefIdsForUser(supabase, userId, userEmail, filter);

  // Combine IDs based on filter
  let briefIds: string[];
  if (filter === "owned") {
    briefIds = ownedIds;
  } else if (filter === "shared") {
    briefIds = sharedIds;
  } else {
    briefIds = [...new Set([...ownedIds, ...sharedIds])];
  }

  // Early return if no accessible briefs
  if (briefIds.length === 0) {
    return { data: [], pagination: emptyPagination(page, limit) };
  }

  // Step 2: Build and execute query
  let query = supabase.from("briefs").select("*", { count: "exact" }).in("id", briefIds);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Error fetching briefs:", error);
    throw new DatabaseError("brief fetch", error.message);
  }

  if (!data) {
    return { data: [], pagination: emptyPagination(page, limit) };
  }

  // Step 3: Create ownership set for isOwned flag
  const ownedSet = new Set(ownedIds);

  // Step 4: Transform to DTOs
  const briefs: BriefListItemDto[] = data.map((brief) =>
    mapBriefToListItem(brief as BriefEntity, ownedSet.has(brief.id))
  );

  return {
    data: briefs,
    pagination: calculatePagination(page, limit, count ?? 0),
  };
}

/**
 * Get brief IDs accessible to user based on filter
 *
 * Returns separate arrays for owned and shared briefs to allow
 * flexible filtering without re-querying the database.
 *
 * @param supabase - Supabase client instance
 * @param userId - Current user's UUID
 * @param userEmail - Current user's email
 * @param filter - Optional filter ("owned" | "shared")
 * @returns Object with ownedIds and sharedIds arrays
 */
async function getBriefIdsForUser(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  filter?: "owned" | "shared"
): Promise<{ ownedIds: string[]; sharedIds: string[] }> {
  const ownedIds: string[] = [];
  const sharedIds: string[] = [];

  // Fetch owned brief IDs (skip if filter is "shared")
  if (filter !== "shared") {
    const { data: owned, error: ownedError } = await supabase.from("briefs").select("id").eq("owner_id", userId);

    if (ownedError) {
      // eslint-disable-next-line no-console -- Service layer logging for debugging
      console.error("[brief.service] Error fetching owned brief IDs:", ownedError);
      throw new DatabaseError("owned brief fetch", ownedError.message);
    }

    ownedIds.push(...(owned?.map((b) => b.id) ?? []));
  }

  // Fetch shared brief IDs (skip if filter is "owned")
  if (filter !== "owned") {
    const { data: shared, error: sharedError } = await supabase
      .from("brief_recipients")
      .select("brief_id")
      .or(`recipient_id.eq.${userId},recipient_email.eq.${userEmail}`);

    if (sharedError) {
      // eslint-disable-next-line no-console -- Service layer logging for debugging
      console.error("[brief.service] Error fetching shared brief IDs:", sharedError);
      throw new DatabaseError("shared brief fetch", sharedError.message);
    }

    // Filter out briefs that user also owns (to avoid duplicates in shared list)
    const ownedSet = new Set(ownedIds);
    const sharedBriefIds = shared?.map((r) => r.brief_id) ?? [];

    // For "shared" filter, exclude owned briefs
    // For "all" filter, they'll be deduplicated in getBriefs
    if (filter === "shared") {
      sharedIds.push(...sharedBriefIds.filter((id) => !ownedSet.has(id)));
    } else {
      sharedIds.push(...sharedBriefIds);
    }
  }

  return { ownedIds, sharedIds };
}

/**
 * Retrieves a single brief by ID with full content
 * Enforces authorization: user must be owner or recipient
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief to retrieve
 * @param userId - Current user's UUID from auth
 * @param userEmail - Current user's email from auth (for recipient_email matching)
 * @returns Brief detail DTO with full content, or null if not found
 * @throws {ForbiddenError} If user is not authorized to access the brief
 * @throws Error if database query fails
 */
export async function getBriefById(
  supabase: SupabaseClient,
  briefId: string,
  userId: string,
  userEmail: string
): Promise<BriefDetailDto | null> {
  // Use authorization helper - handles both existence and access checks
  const accessCheck = await checkBriefAccess(supabase, briefId, userId, userEmail);

  // Brief not found
  if (!accessCheck) {
    return null;
  }

  // User has no access (not owner, not recipient)
  if (!accessCheck.hasAccess) {
    throw new ForbiddenError("You do not have access to this brief");
  }

  // Transform database entity to DTO using mapper
  return mapBriefToDetail(accessCheck.brief, accessCheck.isOwner);
}

/**
 * Creates a new brief for a creator user
 *
 * Business rules enforced:
 * - User must be authenticated (checked by caller)
 * - User role must be 'creator' (checked here)
 * - User can have maximum 20 briefs (checked here)
 * - Brief starts with 'draft' status
 * - Audit trail is logged
 *
 * @param supabase - Supabase client instance
 * @param userId - Current user's UUID from auth
 * @param data - Brief creation data (header, content, footer)
 * @returns Created brief with full details
 * @throws {UnauthorizedError} If user profile not found
 * @throws {ForbiddenError} If user is not a creator or has reached 20 brief limit
 * @throws {ApiError} If database operation fails
 */
export async function createBrief(
  supabase: SupabaseClient,
  userId: string,
  data: CreateBriefCommand
): Promise<BriefDetailDto> {
  // 1. Verify user role is 'creator'
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new UnauthorizedError("User profile not found");
  }

  if (profile.role !== "creator") {
    throw new ForbiddenError("Only creators can create briefs");
  }

  // 2. Check brief count limit (max 20)
  const { count, error: countError } = await supabase
    .from("briefs")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);

  if (countError) {
    throw new ApiError("DATABASE_ERROR", "Failed to check brief limit", 500);
  }

  if (count !== null && count >= 20) {
    throw new ForbiddenError("Brief limit of 20 reached. Please delete old briefs to create new ones.");
  }

  // 3. Insert brief
  const { data: brief, error: insertError } = await supabase
    .from("briefs")
    .insert({
      owner_id: userId,
      header: data.header,
      content: data.content,
      footer: data.footer ?? null,
      status: "draft",
      comment_count: 0,
    })
    .select()
    .single();

  if (insertError || !brief) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Brief insert error:", insertError);
    throw new ApiError("DATABASE_ERROR", "Failed to create brief", 500);
  }

  // 4. Log audit trail (non-blocking)
  await auditBriefCreated(supabase, userId, brief.id, {
    header: brief.header,
    content: brief.content,
    footer: brief.footer,
    status: brief.status,
  });

  return mapBriefToDetail(brief as BriefEntity, true);
}

/**
 * Updates brief content (owner only)
 * Automatically resets status to 'draft' via database trigger
 *
 * Business rules enforced:
 * - User must be the brief owner (checked here)
 * - At least one field must be provided (checked by Zod schema in route handler)
 * - Status is automatically reset to 'draft' by database trigger if content is modified
 *
 * @param supabase - Supabase client instance
 * @param userId - Current user's UUID from auth
 * @param userEmail - Current user's email from auth (for recipient_email matching)
 * @param briefId - UUID of the brief to update
 * @param data - Update data (header, content, footer) - at least one field required
 * @returns Updated brief with full details
 * @throws {NotFoundError} If brief not found
 * @throws {ForbiddenError} If user is not the brief owner
 * @throws {ApiError} If database operation fails
 */
export async function updateBriefContent(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  briefId: string,
  data: UpdateBriefCommand
): Promise<BriefDetailDto> {
  // Require owner access - throws NotFoundError or ForbiddenError if not authorized
  await requireBriefOwner(supabase, briefId, userId, userEmail);

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.header !== undefined) updateData.header = data.header;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.footer !== undefined) updateData.footer = data.footer;

  // Update brief content
  const { data: updatedBrief, error } = await supabase
    .from("briefs")
    .update(updateData)
    .eq("id", briefId)
    .select(
      `
      id,
      owner_id,
      header,
      content,
      footer,
      status,
      status_changed_at,
      status_changed_by,
      comment_count,
      created_at,
      updated_at
    `
    )
    .single();

  if (error || !updatedBrief) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to update brief:", error);
    throw new ApiError("DATABASE_ERROR", `Failed to update brief: ${error?.message || "Unknown error"}`, 500);
  }

  // Map to DTO using mapper - updatedBrief has the same shape as BriefEntity
  return mapBriefToDetail(updatedBrief as unknown as BriefEntity, true);
}

/**
 * Updates brief status (client only)
 * Creates comment if status is 'needs_modification'
 *
 * Business rules enforced:
 * - User must be a recipient (not owner) of the brief
 * - Brief must be in 'sent' state to allow status updates
 * - Comment is required when status is 'needs_modification' (validated by Zod schema)
 * - Comment is created atomically with status update when needed
 *
 * @param supabase - Supabase client instance
 * @param userId - Current user's UUID from auth
 * @param userEmail - Current user's email from auth (for recipient_email matching)
 * @param briefId - UUID of the brief to update
 * @param data - Status update data (status, optional comment)
 * @returns Updated brief status with optional comment
 * @throws {NotFoundError} If brief not found
 * @throws {ForbiddenError} If user is owner, not a recipient, or brief is not in 'sent' state
 * @throws {ApiError} If database operation fails
 */
export async function updateBriefStatus(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
  briefId: string,
  data: UpdateBriefStatusCommand
): Promise<UpdateBriefStatusWithCommentResponseDto> {
  // Require recipient access - throws if user is owner or has no access
  const { brief } = await requireRecipientAccess(supabase, briefId, userId, userEmail);

  // Check if brief status is 'accepted' (cannot change from accepted - final state)
  if (brief.status === "accepted") {
    throw new ForbiddenError("Cannot change status from accepted");
  }

  // Check if brief is in 'sent' state
  if (brief.status !== "sent") {
    throw new ForbiddenError("Brief status can only be changed when it is in 'sent' state");
  }

  // Update brief status
  const { data: updatedBrief, error } = await supabase
    .from("briefs")
    .update({
      status: data.status,
      status_changed_at: new Date().toISOString(),
      status_changed_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", briefId)
    .select("id, status, status_changed_at, status_changed_by, comment_count, updated_at")
    .single();

  if (error || !updatedBrief) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to update brief status:", error);
    throw new ApiError("DATABASE_ERROR", `Failed to update brief status: ${error?.message || "Unknown error"}`, 500);
  }

  // Log status change to audit trail (non-blocking)
  await auditStatusChanged(supabase, userId, briefId, brief.status, updatedBrief.status, {
    status_changed_at: updatedBrief.status_changed_at,
    status_changed_by: updatedBrief.status_changed_by,
  });

  const response: UpdateBriefStatusWithCommentResponseDto = {
    id: updatedBrief.id,
    status: updatedBrief.status,
    statusChangedAt: updatedBrief.status_changed_at,
    statusChangedBy: updatedBrief.status_changed_by,
    commentCount: updatedBrief.comment_count,
    updatedAt: updatedBrief.updated_at,
  };

  // Create comment if status is 'needs_modification'
  if (data.status === "needs_modification" && data.comment) {
    const comment = await createCommentForStatusUpdate(supabase, briefId, userId, data.comment);
    response.comment = comment;
  }

  return response;
}

/**
 * Deletes a brief and logs the action to audit trail
 *
 * Business rules enforced:
 * - User must be the brief owner (strict ownership check)
 * - Audit log is created BEFORE deletion (critical for recovery)
 * - Cascade deletion automatically handles related records (recipients, comments)
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief to delete
 * @param userId - Current user's UUID from auth
 * @throws {NotFoundError} If brief doesn't exist
 * @throws {ForbiddenError} If user is not the owner
 * @throws {ApiError} If audit log or deletion fails
 */
export async function deleteBrief(supabase: SupabaseClient, briefId: string, userId: string): Promise<void> {
  // 1. Fetch brief and verify existence
  const { data: brief, error: fetchError } = await supabase.from("briefs").select("*").eq("id", briefId).single();

  if (fetchError || !brief) {
    throw new NotFoundError("Brief", briefId);
  }

  // 2. Verify ownership
  if (brief.owner_id !== userId) {
    throw new ForbiddenError("You are not the owner of this brief");
  }

  // 3. Log audit trail BEFORE deletion (critical for recovery)
  // Note: For deletion, audit must succeed before proceeding
  await auditBriefDeleted(supabase, userId, brief.id, {
    owner_id: brief.owner_id,
    header: brief.header,
    content: brief.content,
    footer: brief.footer,
    status: brief.status,
    status_changed_at: brief.status_changed_at,
    status_changed_by: brief.status_changed_by,
    comment_count: brief.comment_count,
    created_at: brief.created_at,
    updated_at: brief.updated_at,
  });

  // 4. Delete brief (cascade will handle brief_recipients and comments)
  const { error: deleteError } = await supabase.from("briefs").delete().eq("id", briefId);

  if (deleteError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to delete brief:", deleteError);
    throw new ApiError("DATABASE_ERROR", "Failed to delete brief", 500);
  }

  // eslint-disable-next-line no-console -- Service layer logging for debugging
  console.info(`[brief.service] Brief ${briefId} deleted by user ${userId}`);

  // Success - no return value needed (void)
}

/**
 * Share a brief with a recipient by email
 *
 * Business rules enforced:
 * - Brief must exist and user must be owner
 * - Maximum 10 recipients per brief
 * - No duplicate shares (same email already shared)
 * - Automatically changes status from 'draft' to 'sent' on first share (via trigger)
 *
 * IMPORTANT: Allows sharing with non-existent users (pending registration)
 * - Stores email in recipient_email field
 * - When user registers with this email, they automatically get access via RLS
 * - UI can check if user exists to show "pending" badge
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief to share
 * @param recipientEmail - Email address of recipient (can be non-existent user)
 * @param ownerId - UUID of the brief owner (from auth)
 * @returns Created recipient record with email and user existence status
 * @throws {NotFoundError} Brief not found or user not owner
 * @throws {ForbiddenError} Recipient limit exceeded (max 10)
 * @throws {ConflictError} Email already has access to brief
 * @throws {DatabaseError} Database operation failed
 */
export async function shareBriefWithRecipient(
  supabase: SupabaseClient,
  briefId: string,
  recipientEmail: string,
  ownerId: string
): Promise<ShareBriefResponseDto> {
  // Step 1: Verify brief exists and user is owner
  const { data: brief, error: briefError } = await supabase
    .from("briefs")
    .select("id, owner_id, status")
    .eq("id", briefId)
    .eq("owner_id", ownerId)
    .single();

  if (briefError || !brief) {
    throw new NotFoundError("Brief", briefId);
  }

  // Step 2: Check recipient limit (max 10)
  const { count, error: countError } = await supabase
    .from("brief_recipients")
    .select("*", { count: "exact", head: true })
    .eq("brief_id", briefId);

  if (countError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to check recipient count:", countError);
    throw new DatabaseError("check recipient count", countError.message);
  }

  if (count !== null && count >= 10) {
    throw new ForbiddenError("Maximum of 10 recipients per brief exceeded");
  }

  // Step 3: Check for duplicate email (prevents sharing same email twice)
  const { data: existingRecipient } = await supabase
    .from("brief_recipients")
    .select("id")
    .eq("brief_id", briefId)
    .eq("recipient_email", recipientEmail)
    .single();

  if (existingRecipient) {
    throw new ConflictError(`Brief already shared with ${recipientEmail}`);
  }

  // Step 4: Lookup if user exists (optional - for UI feedback only)
  // This doesn't block sharing - just provides status info
  const { data: recipientUser } = await supabase.rpc("get_user_by_email", {
    email_param: recipientEmail,
  });

  const recipientId = recipientUser?.[0]?.id || null;

  // Step 5: Insert recipient (works for both existing and non-existent users)
  // - If user exists: recipient_id is set, user gets immediate access
  // - If user doesn't exist: recipient_id is NULL, user gets access after registration
  const { data: newRecipient, error: insertError } = await supabase
    .from("brief_recipients")
    .insert({
      brief_id: briefId,
      recipient_id: recipientId,
      recipient_email: recipientEmail,
      shared_by: ownerId,
    })
    .select("id, brief_id, recipient_id, recipient_email, shared_by, shared_at")
    .single();

  if (insertError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to share brief:", insertError);
    throw new DatabaseError("share brief", insertError.message);
  }

  // Step 6: Log audit trail (non-blocking)
  await auditBriefShared(supabase, ownerId, newRecipient.id, {
    brief_id: newRecipient.brief_id,
    recipient_id: newRecipient.recipient_id,
    recipient_email: newRecipient.recipient_email,
    shared_by: newRecipient.shared_by,
    shared_at: newRecipient.shared_at,
    user_exists: recipientId !== null,
  });

  // Step 7: Return recipient details with email
  return {
    id: newRecipient.id,
    briefId: newRecipient.brief_id,
    recipientId: newRecipient.recipient_id || "",
    recipientEmail: newRecipient.recipient_email || recipientEmail,
    sharedBy: newRecipient.shared_by,
    sharedAt: newRecipient.shared_at,
  };
}

/**
 * Get list of recipients for a brief
 *
 * Retrieves recipients with email addresses and user existence status.
 * Results ordered by shared_at DESC (most recent first).
 *
 * Note: Authorization should be handled by the caller (route handler).
 * Note: Email is now stored directly in brief_recipients table.
 *
 * @param supabase - Supabase client instance
 * @param briefId - Brief UUID
 * @returns Array of recipients with email, sharing metadata, and user existence status
 * @throws {DatabaseError} If database query fails
 */
export async function getBriefRecipients(supabase: SupabaseClient, briefId: string): Promise<BriefRecipientDto[]> {
  // Query recipients from brief_recipients table
  // recipient_email is now stored directly in the table
  const { data: recipients, error: recipientsError } = await supabase
    .from("brief_recipients")
    .select("id, recipient_id, recipient_email, shared_by, shared_at")
    .eq("brief_id", briefId)
    .order("shared_at", { ascending: false });

  if (recipientsError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to fetch recipients:", recipientsError);
    throw new DatabaseError("retrieve recipients");
  }

  // Handle empty list
  if (!recipients || recipients.length === 0) {
    return [];
  }

  // Transform to DTOs using mapper
  return recipients.map((row) =>
    mapRecipientToDto({
      id: row.id,
      brief_id: "", // Not needed for DTO, but required by entity type
      recipient_id: row.recipient_id,
      recipient_email: row.recipient_email,
      shared_by: row.shared_by,
      shared_at: row.shared_at,
    })
  );
}

/**
 * Revoke recipient access to a brief (owner only)
 *
 * Business Rules:
 * - Only brief owner can revoke access
 * - Recipient access must exist
 * - If last recipient is removed, reset brief status to 'draft'
 * - Audit trail is logged before deletion
 *
 * @param supabase - Authenticated Supabase client
 * @param briefId - UUID of brief
 * @param recipientRecordId - UUID of the brief_recipients record (primary key)
 * @param ownerId - UUID of authenticated user (must be brief owner)
 *
 * @throws {NotFoundError} Brief not found or user not owner
 * @throws {NotFoundError} Recipient access not found
 * @throws {DatabaseError} If database operation fails
 */
export async function revokeBriefRecipient(
  supabase: SupabaseClient,
  briefId: string,
  recipientRecordId: string,
  ownerId: string
): Promise<void> {
  // Guard clause: Verify brief exists and user is owner
  const { data: brief, error: briefError } = await supabase
    .from("briefs")
    .select("id, owner_id, status")
    .eq("id", briefId)
    .eq("owner_id", ownerId)
    .single();

  if (briefError || !brief) {
    throw new NotFoundError("Brief", briefId);
  }

  // Guard clause: Verify recipient access exists (using record ID, not recipient_id)
  const { data: recipientAccess, error: recipientError } = await supabase
    .from("brief_recipients")
    .select("id, brief_id, recipient_id, recipient_email, shared_by, shared_at")
    .eq("id", recipientRecordId)
    .eq("brief_id", briefId)
    .single();

  if (recipientError || !recipientAccess) {
    throw new NotFoundError("Recipient access", recipientRecordId);
  }

  // Count remaining recipients (before deletion)
  const { count, error: countError } = await supabase
    .from("brief_recipients")
    .select("*", { count: "exact", head: true })
    .eq("brief_id", briefId);

  if (countError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to count recipients:", countError);
    throw new DatabaseError("count recipients");
  }

  const isLastRecipient = count === 1;

  // Log audit trail BEFORE deletion (non-blocking for unshare)
  await auditBriefUnshared(supabase, ownerId, recipientAccess.id, {
    brief_id: recipientAccess.brief_id,
    recipient_id: recipientAccess.recipient_id,
    recipient_email: recipientAccess.recipient_email,
    shared_by: recipientAccess.shared_by,
    shared_at: recipientAccess.shared_at,
    was_last_recipient: isLastRecipient,
  });

  // Delete recipient access
  const { error: deleteError } = await supabase.from("brief_recipients").delete().eq("id", recipientAccess.id);

  if (deleteError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to delete recipient:", deleteError);
    throw new DatabaseError("delete recipient access");
  }

  // If last recipient removed, reset brief status to 'draft'
  if (isLastRecipient && brief.status !== "draft") {
    const { error: updateError } = await supabase
      .from("briefs")
      .update({
        status: "draft",
        status_changed_at: new Date().toISOString(),
        status_changed_by: ownerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", briefId);

    if (updateError) {
      // eslint-disable-next-line no-console -- Service layer logging for debugging
      console.error("[brief.service] Failed to reset brief status:", updateError);
      // Don't throw - recipient is already deleted, log the error but don't fail
    }
  }

  // eslint-disable-next-line no-console -- Service layer logging for debugging
  console.info(
    `[brief.service] Recipient record ${recipientRecordId} (${recipientAccess.recipient_email}) revoked from brief ${briefId} by user ${ownerId}. Last recipient: ${isLastRecipient}`
  );
}

// ============================================================================
// Helper Functions (Lower-level abstractions)
// ============================================================================

/**
 * Helper function to create comment for status update
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief
 * @param authorId - UUID of the comment author
 * @param content - Comment content
 * @returns Created comment DTO
 * @throws {ApiError} If database operation fails
 */
export async function createCommentForStatusUpdate(
  supabase: SupabaseClient,
  briefId: string,
  authorId: string,
  content: string
): Promise<CommentDto> {
  // Insert comment
  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .insert({
      brief_id: briefId,
      author_id: authorId,
      content,
    })
    .select("id, brief_id, author_id, content, created_at")
    .single();

  if (commentError || !comment) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to create comment:", commentError);
    throw new ApiError("DATABASE_ERROR", `Failed to create comment: ${commentError?.message || "Unknown error"}`, 500);
  }

  // Get author info using utility (email + role in fewer queries)
  const authorInfo = await getAuthorInfo(supabase, authorId);

  // Use mapper for comment DTO
  return mapCommentToDto(comment, authorInfo.email, authorInfo.role, authorId);
}

/**
 * Updates recipient_id for pending invitations matching user's email
 *
 * This function should be called after user login to ensure that
 * any briefs shared with the user's email before registration
 * have their recipient_id updated.
 *
 * This is a fallback mechanism in case the database trigger
 * (auto_update_recipient_id) didn't fire or doesn't exist.
 *
 * @param supabase - Supabase client instance
 * @param userId - Current user's UUID from auth
 * @param userEmail - Current user's email from auth
 * @returns Number of updated recipient records
 */
export async function updatePendingRecipients(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string
): Promise<number> {
  // Update recipient_id for pending invitations matching user's email
  const { data, error } = await supabase
    .from("brief_recipients")
    .update({ recipient_id: userId })
    .eq("recipient_email", userEmail)
    .is("recipient_id", null)
    .select("id");

  if (error) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to update pending recipients:", error);
    // Don't throw - this is a non-critical operation
    return 0;
  }

  const updatedCount = data?.length || 0;

  if (updatedCount > 0) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.info(`[brief.service] Updated ${updatedCount} pending recipient(s) for user ${userId} (${userEmail})`);
  }

  return updatedCount;
}
