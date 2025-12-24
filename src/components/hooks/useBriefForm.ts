"use client";

import { useState, useCallback, useMemo } from "react";
import type { JSONContent } from "@tiptap/react";
import type { BriefFormErrors, BriefFormData } from "@/lib/types/brief-form.types";
import { CREATE_BRIEF_CONSTANTS } from "@/lib/constants/create-brief.constants";

// ============================================================================
// Types
// ============================================================================

export interface BriefFormState {
  header: string;
  content: JSONContent | null;
  footer: string;
  contentCharCount: number;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: BriefFormErrors;
}

interface UseBriefFormOptions {
  initialData?: BriefFormData;
  /** Whether dirty state is required for submission (true for edit, false for create) */
  requireDirtyForSubmit?: boolean;
}

export interface UseBriefFormReturn {
  // State
  formState: BriefFormState;

  // Field handlers
  setHeader: (value: string) => void;
  setContent: (content: JSONContent) => void;
  setContentCharCount: (count: number) => void;
  setFooter: (value: string) => void;

  // State modifiers
  setIsSubmitting: (value: boolean) => void;
  setErrors: (errors: BriefFormErrors) => void;
  resetDirty: () => void;

  // Validation
  validateForm: () => boolean;
  canSubmit: boolean;

  // Form data
  getFormData: () => BriefFormData;

  // Reset
  resetForm: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

const createInitialState = (initialData?: BriefFormData): BriefFormState => ({
  header: initialData?.header ?? "",
  content: initialData?.content ?? null,
  footer: initialData?.footer ?? "",
  contentCharCount: 0,
  isDirty: false,
  isSubmitting: false,
  errors: {},
});

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Base hook for brief form management (create and edit)
 * Encapsulates shared logic for field handling, validation, and state management
 *
 * @param options - Configuration options for the form
 * @returns Form state and handlers
 */
export function useBriefForm(options: UseBriefFormOptions = {}): UseBriefFormReturn {
  const { initialData, requireDirtyForSubmit = false } = options;
  const [formState, setFormState] = useState<BriefFormState>(() => createInitialState(initialData));

  // -------------------------------------------------------------------------
  // Field Setters
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // State Modifiers
  // -------------------------------------------------------------------------

  const setIsSubmitting = useCallback((value: boolean) => {
    setFormState((prev) => ({ ...prev, isSubmitting: value }));
  }, []);

  const setErrors = useCallback((errors: BriefFormErrors) => {
    setFormState((prev) => ({ ...prev, errors }));
  }, []);

  const resetDirty = useCallback(() => {
    setFormState((prev) => ({ ...prev, isDirty: false }));
  }, []);

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

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

    const isValid =
      header.trim().length > 0 &&
      header.length <= CREATE_BRIEF_CONSTANTS.HEADER_MAX_LENGTH &&
      contentCharCount > 0 &&
      contentCharCount <= CREATE_BRIEF_CONSTANTS.CONTENT_MAX_LENGTH &&
      footer.length <= CREATE_BRIEF_CONSTANTS.FOOTER_MAX_LENGTH &&
      !isSubmitting;

    // For edit mode, require dirty state
    if (requireDirtyForSubmit) {
      return isValid && isDirty;
    }

    return isValid;
  }, [formState, requireDirtyForSubmit]);

  // -------------------------------------------------------------------------
  // Form Data
  // -------------------------------------------------------------------------

  const getFormData = useCallback((): BriefFormData => {
    return {
      header: formState.header.trim(),
      content: formState.content,
      footer: formState.footer.trim(),
    };
  }, [formState]);

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setFormState(createInitialState(initialData));
  }, [initialData]);

  return {
    formState,
    setHeader,
    setContent,
    setContentCharCount,
    setFooter,
    setIsSubmitting,
    setErrors,
    resetDirty,
    validateForm,
    canSubmit,
    getFormData,
    resetForm,
  };
}
