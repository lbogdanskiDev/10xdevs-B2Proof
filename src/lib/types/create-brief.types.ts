import type { JSONContent, Editor } from "@tiptap/react";

// ============================================================================
// Component Props (Create Brief specific)
// ============================================================================

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
