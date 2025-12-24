import type { JSONContent } from "@tiptap/react";
import type { BriefDetailDto, BriefStatus } from "@/types";

// ============================================================================
// Form Data
// ============================================================================

/**
 * Form mode for create/edit brief
 */
export type BriefFormMode = "create" | "edit";

/**
 * Form data structure for create/edit brief
 */
export interface BriefFormData {
  header: string;
  content: JSONContent | null;
  footer: string;
}

// ============================================================================
// Form Errors (unified)
// ============================================================================

/**
 * Field-level validation errors for brief forms
 * Used by both create and edit forms
 */
export interface BriefFormErrors {
  header?: string;
  content?: string;
  footer?: string;
  general?: string;
}

// ============================================================================
// Form State
// ============================================================================

/**
 * Form state with validation
 */
export interface BriefFormState {
  data: BriefFormData;
  contentCharCount: number;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: BriefFormErrors;
}

// ============================================================================
// Initial Data
// ============================================================================

/**
 * Initial data for editing a brief
 */
export interface EditBriefInitialData {
  id: string;
  header: string;
  content: JSONContent | null;
  footer: string | null;
  status: BriefStatus;
}

// ============================================================================
// Form Results (unified)
// ============================================================================

/**
 * Result of brief form submission (create or update)
 * Unified type for consistent result handling across create and edit flows
 */
export interface BriefFormResult {
  success: boolean;
  data?: BriefDetailDto;
  error?: string;
  fieldErrors?: BriefFormErrors;
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for StatusResetAlertDialog component
 */
export interface StatusResetAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  currentStatus: BriefStatus;
}

/**
 * Props for EditBriefClient component
 */
export interface EditBriefClientProps {
  brief: BriefDetailDto;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert BriefDetailDto to EditBriefInitialData
 */
export function toBriefInitialData(brief: BriefDetailDto): EditBriefInitialData {
  return {
    id: brief.id,
    header: brief.header,
    content: brief.content as JSONContent | null,
    footer: brief.footer ?? "",
    status: brief.status,
  };
}

/**
 * Convert BriefDetailDto to BriefFormData
 */
export function toBriefFormData(brief: BriefDetailDto): BriefFormData {
  return {
    header: brief.header,
    content: brief.content as JSONContent | null,
    footer: brief.footer ?? "",
  };
}
