import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/db/supabase.server";
import { DEFAULT_USER_PROFILE } from "@/db/supabase.client";
import { getBriefById, updateBriefContent, deleteBrief } from "@/lib/services/brief.service";
import { BriefIdSchema, updateBriefContentSchema } from "@/lib/schemas/brief.schema";
import { ApiError } from "@/lib/errors/api-errors";
import type { BriefDetailDto, ErrorResponse, UpdateBriefCommand } from "@/types";

/**
 * GET /api/briefs/:id
 * Retrieves a single brief by ID with full content
 * Enforces authorization: user must be owner or recipient
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing brief ID
 * @returns Brief detail DTO or error response
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id } = await params;

    // Step 2: Validate UUID format
    const validationResult = BriefIdSchema.safeParse({ id });

    // Guard: Check validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[GET /api/briefs/:id] Validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Invalid brief ID format", details }, { status: 400 });
    }

    // Step 3: Get Supabase admin client and mock user
    // TEMPORARY: Using admin client for development with mock authentication
    // TODO: Replace with createSupabaseServerClient() and real auth
    const supabase = createSupabaseAdminClient();

    // TEMPORARY: Using mock user profile for development
    // TODO: Replace with real authentication: await supabase.auth.getUser()
    const userId = DEFAULT_USER_PROFILE.id;

    // Step 4: Fetch brief from service
    const brief = await getBriefById(supabase, validationResult.data.id, userId);

    // Guard: Check if brief exists
    if (!brief) {
      return NextResponse.json<ErrorResponse>({ error: "Brief not found" }, { status: 404 });
    }

    // Happy path: Return brief detail
    return NextResponse.json<BriefDetailDto>(brief, { status: 200 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[GET /api/briefs/:id] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/briefs/:id
 * Updates brief content (owner only)
 *
 * Allows brief owners to update header, content, and/or footer.
 * Status is automatically reset to 'draft' via database trigger when content is modified.
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 *
 * @param request - Next.js request object with JSON body
 * @param params - Route parameters containing brief ID
 * @returns Updated brief DTO or error response
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id } = await params;

    // Step 2: Validate UUID format
    const validationResult = BriefIdSchema.safeParse({ id });

    // Guard: Check UUID validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[PATCH /api/briefs/:id] UUID validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Invalid brief ID format", details }, { status: 400 });
    }

    // Step 3: Parse request body
    const body = (await request.json()) as UpdateBriefCommand;

    // Guard: Check if body is empty
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json<ErrorResponse>({ error: "Request body is required" }, { status: 400 });
    }

    // Step 4: Validate content update data
    const contentValidation = updateBriefContentSchema.safeParse(body);

    // Guard: Check content validation
    if (!contentValidation.success) {
      const details = contentValidation.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[PATCH /api/briefs/:id] Content validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Validation failed", details }, { status: 400 });
    }

    // Step 5: Get Supabase admin client and mock user
    // TEMPORARY: Using admin client for development with mock authentication
    // TODO: Replace with createSupabaseServerClient() and real auth
    const supabase = createSupabaseAdminClient();

    // TEMPORARY: Using mock user profile for development
    // TODO: Replace with real authentication: await supabase.auth.getUser()
    const userId = DEFAULT_USER_PROFILE.id;

    // Step 6: Execute content update
    const updateData: UpdateBriefCommand = {
      header: contentValidation.data.header,
      content: contentValidation.data.content as UpdateBriefCommand["content"],
      footer: contentValidation.data.footer,
    };
    const result = await updateBriefContent(supabase, userId, validationResult.data.id, updateData);

    // Happy path: Return updated brief
    return NextResponse.json<BriefDetailDto>(result, { status: 200 });
  } catch (error) {
    // Handle known API errors
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[PATCH /api/briefs/:id] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/briefs/:id
 * Deletes a brief (owner only)
 *
 * Enforces strict ownership - only the brief owner can delete.
 * Creates audit log entry before deletion for compliance and recovery.
 * Cascade deletion automatically removes related records (recipients, comments).
 *
 * NOTE: Currently using mock authentication with DEFAULT_USER_PROFILE
 * Uses admin client to bypass RLS during development
 * TODO: Replace with real Supabase Auth and regular client when authentication is implemented
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing brief ID
 * @returns 204 No Content on success, or error response
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Step 1: Await params (Next.js 15 breaking change)
    const { id } = await params;

    // Step 2: Validate UUID format
    const validationResult = BriefIdSchema.safeParse({ id });

    // Guard: Check validation
    if (!validationResult.success) {
      const details = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      // eslint-disable-next-line no-console -- API error logging for debugging
      console.error("[DELETE /api/briefs/:id] Validation error:", details);
      return NextResponse.json<ErrorResponse>({ error: "Invalid brief ID format", details }, { status: 400 });
    }

    // Step 3: Get Supabase admin client and mock user
    // TEMPORARY: Using admin client for development with mock authentication
    // TODO: Replace with createSupabaseServerClient() and real auth
    const supabase = createSupabaseAdminClient();

    // TEMPORARY: Using mock user profile for development
    // TODO: Replace with real authentication: await supabase.auth.getUser()
    const userId = DEFAULT_USER_PROFILE.id;

    // Step 4: Delete brief (service handles authorization, audit log, and cascade)
    await deleteBrief(supabase, validationResult.data.id, userId);

    // Happy path: Return 204 No Content (no response body)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json<ErrorResponse>({ error: error.message }, { status: error.statusCode });
    }

    // Handle unexpected errors
    // eslint-disable-next-line no-console -- API error logging for debugging
    console.error("[DELETE /api/briefs/:id] Unexpected error:", error);
    return NextResponse.json<ErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}

// Force dynamic rendering (no caching for auth endpoints)
export const dynamic = "force-dynamic";
