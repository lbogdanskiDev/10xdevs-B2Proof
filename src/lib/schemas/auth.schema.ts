import { z } from "zod";

import { AUTH_CONSTANTS } from "@/lib/constants/auth.constants";

/**
 * Login form validation schema
 * Used by loginAction Server Action
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: AUTH_CONSTANTS.MESSAGES.EMAIL_REQUIRED })
    .nullable()
    .transform((val) => val ?? "")
    .pipe(
      z.string().min(1, AUTH_CONSTANTS.MESSAGES.EMAIL_REQUIRED).email(AUTH_CONSTANTS.MESSAGES.INVALID_EMAIL_FORMAT)
    ),
  password: z
    .string({ required_error: AUTH_CONSTANTS.MESSAGES.PASSWORD_REQUIRED })
    .nullable()
    .transform((val) => val ?? "")
    .pipe(z.string().min(1, AUTH_CONSTANTS.MESSAGES.PASSWORD_REQUIRED)),
});

/**
 * TypeScript type inferred from loginSchema
 */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Registration form validation schema
 * Used by registerAction Server Action
 * Note: confirmPassword is validated client-side only, not sent to server
 */
export const registerSchema = z.object({
  email: z
    .string({ required_error: AUTH_CONSTANTS.MESSAGES.EMAIL_REQUIRED })
    .nullable()
    .transform((val) => val ?? "")
    .pipe(
      z.string().min(1, AUTH_CONSTANTS.MESSAGES.EMAIL_REQUIRED).email(AUTH_CONSTANTS.MESSAGES.INVALID_EMAIL_FORMAT)
    ),
  password: z
    .string({ required_error: AUTH_CONSTANTS.MESSAGES.PASSWORD_REQUIRED })
    .nullable()
    .transform((val) => val ?? "")
    .pipe(
      z
        .string()
        .min(AUTH_CONSTANTS.PASSWORD_MIN_LENGTH, AUTH_CONSTANTS.MESSAGES.PASSWORD_MIN_LENGTH)
        .regex(/\d/, AUTH_CONSTANTS.MESSAGES.PASSWORD_REQUIRE_DIGIT)
    ),
  role: z
    .enum(["creator", "client"], {
      errorMap: () => ({ message: AUTH_CONSTANTS.MESSAGES.SELECT_ACCOUNT_TYPE }),
    })
    .nullable()
    .refine((val) => val !== null, {
      message: AUTH_CONSTANTS.MESSAGES.SELECT_ACCOUNT_TYPE,
    }),
});

/**
 * TypeScript type inferred from registerSchema
 */
export type RegisterInput = z.infer<typeof registerSchema>;
