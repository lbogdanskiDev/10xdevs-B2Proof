import { Suspense } from "react";
import { cookies } from "next/headers";
import {
  BriefListHeader,
  BriefFilters,
  BriefList,
  BriefEmptyState,
  type EmptyStateVariant,
  BriefListSkeleton,
  BriefPagination,
  BriefLimitAlert,
} from "@/components/briefs";
import { createSupabaseServerClient } from "@/db/supabase.server";
import { BRIEF_LIMIT_WARNING_THRESHOLD } from "@/lib/constants/brief-status.constants";
import type { BriefListItemDto, PaginatedResponse, BriefQueryParams, UserRole } from "@/types";

interface BriefListPageProps {
  searchParams: Promise<{
    page?: string;
    filter?: string;
    status?: string;
  }>;
}

/**
 * Fetches briefs from the API with query parameters
 * Passes cookies for authentication
 */
async function fetchBriefs(params: BriefQueryParams): Promise<PaginatedResponse<BriefListItemDto>> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.set("page", params.page.toString());
  if (params.limit) queryParams.set("limit", params.limit.toString());
  if (params.filter) queryParams.set("filter", params.filter);
  if (params.status) queryParams.set("status", params.status);

  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/briefs?${queryParams.toString()}`;

  // Get cookies for authentication
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch briefs: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Briefs list page
 * Server Component that fetches data and renders the brief list with filters and pagination
 */
export default async function BriefListPage({ searchParams }: BriefListPageProps) {
  // Await searchParams as per Next.js 15 requirements
  const params = await searchParams;

  // Get user role from profile
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user profile to get role
  let userRole: UserRole = "client";
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    if (profile) {
      userRole = profile.role as UserRole;
    }
  }

  const isCreator = userRole === "creator";

  // Parse query parameters
  const queryParams: BriefQueryParams = {
    page: params.page ? parseInt(params.page, 10) : 1,
    filter: (params.filter as "owned" | "shared" | undefined) || undefined,
    status: params.status as BriefQueryParams["status"],
  };

  // Fetch briefs data
  const { data: briefs, pagination } = await fetchBriefs(queryParams);

  // Determine empty state variant
  let emptyStateVariant: EmptyStateVariant | null = null;
  if (briefs.length === 0) {
    if (queryParams.filter || queryParams.status) {
      emptyStateVariant = "no-results";
    } else if (isCreator) {
      emptyStateVariant = "no-briefs-creator";
    } else {
      emptyStateVariant = "no-briefs-client";
    }
  }

  // Show limit warning for creators
  const showLimitWarning = isCreator && pagination.total >= BRIEF_LIMIT_WARNING_THRESHOLD;

  return (
    <div className="space-y-6">
      {/* Header */}
      <BriefListHeader userRole={userRole} briefCount={pagination.total} />

      {/* Limit Warning (creators only, when approaching limit) */}
      {showLimitWarning && <BriefLimitAlert currentCount={pagination.total} />}

      {/* Filters */}
      <BriefFilters userRole={userRole} />

      {/* Brief List or Empty State */}
      <Suspense fallback={<BriefListSkeleton />}>
        {emptyStateVariant ? <BriefEmptyState variant={emptyStateVariant} /> : <BriefList briefs={briefs} />}
      </Suspense>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <BriefPagination currentPage={pagination.page} totalPages={pagination.totalPages} />
      )}
    </div>
  );
}
