"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import type { CreateBriefFormState, FieldErrors, CreateBriefResult } from "@/lib/types/create-brief.types";
import type { BriefDetailDto, ValidationErrorDetail } from "@/types";
import { CREATE_BRIEF_CONSTANTS } from "@/lib/constants/create-brief.constants";

interface UseCreateBriefFormReturn {
  // State
  formState: CreateBriefFormState;

  // Field handlers
  setHeader: (value: string) => void;
  setContent: (content: JSONContent) => void;
  setContentCharCount: (count: number) => void;
  setFooter: (value: string) => void;

  // Validation
  validateForm: () => boolean;
  canSubmit: boolean;

  // Actions
  handleSubmit: () => Promise<CreateBriefResult>;
  handleCancel: () => void;

  // Reset
  resetForm: () => void;
}

const initialState: CreateBriefFormState = {
  header: "",
  content: null,
  footer: "",
  contentCharCount: 0,
  isDirty: false,
  isSubmitting: false,
  errors: {},
};

export function useCreateBriefForm(): UseCreateBriefFormReturn {
  const router = useRouter();
  const [formState, setFormState] = useState<CreateBriefFormState>(initialState);

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
    const errors: FieldErrors = {};
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
    const { header, contentCharCount, footer, isSubmitting } = formState;
    return (
      header.trim().length > 0 &&
      header.length <= CREATE_BRIEF_CONSTANTS.HEADER_MAX_LENGTH &&
      contentCharCount > 0 &&
      contentCharCount <= CREATE_BRIEF_CONSTANTS.CONTENT_MAX_LENGTH &&
      footer.length <= CREATE_BRIEF_CONSTANTS.FOOTER_MAX_LENGTH &&
      !isSubmitting
    );
  }, [formState]);

  const handleSubmit = useCallback(async (): Promise<CreateBriefResult> => {
    if (!validateForm()) {
      return { success: false, error: "Validation failed" };
    }

    setFormState((prev) => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      const response = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          header: formState.header.trim(),
          content: formState.content,
          footer: formState.footer.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle validation errors
        if (errorData.details) {
          const fieldErrors: FieldErrors = {};
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
          if (errorData.error?.includes("limit")) {
            toast.warning("Brief limit of 20 reached. Delete old briefs to create new ones.");
          } else {
            toast.error("Only creators can create briefs");
            router.push("/briefs");
          }
          setFormState((prev) => ({ ...prev, isSubmitting: false }));
          return { success: false, error: errorData.error };
        }

        throw new Error(errorData.error || "Failed to create brief");
      }

      const data: BriefDetailDto = await response.json();
      toast.success("Brief created successfully");

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
  }, [formState, validateForm, router]);

  const handleCancel = useCallback(() => {
    router.push("/briefs");
  }, [router]);

  const resetForm = useCallback(() => {
    setFormState(initialState);
  }, []);

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
    resetForm,
  };
}
