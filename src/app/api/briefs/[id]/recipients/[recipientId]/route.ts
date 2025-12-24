import { NextRequest, NextResponse } from "next/server";
import { RevokeRecipientSchema } from "@/lib/schemas/brief.schema";
import { revokeBriefRecipient } from "@/lib/services/brief.service";
import {
  validateInput,
  getAuthContext,
  handleApiError,
  errorResponse,
  logValidationError,
} from "@/lib/utils/api-handler.utils";
import type { ErrorReturn } from "@/types";

/**
 * DELETE /api/briefs/:id/recipients/:recipientId
 * Revoke recipient access to brief (owner only)
 * Automatically resets brief status to 'draft' if last recipient is removed.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; recipientId: string }> }
): Promise<NextResponse<ErrorReturn | null>> {
  try {
    const { id, recipientId } = await params;

    // Validate path parameters
    const validation = validateInput(RevokeRecipientSchema, { id, recipientId }, "Invalid request parameters");
    if (!validation.success) {
      logValidationError("DELETE /api/briefs/:id/recipients/:recipientId", validation.error.details ?? []);
      return errorResponse(validation);
    }

    const { id: briefId, recipientId: validRecipientId } = validation.data;

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId } = auth.data;

    // Revoke recipient access (service handles all business logic)
    await revokeBriefRecipient(supabase, briefId, validRecipientId, userId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error, "DELETE /api/briefs/:id/recipients/:recipientId");
  }
}
