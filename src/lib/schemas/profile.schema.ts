import { z } from "zod";

/**
 * Password validation schema for change password form
 * Requirements:
 * - Current password: required, non-empty
 * - New password: min. 8 characters, at least 1 digit
 * - Confirm password: must match new password
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one digit"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * TypeScript type inferred from changePasswordSchema
 */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
