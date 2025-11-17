import { z } from "zod";

/**
 * Validation schema for creating a comment
 * Enforces business rules from API spec and database constraints
 * Used in: POST /api/briefs/:id/comments
 */
export const createCommentSchema = z.object({
  content: z
    .string({ required_error: "Comment content is required" })
    .trim()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be between 1 and 1000 characters"),
});

/**
 * TypeScript type inferred from createCommentSchema
 */
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/**
 * Query parameters for GET /api/briefs/:id/comments
 * Enforces pagination limits and defaults
 */
export const getCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

/**
 * TypeScript type inferred from getCommentsQuerySchema
 */
export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
