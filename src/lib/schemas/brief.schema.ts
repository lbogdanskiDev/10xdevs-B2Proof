import { z } from "zod";

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
