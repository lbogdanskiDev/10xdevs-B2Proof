"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBriefForm } from "./useBriefForm";
import type { BriefFormErrors, EditBriefInitialData, BriefFormResult } from "@/lib/types/brief-form.types";
import type { BriefDetailDto, ValidationErrorDetail, UpdateBriefCommand } from "@/types";

// ============================================================================
// Types
// ============================================================================

interface UseEditBriefFormProps {
  initialData: EditBriefInitialData;
}

interface UseEditBriefFormReturn extends ReturnType<typeof useBriefForm> {
  handleSubmit: () => Promise<BriefFormResult>;
  handleCancel: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing edit brief form
 * Extends base useBriefForm with edit-specific submit and cancel logic
 */
export function useEditBriefForm({ initialData }: UseEditBriefFormProps): UseEditBriefFormReturn {
  const router = useRouter();
  const form = useBriefForm({
    initialData: {
      header: initialData.header,
      content: initialData.content,
      footer: initialData.footer ?? "",
    },
    requireDirtyForSubmit: true,
  });

  const handleSubmit = useCallback(async (): Promise<BriefFormResult> => {
    if (!form.validateForm()) {
      return { success: false, error: "Validation failed" };
    }

    form.setIsSubmitting(true);
    form.setErrors({});

    try {
      const formData = form.getFormData();
      const updateCommand: UpdateBriefCommand = {
        header: formData.header,
        content: formData.content,
        footer: formData.footer || null,
      };

      const response = await fetch(`/api/briefs/${initialData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateCommand),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle validation errors
        if (errorData.details) {
          const fieldErrors: BriefFormErrors = {};
          errorData.details.forEach((detail: ValidationErrorDetail) => {
            if (detail.field === "header" || detail.field === "content" || detail.field === "footer") {
              fieldErrors[detail.field] = detail.message;
            } else {
              fieldErrors.general = detail.message;
            }
          });
          form.setErrors(fieldErrors);
          form.setIsSubmitting(false);
          return { success: false, error: errorData.error, fieldErrors };
        }

        // Handle specific error cases
        if (response.status === 401) {
          toast.error("Session expired. Please log in again.");
          router.push("/login");
          return { success: false, error: "Unauthorized" };
        }

        if (response.status === 403) {
          toast.error("Only the brief owner can edit this brief");
          router.push(`/briefs/${initialData.id}`);
          form.setIsSubmitting(false);
          return { success: false, error: errorData.error };
        }

        if (response.status === 404) {
          toast.error("Brief not found");
          router.push("/briefs");
          form.setIsSubmitting(false);
          return { success: false, error: "Brief not found" };
        }

        throw new Error(errorData.error || "Failed to update brief");
      }

      const data: BriefDetailDto = await response.json();

      // Check if status was reset
      const wasStatusReset = initialData.status !== "draft" && data.status === "draft";
      if (wasStatusReset) {
        toast.success("Brief updated. Status reset to draft.");
      } else {
        toast.success("Brief updated successfully");
      }

      // Reset dirty state before navigation
      form.resetDirty();
      router.push(`/briefs/${data.id}`);

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred. Please try again.";
      toast.error(message);
      form.setErrors({ general: message });
      form.setIsSubmitting(false);
      return { success: false, error: message };
    }
  }, [form, router, initialData.id, initialData.status]);

  const handleCancel = useCallback(() => {
    router.push(`/briefs/${initialData.id}`);
  }, [router, initialData.id]);

  return {
    ...form,
    handleSubmit,
    handleCancel,
  };
}
