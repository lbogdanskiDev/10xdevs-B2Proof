import type { UserRole } from "@/types";

/**
 * Login action input data
 */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * Registration action input data
 */
export interface RegisterInput {
  email: string;
  password: string;
  role: UserRole;
}

/**
 * Password change action input data
 */
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Server Action result for authentication operations
 */
export interface AuthActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
}

/**
 * Session user data
 */
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Login form state
 */
export interface LoginFormState {
  email: string;
  password: string;
  showPassword: boolean;
  isSubmitting: boolean;
  errors: {
    email?: string;
    password?: string;
    general?: string;
  };
}

/**
 * Registration form state
 */
export interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole | "";
  showPassword: boolean;
  showConfirmPassword: boolean;
  isSubmitting: boolean;
  errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
    general?: string;
  };
}

/**
 * Change password form state
 */
export interface ChangePasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  isSubmitting: boolean;
  errors: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  };
  successMessage?: string;
}

/**
 * Delete account state
 */
export interface DeleteAccountState {
  isModalOpen: boolean;
  isDeleting: boolean;
  error?: string;
}
