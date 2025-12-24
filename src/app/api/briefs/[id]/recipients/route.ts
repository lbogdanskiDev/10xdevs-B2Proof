import { NextRequest, NextResponse } from "next/server";
import { BriefIdSchema, shareBriefSchema, type ShareBriefInput } from "@/lib/schemas/brief.schema";
import { getBriefRecipients, shareBriefWithRecipient } from "@/lib/services/brief.service";
import { NotFoundError, ForbiddenError } from "@/lib/errors/api-errors";
import {
  validateInput,
  getAuthContext,
  handleApiError,
  errorResponse,
  validateRequestBody,
} from "@/lib/utils/api-handler.utils";
import type { BriefRecipientDto, ShareBriefResponseDto } from "@/types";

// Force dynamic rendering (no static optimization)
export const dynamic = "force-dynamic";

/**
 * GET /api/briefs/:id/recipients
 * Retrieve list of users with access to the brief (owner only)
 * Enforces authorization: only the brief owner can view recipients list
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate brief ID
    const validation = validateInput(BriefIdSchema, { id }, "Invalid brief ID format");
    if (!validation.success) return errorResponse(validation);

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId } = auth.data;
    const briefId = validation.data.id;

    // Check brief exists and user is owner (authorization)
    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("owner_id")
      .eq("id", briefId)
      .single();

    if (briefError || !brief) {
      throw new NotFoundError("Brief", briefId);
    }

    if (brief.owner_id !== userId) {
      throw new ForbiddenError("Only the brief owner can view recipients");
    }

    // Get recipients from service
    const recipients = await getBriefRecipients(supabase, briefId);

    return NextResponse.json<{ data: BriefRecipientDto[] }>({ data: recipients }, { status: 200 });
  } catch (error) {
    return handleApiError(error, "GET /api/briefs/:id/recipients");
  }
}

/**
 * POST /api/briefs/:id/recipients
 * Share brief with a recipient by email (owner only)
 *
 * Allows sharing with non-existent users (pending invitations):
 * - If user exists: They get immediate access
 * - If user doesn't exist: Access is pending until they register
 * - Brief status changes from 'draft' to 'sent' automatically (database trigger)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate brief ID
    const idValidation = validateInput(BriefIdSchema, { id }, "Invalid brief ID format");
    if (!idValidation.success) return errorResponse(idValidation);

    const briefId = idValidation.data.id;

    // Parse and validate request body
    const bodyValidation = await validateRequestBody<ShareBriefInput>(
      request,
      shareBriefSchema,
      "POST /api/briefs/:id/recipients"
    );
    if (!bodyValidation.success) return errorResponse(bodyValidation);

    const { email } = bodyValidation.data;

    // Authenticate
    const auth = await getAuthContext();
    if (!auth.success) return errorResponse(auth);

    const { supabase, userId } = auth.data;

    // Share brief with recipient (service handles all business logic)
    const recipient = await shareBriefWithRecipient(supabase, briefId, email, userId);

    return NextResponse.json<ShareBriefResponseDto>(recipient, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/briefs/:id/recipients");
  }
}
