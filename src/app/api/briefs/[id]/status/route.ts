import { NextRequest, NextResponse } from "next/server";
import { updateBriefStatus } from "@/lib/services/brief.service";
import { BriefIdSchema, updateBriefStatusSchema, type UpdateBriefStatusInput } from "@/lib/schemas/brief.schema";
import {
  validateInput,
  getAuthContext,
  handleApiError,
  errorResponse,
  validateRequestBody,
} from "@/lib/utils/api-handler.utils";
import type { UpdateBriefStatusWithCommentResponseDto } from "@/types";

/**
 * PATCH /api/briefs/:id/status
 * Updates brief status (client only)
 *
 * Allows clients with access to update brief status to:
 * - 'accepted' - Client accepts the brief
 * - 'rejected' - Client rejects the brief
 * - 'needs_modification' - Client requests changes (requires comment)
 *
 * Business rules:
 * - User must be a recipient (not owner) of the brief
 * - Brief must be in 'sent' state to allow status updates
 * - Comment is required when status is 'needs_modification'
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate UUID format
    const idValidation = validateInput(BriefIdSchema, { id }, "Invalid brief ID format");
    if (!idValidation.success) return errorResponse(idValidation);

    // Parse and validate request body
    const bodyValidation = await validateRequestBody<UpdateBriefStatusInput>(
      request,
      updateBriefStatusSchema,
      "PATCH /api/briefs/:id/status",
      { requireNonEmpty: true }
    );
    if (!bodyValidation.success) return errorResponse(bodyValidation);

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId, userEmail } = auth.data;

    // Execute status update
    const briefId = idValidation.data.id;
    const result = await updateBriefStatus(supabase, userId, userEmail, briefId, bodyValidation.data);

    return NextResponse.json<UpdateBriefStatusWithCommentResponseDto>(result, { status: 200 });
  } catch (error) {
    return handleApiError(error, "PATCH /api/briefs/:id/status");
  }
}

// Force dynamic rendering (no caching for auth endpoints)
export const dynamic = "force-dynamic";
