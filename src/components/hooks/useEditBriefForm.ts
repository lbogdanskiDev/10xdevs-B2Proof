"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import type {
  BriefFormErrors,
  BriefFormData,
  BriefSaveResult,
  EditBriefInitialData,
} from "@/lib/types/brief-form.types";
import type { BriefDetailDto, ValidationErrorDetail, UpdateBriefCommand } from "@/types";
import { CREATE_BRIEF_CONSTANTS } from "@/lib/constants/create-brief.constants";

interface EditBriefFormState {
  header: string;
  content: JSONContent | null;
  footer: string;
  contentCharCount: number;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: BriefFormErrors;
}

interface UseEditBriefFormProps {
  initialData: EditBriefInitialData;
}

interface UseEditBriefFormReturn {
  // State
  formState: EditBriefFormState;

  // Field handlers
  setHeader: (value: string) => void;
  setContent: (content: JSONContent) => void;
  setContentCharCount: (count: number) => void;
  setFooter: (value: string) => void;

  // Validation
  validateForm: () => boolean;
  canSubmit: boolean;

  // Actions
  handleSubmit: () => Promise<BriefSaveResult>;
  handleCancel: () => void;

  // Form data for submission
  getFormData: () => BriefFormData;
}

function createInitialState(initialData: EditBriefInitialData): EditBriefFormState {
  return {
    header: initialData.header,
    content: initialData.content,
    footer: initialData.footer ?? "",
    contentCharCount: 0, // Will be updated by editor
    isDirty: false,
    isSubmitting: false,
    errors: {},
  };
}

export function useEditBriefForm({ initialData }: UseEditBriefFormProps): UseEditBriefFormReturn {
  const router = useRouter();
  const [formState, setFormState] = useState<EditBriefFormState>(() => createInitialState(initialData));

  const setHeader = useCallback((value: string) => {
    setFormState((prev) => ({
      ...prev,
      header: value,
      isDirty: true,
      errors: { ...prev.errors, header: undefined },
    }));
  }, []);

  const setContent = useCallback((content: JSONContent) => {
    setFormState((prev) => ({
      ...prev,
      content,
      isDirty: true,
      errors: { ...prev.errors, content: undefined },
    }));
  }, []);

  const setContentCharCount = useCallback((count: number) => {
    setFormState((prev) => ({
      ...prev,
      contentCharCount: count,
    }));
  }, []);

  const setFooter = useCallback((value: string) => {
    setFormState((prev) => ({
      ...prev,
      footer: value,
      isDirty: true,
      errors: { ...prev.errors, footer: undefined },
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: BriefFormErrors = {};
    const { header, contentCharCount, footer } = formState;

    // Header validation
    if (!header.trim()) {
      errors.header = "Header is required";
    } else if (header.length > CREATE_BRIEF_CONSTANTS.HEADER_MAX_LENGTH) {
      errors.header = `Header must be ${CREATE_BRIEF_CONSTANTS.HEADER_MAX_LENGTH} characters or less`;
    }

    // Content validation
    if (contentCharCount === 0) {
      errors.content = "Content is required";
    } else if (contentCharCount > CREATE_BRIEF_CONSTANTS.CONTENT_MAX_LENGTH) {
      errors.content = `Content must not exceed ${CREATE_BRIEF_CONSTANTS.CONTENT_MAX_LENGTH} characters`;
    }

    // Footer validation
    if (footer.length > CREATE_BRIEF_CONSTANTS.FOOTER_MAX_LENGTH) {
      errors.footer = `Footer must be ${CREATE_BRIEF_CONSTANTS.FOOTER_MAX_LENGTH} characters or less`;
    }

    setFormState((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  }, [formState]);

  const canSubmit = useMemo(() => {
    const { header, contentCharCount, footer, isSubmitting, isDirty } = formState;
    return (
      header.trim().length > 0 &&
      header.length <= CREATE_BRIEF_CONSTANTS.HEADER_MAX_LENGTH &&
      contentCharCount > 0 &&
      contentCharCount <= CREATE_BRIEF_CONSTANTS.CONTENT_MAX_LENGTH &&
      footer.length <= CREATE_BRIEF_CONSTANTS.FOOTER_MAX_LENGTH &&
      !isSubmitting &&
      isDirty
    );
  }, [formState]);

  const getFormData = useCallback((): BriefFormData => {
    return {
      header: formState.header.trim(),
      content: formState.content,
      footer: formState.footer.trim(),
    };
  }, [formState]);

  const handleSubmit = useCallback(async (): Promise<BriefSaveResult> => {
    if (!validateForm()) {
      return { success: false, error: "Validation failed" };
    }

    setFormState((prev) => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      const updateCommand: UpdateBriefCommand = {
        header: formState.header.trim(),
        content: formState.content,
        footer: formState.footer.trim() || null,
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
          setFormState((prev) => ({ ...prev, errors: fieldErrors, isSubmitting: false }));
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
          setFormState((prev) => ({ ...prev, isSubmitting: false }));
          return { success: false, error: errorData.error };
        }

        if (response.status === 404) {
          toast.error("Brief not found");
          router.push("/briefs");
          setFormState((prev) => ({ ...prev, isSubmitting: false }));
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
      setFormState((prev) => ({ ...prev, isDirty: false }));
      router.push(`/briefs/${data.id}`);

      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred. Please try again.";
      toast.error(message);
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        errors: { general: message },
      }));
      return { success: false, error: message };
    }
  }, [formState, validateForm, router, initialData.id, initialData.status]);

  const handleCancel = useCallback(() => {
    router.push(`/briefs/${initialData.id}`);
  }, [router, initialData.id]);

  return {
    formState,
    setHeader,
    setContent,
    setContentCharCount,
    setFooter,
    validateForm,
    canSubmit,
    handleSubmit,
    handleCancel,
    getFormData,
  };
}
