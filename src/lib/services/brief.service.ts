import type {
  SupabaseClient,
  BriefListItemDto,
  BriefDetailDto,
  PaginatedResponse,
  BriefQueryParams,
  CreateBriefCommand,
} from "@/types";
import { ApiError, ForbiddenError, UnauthorizedError } from "@/lib/errors/api-errors";

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
    let query = supabase.from("briefs").select("*", { count: "exact" });

    if (filter === "owned") {
      // Only briefs owned by user
      query = query.eq("owner_id", userId);
    } else if (filter === "shared") {
      // Only briefs shared with user (not owned by user)
      const { data: sharedBriefIds, error: recipientsError } = await supabase
        .from("brief_recipients")
        .select("brief_id")
        .eq("recipient_id", userId);

      if (recipientsError) {
        // eslint-disable-next-line no-console -- Service layer logging for debugging
        console.error("[brief.service] Error fetching shared briefs:", recipientsError);
      }

      const briefIds = sharedBriefIds?.map((r) => r.brief_id) || [];
      // eslint-disable-next-line no-console -- Service layer logging for debugging
      console.log("[brief.service] Shared brief IDs:", briefIds);

      if (briefIds.length === 0) {
        // No shared briefs, return empty result
        return {
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }

      query = query.in("id", briefIds).neq("owner_id", userId);
    } else {
      // Both owned and shared briefs
      const { data: sharedBriefIds, error: recipientsError } = await supabase
        .from("brief_recipients")
        .select("brief_id")
        .eq("recipient_id", userId);

      if (recipientsError) {
        // eslint-disable-next-line no-console -- Service layer logging for debugging
        console.error("[brief.service] Error fetching recipients:", recipientsError);
      }

      const briefIds = sharedBriefIds?.map((r) => r.brief_id) || [];
      // eslint-disable-next-line no-console -- Service layer logging for debugging
      console.log("[brief.service] User:", userId, "Shared IDs:", briefIds);

      if (briefIds.length > 0) {
        query = query.or(`owner_id.eq.${userId},id.in.(${briefIds.join(",")})`);
      } else {
        // eslint-disable-next-line no-console -- Service layer logging for debugging
        console.log("[brief.service] No shared briefs, querying only owned");
        query = query.eq("owner_id", userId);
      }
    }

    // Apply status filter if provided
    if (status) {
      query = query.eq("status", status);
    }

    // Apply ordering and pagination
    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.log("[brief.service] Query result:", { dataCount: data?.length, error, count });

    if (error) {
      // eslint-disable-next-line no-console -- Service layer logging for debugging
      console.error("[brief.service] Query error:", error);
      throw new Error(`Failed to fetch briefs: ${error.message}`);
    }

    // Handle no results
    if (!data) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    // Transform database entities to DTOs
    const briefs: BriefListItemDto[] = data.map((brief) => ({
      id: brief.id,
      ownerId: brief.owner_id,
      header: brief.header,
      footer: brief.footer,
      status: brief.status,
      commentCount: brief.comment_count,
      isOwned: brief.owner_id === userId, // Calculate ownership flag
      createdAt: brief.created_at,
      updatedAt: brief.updated_at,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit);

    return {
      data: briefs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    };
  } catch (err) {
    // eslint-disable-next-line no-console -- Service layer logging for debugging
    console.error("[brief.service] Unexpected error:", err);
    throw err;
  }
}

/**
 * Retrieves a single brief by ID with full content
 * Enforces authorization: user must be owner or recipient
 *
 * @param supabase - Supabase client instance
 * @param briefId - UUID of the brief to retrieve
 * @param userId - Current user's UUID from auth
 * @returns Brief detail DTO with full content, or null if not found
 * @throws Error with message 'FORBIDDEN' if user is not authorized
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
      throw new Error("FORBIDDEN");
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
    .select("*", { count: "exact", head: true })
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
