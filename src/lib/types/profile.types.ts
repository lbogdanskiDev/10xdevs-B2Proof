import type { UserRole } from "@/types";

/**
 * Form data for password change
 */
export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Delete account state
 */
export interface DeleteAccountState {
  confirmEmail: string;
  isDialogOpen: boolean;
  isDeleting: boolean;
  error: string | null;
}

/**
 * Props for AccountInfoCard component
 */
export interface AccountInfoCardProps {
  email: string;
  role: UserRole;
  createdAt: string;
}

/**
 * Props for DeleteAccountDialog component
 */
export interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

/**
 * Props for DeleteAccountSection component
 */
export interface DeleteAccountSectionProps {
  userEmail: string;
}
