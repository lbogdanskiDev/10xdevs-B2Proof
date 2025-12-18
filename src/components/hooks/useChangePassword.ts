"use client";

import { useState, useCallback, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/db/supabase.client";
import { changePasswordSchema } from "@/lib/schemas/profile.schema";
import type { ChangePasswordFormData } from "@/lib/types/profile.types";
import type { PasswordValidation } from "@/components/auth/PasswordRequirements";

const initialFormData: ChangePasswordFormData = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

interface UseChangePasswordReturn {
  // Form state
  formData: ChangePasswordFormData;
  validation: PasswordValidation;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;

  // Actions
  setField: (field: keyof ChangePasswordFormData, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}

export function useChangePassword(): UseChangePasswordReturn {
  const [formData, setFormData] = useState<ChangePasswordFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Real-time validation for checklist display (reusing PasswordValidation from auth)
  const validation = useMemo<PasswordValidation>(
    () => ({
      hasMinLength: formData.newPassword.length >= 8,
      hasDigit: /\d/.test(formData.newPassword),
    }),
    [formData.newPassword]
  );

  const setField = useCallback((field: keyof ChangePasswordFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error and success when user starts typing
    setError(null);
    setSuccess(false);
  }, []);

  const reset = useCallback(() => {
    setFormData(initialFormData);
    setError(null);
    setSuccess(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Clear previous state
      setError(null);
      setSuccess(false);

      // Validate form data with Zod
      const result = changePasswordSchema.safeParse(formData);
      if (!result.success) {
        const firstError = result.error.errors[0];
        setError(firstError.message);
        return;
      }

      setIsSubmitting(true);

      try {
        const supabase = createSupabaseBrowserClient();

        // Supabase Auth updateUser for password change
        // Note: Supabase doesn't require current password verification by default
        // The user is already authenticated via session
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.newPassword,
        });

        if (updateError) {
          // Handle specific Supabase Auth errors
          if (updateError.message.includes("same as your old password")) {
            setError("New password should be different from the old password");
          } else if (updateError.message.includes("weak")) {
            setError("Password is too weak. Please choose a stronger password.");
          } else {
            setError(updateError.message);
          }
          return;
        }

        // Success
        setSuccess(true);
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update password. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, reset]
  );

  return {
    formData,
    validation,
    isSubmitting,
    error,
    success,
    setField,
    handleSubmit,
    reset,
  };
}
