import type { JSONContent, Editor } from "@tiptap/react";
import type { BriefDetailDto } from "@/types";

/**
 * Form state for creating a brief
 */
export interface CreateBriefFormState {
  header: string;
  content: JSONContent | null;
  footer: string;
  contentCharCount: number;
  isDirty: boolean;
  isSubmitting: boolean;
  errors: FieldErrors;
}

/**
 * Validation errors for form fields
 */
export interface FieldErrors {
  header?: string;
  content?: string;
  footer?: string;
  general?: string;
}

/**
 * Props for form header component
 */
export interface CreateBriefFormHeaderProps {
  onCancel: () => void;
  isSaving: boolean;
  canSave: boolean;
}

/**
 * Props for header field component
 */
export interface HeaderFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Props for brief editor component
 */
export interface BriefEditorProps {
  content: JSONContent | null;
  onChange: (content: JSONContent) => void;
  onCharacterCountChange: (count: number) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Props for editor menu bar component
 */
export interface EditorMenuBarProps {
  editor: Editor | null;
}

/**
 * Props for footer field component
 */
export interface FooterFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Props for unsaved changes dialog component
 */
export interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Result of create brief operation
 */
export interface CreateBriefResult {
  success: boolean;
  data?: BriefDetailDto;
  error?: string;
  fieldErrors?: FieldErrors;
}
