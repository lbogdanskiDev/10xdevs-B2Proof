import type { JSONContent } from "@tiptap/react";
import type { BriefDetailDto, BriefStatus } from "@/types";

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

/**
 * Field validation errors
 */
export interface BriefFormErrors {
  header?: string;
  content?: string;
  footer?: string;
  general?: string;
}

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

/**
 * Result of brief save operation (create or update)
 */
export interface BriefSaveResult {
  success: boolean;
  data?: BriefDetailDto;
  error?: string;
  fieldErrors?: BriefFormErrors;
}

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
