import { NextRequest, NextResponse } from "next/server";
import { getBriefs, createBrief } from "@/lib/services/brief.service";
import { BriefQuerySchema, CreateBriefSchema, type CreateBriefInput } from "@/lib/schemas/brief.schema";
import {
  getAuthContext,
  handleApiError,
  errorResponse,
  parseJsonBody,
  logValidationError,
  formatZodErrors,
} from "@/lib/utils/api-handler.utils";
import type { BriefListItemDto, PaginatedResponse, ErrorReturn, BriefDetailDto, CreateBriefCommand } from "@/types";

/**
 * GET /api/briefs
 * Retrieves paginated list of briefs for the authenticated user
 * Supports filtering by ownership (owned/shared) and status
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId, userEmail } = auth.data;

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const validationResult = BriefQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      filter: searchParams.get("filter") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      logValidationError("GET /api/briefs", details);
      return NextResponse.json<ErrorReturn>({ error: "Invalid query parameters", details }, { status: 400 });
    }

    // Fetch briefs from service
    const result = await getBriefs(supabase, userId, userEmail, validationResult.data);

    return NextResponse.json<PaginatedResponse<BriefListItemDto>>(result, { status: 200 });
  } catch (error) {
    return handleApiError(error, "GET /api/briefs");
  }
}

/**
 * POST /api/briefs
 * Creates a new brief for the authenticated creator user
 * Enforces role-based access (creators only) and business rules (20 brief limit)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const bodyResult = await parseJsonBody<CreateBriefCommand>(request);
    if (!bodyResult.success) return errorResponse(bodyResult);

    // Validate input - using safeParse directly due to complex Zod transforms
    const validationResult = CreateBriefSchema.safeParse(bodyResult.data);
    if (!validationResult.success) {
      const details = formatZodErrors(validationResult.error);
      logValidationError("POST /api/briefs", details);
      return NextResponse.json<ErrorReturn>({ error: "Validation failed", details }, { status: 400 });
    }

    const data: CreateBriefInput = validationResult.data;

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId } = auth.data;

    // Create brief via service
    const brief = await createBrief(supabase, userId, data as CreateBriefCommand);

    return NextResponse.json<BriefDetailDto>(brief, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/briefs");
  }
}

// Force dynamic rendering (no caching for auth endpoints)
export const dynamic = "force-dynamic";
