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
  BriefStatus,
  BriefRecipientDto,
  ShareBriefResponseDto,
} from "@/types";
import {
  ApiError,
  ForbiddenError,
  UnauthorizedError,
  NotFoundError,
  DatabaseError,
  ConflictError,
} from "@/lib/errors/api-errors";

/**
 * Retrieves paginated list of briefs for a user
 * Includes briefs owned by the user and briefs shared with them
 *
 * @param supabase - Supabase client instance
 * @param userId - Current user's UUID from auth
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated response with briefs and metadata
 * @throws Error if database query fails
 */
export async function getBriefs(
  supabase: SupabaseClient,
  userId: string,
  params: BriefQueryParams
): Promise<PaginatedResponse<BriefListItemDto>> {
  const { page = 1, limit = 10, filter, status } = params;
  const offset = (page - 1) * limit;

  try {
    // Build query based on filter parameter
    if (filter === "owned") {
      // Only briefs owned by user
      return await fetchOwnedBriefs(supabase, userId, { page, limit, status });
    } else if (filter === "shared") {
      // Only briefs shared with user (not owned by user)
      return await fetchSharedBriefs(supabase, userId, { page, limit, status });
    } else {
      // Both owned and shared briefs - use parallel queries
      return await fetchAllBriefs(supabase, userId, { page, limit, status, offset });
    }
  } catch (err) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Unexpected error:", err);
    throw err;
  }
}

/**
 * Helper: Fetch only briefs owned by user
 */
async function fetchOwnedBriefs(
  supabase: SupabaseClient,
  userId: string,
  params: { page: number; limit: number; status?: BriefStatus }
): Promise<PaginatedResponse<BriefListItemDto>> {
  const { page, limit, status } = params;
  const offset = (page - 1) * limit;

  let query = supabase.from("briefs").select("*", { count: "exact" }).eq("owner_id", userId);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Error fetching owned briefs:", error);
    throw new Error(`Failed to fetch owned briefs: ${error.message}`);
  }

  if (!data) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const briefs: BriefListItemDto[] = data.map((brief) => ({
    id: brief.id,
    ownerId: brief.owner_id,
    header: brief.header,
    footer: brief.footer,
    status: brief.status,
    commentCount: brief.comment_count,
    isOwned: true, // All are owned
    createdAt: brief.created_at,
    updatedAt: brief.updated_at,
  }));

  const totalPages = Math.ceil((count || 0) / limit);

  return {
    data: briefs,
    pagination: { page, limit, total: count || 0, totalPages },
  };
}

/**
 * Helper: Fetch only briefs shared with user (not owned)
 */
async function fetchSharedBriefs(
  supabase: SupabaseClient,
  userId: string,
  params: { page: number; limit: number; status?: BriefStatus }
): Promise<PaginatedResponse<BriefListItemDto>> {
  const { page, limit, status } = params;
  const offset = (page - 1) * limit;

  // First, get brief IDs shared with user
  const { data: sharedBriefIds, error: recipientsError } = await supabase
    .from("brief_recipients")
    .select("brief_id")
    .eq("recipient_id", userId);

  if (recipientsError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Error fetching shared briefs:", recipientsError);
    throw new Error(`Failed to fetch shared briefs: ${recipientsError.message}`);
  }

  const briefIds = sharedBriefIds?.map((r) => r.brief_id) || [];

  if (briefIds.length === 0) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  // Fetch briefs that user doesn't own but has access to
  let query = supabase.from("briefs").select("*", { count: "exact" }).in("id", briefIds).neq("owner_id", userId);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Error querying shared briefs:", error);
    throw new Error(`Failed to query shared briefs: ${error.message}`);
  }

  if (!data) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const briefs: BriefListItemDto[] = data.map((brief) => ({
    id: brief.id,
    ownerId: brief.owner_id,
    header: brief.header,
    footer: brief.footer,
    status: brief.status,
    commentCount: brief.comment_count,
    isOwned: false, // All are shared (not owned)
    createdAt: brief.created_at,
    updatedAt: brief.updated_at,
  }));

  const totalPages = Math.ceil((count || 0) / limit);

  return {
    data: briefs,
    pagination: { page, limit, total: count || 0, totalPages },
  };
}

/**
 * Helper: Fetch both owned and shared briefs
 * Uses Supabase RPC or manual filtering to combine owned and shared briefs efficiently
 */
async function fetchAllBriefs(
  supabase: SupabaseClient,
  userId: string,
  params: { page: number; limit: number; status?: BriefStatus; offset: number }
): Promise<PaginatedResponse<BriefListItemDto>> {
  const { page, limit, status, offset } = params;

  // Get shared brief IDs first
  const { data: sharedBriefIds } = await supabase
    .from("brief_recipients")
    .select("brief_id")
    .eq("recipient_id", userId);

  const briefIds = sharedBriefIds?.map((r) => r.brief_id) || [];

  // Build query: fetch briefs where user is owner OR brief is in shared IDs
  let query = supabase.from("briefs").select("*", { count: "exact" });

  if (briefIds.length > 0) {
    // Fetch owned briefs + shared briefs
    // Note: This fetches ALL briefs accessible to user, including owned ones
    const allAccessibleIds = [...new Set([...briefIds])]; // Deduplicate
    query = query.or(`owner_id.eq.${userId},id.in.(${allAccessibleIds.join(",")})`);
  } else {
    // User has no shared briefs - only owned
    query = query.eq("owner_id", userId);
  }

  // Apply status filter if provided
  if (status) {
    query = query.eq("status", status);
  }

  // Apply ordering and pagination
  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Error fetching all briefs:", error);
    throw new Error(`Failed to fetch briefs: ${error.message}`);
  }

  if (!data) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  // Transform to DTOs
  const briefs: BriefListItemDto[] = data.map((brief) => ({
    id: brief.id,
    ownerId: brief.owner_id,
    header: brief.header,
    footer: brief.footer,
    status: brief.status,
    commentCount: brief.comment_count,
    isOwned: brief.owner_id === userId,
    createdAt: brief.created_at,
    updatedAt: brief.updated_at,
  }));

  const totalPages = Math.ceil((count || 0) / limit);

  return {
    data: briefs,
    pagination: { page, limit, total: count || 0, totalPages },
  };
}

/**
 * Retrieves a single brief by ID with full content
 * Enforces authorization: user must be owner or recipient
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief to retrieve
 * @param userId - Current user's UUID from auth
 * @returns Brief detail DTO with full content, or null if not found
 * @throws {ForbiddenError} If user is not authorized to access the brief
 * @throws Error if database query fails
 */
export async function getBriefById(
  supabase: SupabaseClient,
  briefId: string,
  userId: string
): Promise<BriefDetailDto | null> {
  // Fetch brief by ID
  const { data: brief, error } = await supabase.from("briefs").select("*").eq("id", briefId).single();

  // Handle not found or query error
  if (error || !brief) {
    return null;
  }

  // Check authorization: user must be owner OR recipient
  const isOwner = brief.owner_id === userId;

  if (!isOwner) {
    // Check if user is a recipient
    const { data: recipient } = await supabase
      .from("brief_recipients")
      .select("id")
      .eq("brief_id", briefId)
      .eq("recipient_id", userId)
      .single();

    if (!recipient) {
      // User is neither owner nor recipient
      throw new ForbiddenError("You do not have access to this brief");
    }
  }

  // Transform database entity to DTO (snake_case to camelCase)
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
    isOwned: brief.owner_id === userId,
    createdAt: brief.created_at,
    updatedAt: brief.updated_at,
  };
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

  // 4. Log audit trail (non-blocking - don't throw on failure)
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: "brief_created",
    entity_type: "brief",
    entity_id: brief.id,
    new_data: {
      header: brief.header,
      content: brief.content,
      footer: brief.footer,
      status: brief.status,
    },
  });

  if (auditError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to log audit trail:", auditError);
    // Don't throw - audit log failure shouldn't break the operation
  }

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
    isOwned: true,
    createdAt: brief.created_at,
    updatedAt: brief.updated_at,
  };
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
  briefId: string,
  data: UpdateBriefCommand
): Promise<BriefDetailDto> {
  // Check if user is owner
  const { isOwner, brief } = await checkBriefAccess(supabase, userId, briefId);

  if (!brief) {
    throw new NotFoundError("Brief", briefId);
  }

  if (!isOwner) {
    throw new ForbiddenError("Only the brief owner can update content");
  }

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

  // Map to DTO
  return {
    id: updatedBrief.id,
    ownerId: updatedBrief.owner_id,
    header: updatedBrief.header,
    content: updatedBrief.content,
    footer: updatedBrief.footer,
    status: updatedBrief.status,
    statusChangedAt: updatedBrief.status_changed_at,
    statusChangedBy: updatedBrief.status_changed_by,
    commentCount: updatedBrief.comment_count,
    isOwned: true,
    createdAt: updatedBrief.created_at,
    updatedAt: updatedBrief.updated_at,
  };
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
  briefId: string,
  data: UpdateBriefStatusCommand
): Promise<UpdateBriefStatusWithCommentResponseDto> {
  // Check if user has access
  const { isOwner, brief } = await checkBriefAccess(supabase, userId, briefId);

  if (!brief) {
    throw new NotFoundError("Brief", briefId);
  }

  if (isOwner) {
    throw new ForbiddenError("Brief owners cannot update status directly");
  }

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

  // Log status change to audit trail (non-blocking - don't throw on failure)
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: "brief_status_changed",
    entity_type: "brief",
    entity_id: briefId,
    old_data: {
      status: brief.status,
    },
    new_data: {
      status: updatedBrief.status,
      status_changed_at: updatedBrief.status_changed_at,
      status_changed_by: updatedBrief.status_changed_by,
    },
  });

  if (auditError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to log status change to audit trail:", auditError);
    // Don't throw - audit log failure shouldn't break the operation
  }

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
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: userId,
    action: "brief_deleted",
    entity_type: "brief",
    entity_id: brief.id,
    old_data: {
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
    },
  });

  if (auditError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to log audit trail:", auditError);
    throw new ApiError("DATABASE_ERROR", "Failed to log deletion audit trail", 500);
  }

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

  // Step 6: Log audit trail (non-blocking - don't throw on failure)
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: ownerId,
    action: "brief_shared",
    entity_type: "brief_recipient",
    entity_id: newRecipient.id,
    new_data: {
      brief_id: newRecipient.brief_id,
      recipient_id: newRecipient.recipient_id,
      recipient_email: newRecipient.recipient_email,
      shared_by: newRecipient.shared_by,
      shared_at: newRecipient.shared_at,
      user_exists: recipientId !== null,
    },
  });

  if (auditError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to log audit trail:", auditError);
    // Don't throw - audit log failure shouldn't break the operation
  }

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

  // Transform to DTOs
  // recipient_id is null if user hasn't registered yet (pending invitation)
  return recipients.map((row) => ({
    id: row.id,
    recipientId: row.recipient_id || "",
    recipientEmail: row.recipient_email,
    sharedBy: row.shared_by,
    sharedAt: row.shared_at,
  }));
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
 * @param recipientId - UUID of recipient to revoke access from
 * @param ownerId - UUID of authenticated user (must be brief owner)
 *
 * @throws {NotFoundError} Brief not found or user not owner
 * @throws {NotFoundError} Recipient access not found
 * @throws {DatabaseError} If database operation fails
 */
export async function revokeBriefRecipient(
  supabase: SupabaseClient,
  briefId: string,
  recipientId: string,
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

  // Guard clause: Verify recipient access exists
  const { data: recipientAccess, error: recipientError } = await supabase
    .from("brief_recipients")
    .select("id, brief_id, recipient_id, shared_by, shared_at")
    .eq("brief_id", briefId)
    .eq("recipient_id", recipientId)
    .single();

  if (recipientError || !recipientAccess) {
    throw new NotFoundError("Recipient access", recipientId);
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

  // Log audit trail BEFORE deletion (critical for recovery)
  const { error: auditError } = await supabase.from("audit_log").insert({
    user_id: ownerId,
    action: "delete",
    entity_type: "brief_recipient",
    entity_id: recipientAccess.id,
    old_data: {
      brief_id: recipientAccess.brief_id,
      recipient_id: recipientAccess.recipient_id,
      shared_by: recipientAccess.shared_by,
      shared_at: recipientAccess.shared_at,
      was_last_recipient: isLastRecipient,
    },
  });

  if (auditError) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Failed to log audit trail:", auditError);
    throw new DatabaseError("log audit trail");
  }

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
    `[brief.service] Recipient ${recipientId} access revoked from brief ${briefId} by user ${ownerId}. Last recipient: ${isLastRecipient}`
  );
}

// ============================================================================
// Helper Functions (Lower-level abstractions)
// ============================================================================

/**
 * Helper function to check if user has access to a brief (owner or recipient)
 *
 * @param supabase - Supabase client instance
 * @param userId - Current user's UUID from auth
 * @param briefId - UUID of the brief to check
 * @returns Object with isOwner flag and brief data (owner_id, status), or null if not found
 */
export async function checkBriefAccess(
  supabase: SupabaseClient,
  userId: string,
  briefId: string
): Promise<{ isOwner: boolean; brief: { owner_id: string; status: string } | null }> {
  // Check if user is owner
  const { data: brief, error } = await supabase.from("briefs").select("owner_id, status").eq("id", briefId).single();

  if (error || !brief) {
    return { isOwner: false, brief: null };
  }

  const isOwner = brief.owner_id === userId;
  if (isOwner) {
    return { isOwner: true, brief };
  }

  // Check if user is recipient
  const { data: recipient } = await supabase
    .from("brief_recipients")
    .select("id")
    .eq("brief_id", briefId)
    .eq("recipient_id", userId)
    .single();

  if (recipient) {
    return { isOwner: false, brief };
  }

  return { isOwner: false, brief: null };
}

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

  // Get author profile for role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authorId).single();

  // Get author email from auth.users (via RPC or separate query)
  const { data: userData } = await supabase.auth.admin.getUserById(authorId);

  return {
    id: comment.id,
    briefId: comment.brief_id,
    authorId: comment.author_id,
    authorEmail: userData.user?.email || "",
    authorRole: profile?.role || "client",
    content: comment.content,
    isOwn: true,
    createdAt: comment.created_at,
  };
}
