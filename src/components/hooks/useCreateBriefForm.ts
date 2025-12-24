"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBriefForm } from "./useBriefForm";
import type { BriefFormErrors, BriefFormResult } from "@/lib/types/brief-form.types";
import type { BriefDetailDto, ValidationErrorDetail } from "@/types";

// ============================================================================
// Types
// ============================================================================

interface UseCreateBriefFormReturn extends ReturnType<typeof useBriefForm> {
  handleSubmit: () => Promise<BriefFormResult>;
  handleCancel: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing create brief form
 * Extends base useBriefForm with create-specific submit and cancel logic
 */
export function useCreateBriefForm(): UseCreateBriefFormReturn {
  const router = useRouter();
  const form = useBriefForm({ requireDirtyForSubmit: false });

  const handleSubmit = useCallback(async (): Promise<BriefFormResult> => {
    if (!form.validateForm()) {
      return { success: false, error: "Validation failed" };
    }

    form.setIsSubmitting(true);
    form.setErrors({});

    try {
      const formData = form.getFormData();
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header: formData.header,
          content: formData.content,
          footer: formData.footer || null,
        }),
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
          if (errorData.error?.includes("limit")) {
            toast.warning("Brief limit of 20 reached. Delete old briefs to create new ones.");
          } else {
            toast.error("Only creators can create briefs");
            router.push("/briefs");
          }
          form.setIsSubmitting(false);
          return { success: false, error: errorData.error };
        }

        throw new Error(errorData.error || "Failed to create brief");
      }

      const data: BriefDetailDto = await response.json();
      toast.success("Brief created successfully");

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
  }, [form, router]);

  const handleCancel = useCallback(() => {
    router.push("/briefs");
  }, [router]);

  return {
    ...form,
    handleSubmit,
    handleCancel,
  };
}
