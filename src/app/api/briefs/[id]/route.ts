import { NextRequest, NextResponse } from "next/server";
import { getBriefById, updateBriefContent, deleteBrief } from "@/lib/services/brief.service";
import { BriefIdSchema, updateBriefContentSchema, type UpdateBriefContentInput } from "@/lib/schemas/brief.schema";
import {
  validateInput,
  getAuthContext,
  handleApiError,
  errorResponse,
  parseJsonBody,
  formatZodErrors,
  logValidationError,
} from "@/lib/utils/api-handler.utils";
import type { BriefDetailDto, ErrorReturn, UpdateBriefCommand } from "@/types";

/**
 * GET /api/briefs/:id
 * Retrieves a single brief by ID with full content
 * Enforces authorization: user must be owner or recipient
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate UUID format
    const validation = validateInput(BriefIdSchema, { id }, "Invalid brief ID format");
    if (!validation.success) return errorResponse(validation);

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId, userEmail } = auth.data;

    // Fetch brief
    const brief = await getBriefById(supabase, validation.data.id, userId, userEmail);
    if (!brief) {
      return NextResponse.json<ErrorReturn>({ error: "Brief not found" }, { status: 404 });
    }

    return NextResponse.json<BriefDetailDto>(brief, { status: 200 });
  } catch (error) {
    return handleApiError(error, "GET /api/briefs/:id");
  }
}

/**
 * PATCH /api/briefs/:id
 * Updates brief content (owner only)
 * Status is automatically reset to 'draft' via database trigger when content is modified.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate UUID format
    const idValidation = validateInput(BriefIdSchema, { id }, "Invalid brief ID format");
    if (!idValidation.success) return errorResponse(idValidation);

    // Parse and validate request body
    // Note: Using safeParse directly due to complex Zod transforms on content field
    const bodyResult = await parseJsonBody<UpdateBriefCommand>(request);
    if (!bodyResult.success) return errorResponse(bodyResult);

    if (!bodyResult.data || Object.keys(bodyResult.data).length === 0) {
      return NextResponse.json<ErrorReturn>({ error: "Request body is required" }, { status: 400 });
    }

    const contentValidation = updateBriefContentSchema.safeParse(bodyResult.data);
    if (!contentValidation.success) {
      const details = formatZodErrors(contentValidation.error);
      logValidationError("PATCH /api/briefs/:id", details);
      return NextResponse.json<ErrorReturn>({ error: "Validation failed", details }, { status: 400 });
    }
    const validatedContent: UpdateBriefContentInput = contentValidation.data;

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId, userEmail } = auth.data;

    // Execute content update
    const updateData: UpdateBriefCommand = {
      header: validatedContent.header,
      content: validatedContent.content as UpdateBriefCommand["content"],
      footer: validatedContent.footer,
    };
    const result = await updateBriefContent(supabase, userId, userEmail, idValidation.data.id, updateData);

    return NextResponse.json<BriefDetailDto>(result, { status: 200 });
  } catch (error) {
    return handleApiError(error, "PATCH /api/briefs/:id");
  }
}

/**
 * DELETE /api/briefs/:id
 * Deletes a brief (owner only)
 * Creates audit log entry before deletion for compliance and recovery.
 * Cascade deletion automatically removes related records (recipients, comments).
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate UUID format
    const validation = validateInput(BriefIdSchema, { id }, "Invalid brief ID format");
    if (!validation.success) return errorResponse(validation);

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId } = auth.data;

    // Delete brief (service handles authorization, audit log, and cascade)
    await deleteBrief(supabase, validation.data.id, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, "DELETE /api/briefs/:id");
  }
}

// Force dynamic rendering (no caching for auth endpoints)
export const dynamic = "force-dynamic";
