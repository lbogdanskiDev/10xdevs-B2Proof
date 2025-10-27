import type { SupabaseClient, BriefListItemDto, PaginatedResponse, BriefQueryParams } from "@/types";

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
