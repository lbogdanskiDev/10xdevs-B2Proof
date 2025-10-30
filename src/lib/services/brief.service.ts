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
} from "@/types";
import { ApiError, ForbiddenError, UnauthorizedError, NotFoundError } from "@/lib/errors/api-errors";

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
