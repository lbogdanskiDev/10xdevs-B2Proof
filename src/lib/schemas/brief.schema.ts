import { z } from "zod";
import type { Json } from "@/db/database.types";

/**
 * Helper function to count text length in TipTap JSON content
 * Recursively traverses the TipTap document tree and sums up text node lengths
 *
 * @param node - TipTap node (can be doc, paragraph, text, or any other node type)
 * @returns Total character count of all text nodes
 */
function countTipTapTextLength(node: unknown): number {
  if (!node || typeof node !== "object") {
    return 0;
  }

  let length = 0;
  const nodeObj = node as Record<string, unknown>;

  // If this is a text node, count its text length
  if (nodeObj.type === "text" && typeof nodeObj.text === "string") {
    length += nodeObj.text.length;
  }

  // If this node has content array, traverse it recursively
  if (Array.isArray(nodeObj.content)) {
    for (const child of nodeObj.content) {
      length += countTipTapTextLength(child);
    }
  }

  return length;
}

/**
 * Validation schema for GET /api/briefs query parameters
 * All parameters are optional with sensible defaults for pagination
 * Uses Zod's built-in coerce and optional features
 */
export const BriefQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be at least 1").optional().default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(50, "Limit must be at most 50")
    .optional()
    .default(10),

  filter: z.enum(["owned", "shared"]).optional(),

  status: z.enum(["draft", "sent", "accepted", "rejected", "needs_modification"]).optional(),
});

/**
 * TypeScript type inferred from schema
 */
export type BriefQueryInput = z.infer<typeof BriefQuerySchema>;

/**
 * Validation schema for brief ID parameter
 * Used in GET /api/briefs/:id
 */
export const BriefIdSchema = z.object({
  id: z.string().uuid({ message: "Invalid UUID format" }),
});

/**
 * TypeScript type inferred from BriefIdSchema
 */
export type BriefIdInput = z.infer<typeof BriefIdSchema>;

/**
 * Validation schema for POST /api/briefs request body
 * Validates brief creation data with TipTap content structure
 * Enforces max 10,000 text characters as per PRD requirement
 */
export const CreateBriefSchema = z.object({
  header: z.string().trim().min(1, "Header is required").max(200, "Header must be 200 characters or less"),

  content: z
    .record(z.unknown())
    .refine((val) => typeof val === "object" && val !== null, {
      message: "Content must be a valid TipTap JSON object",
    })
    .refine(
      (val) => {
        const textLength = countTipTapTextLength(val);
        return textLength <= 10000;
      },
      {
        message: "Content must not exceed 10,000 characters",
      }
    )
    .transform((val) => val as Json),

  footer: z.string().max(200, "Footer must be 200 characters or less").optional().nullable(),
});

/**
 * TypeScript type inferred from CreateBriefSchema
 */
export type CreateBriefInput = z.infer<typeof CreateBriefSchema>;

/**
 * Validation schema for updating brief content (owner only)
 * Used in PATCH /api/briefs/:id (content update)
 * At least one field must be provided
 * Enforces max 10,000 text characters for content as per PRD requirement
 */
export const updateBriefContentSchema = z
  .object({
    header: z
      .string()
      .trim()
      .min(1, "Header cannot be empty")
      .max(200, "Header must not exceed 200 characters")
      .optional(),
    content: z
      .record(z.unknown())
      .refine((val) => typeof val === "object" && val !== null, {
        message: "Content must be a valid TipTap JSON object",
      })
      .refine(
        (val) => {
          const textLength = countTipTapTextLength(val);
          return textLength <= 10000;
        },
        {
          message: "Content must not exceed 10,000 characters",
        }
      )
      .transform((val) => val as Json)
      .optional(),
    footer: z
      .string()
      .trim()
      .min(1, "Footer cannot be empty")
      .max(200, "Footer must not exceed 200 characters")
      .nullable()
      .optional(),
  })
  .refine((data) => data.header !== undefined || data.content !== undefined || data.footer !== undefined, {
    message: "At least one field (header, content, or footer) must be provided",
  });

/**
 * TypeScript type inferred from updateBriefContentSchema
 */
export type UpdateBriefContentInput = z.infer<typeof updateBriefContentSchema>;

/**
 * Validation schema for updating brief status (client only)
 * Used in PATCH /api/briefs/:id (status update)
 * Comment is required when status is 'needs_modification'
 */
export const updateBriefStatusSchema = z
  .object({
    status: z.enum(["accepted", "rejected", "needs_modification"], {
      errorMap: () => ({ message: "Status must be 'accepted', 'rejected', or 'needs_modification'" }),
    }),
    comment: z
      .string()
      .min(1, "Comment cannot be empty")
      .max(1000, "Comment must not exceed 1000 characters")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.status === "needs_modification") {
        return data.comment !== undefined && data.comment.length > 0;
      }
      return true;
    },
    {
      message: "Comment is required when status is 'needs_modification'",
      path: ["comment"],
    }
  );

/**
 * TypeScript type inferred from updateBriefStatusSchema
 */
export type UpdateBriefStatusInput = z.infer<typeof updateBriefStatusSchema>;

/**
 * Schema for sharing a brief with a recipient
 * Used in: POST /api/briefs/:id/recipients
 */
export const shareBriefSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .min(1, "Email cannot be empty")
    .max(255, "Email too long"),
});

/**
 * TypeScript type inferred from shareBriefSchema
 */
export type ShareBriefInput = z.infer<typeof shareBriefSchema>;

/**
 * UUID validation schema for path parameters
 */
export const uuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Validation schema for DELETE /api/briefs/:id/recipients/:recipientId path parameters
 * Used to revoke recipient access from a brief
 */
export const RevokeRecipientSchema = z.object({
  id: z.string().uuid({ message: "Invalid brief ID format" }),
  recipientId: z.string().uuid({ message: "Invalid recipient ID format" }),
});

/**
 * TypeScript type inferred from RevokeRecipientSchema
 */
export type RevokeRecipientInput = z.infer<typeof RevokeRecipientSchema>;
