"use client";

import { useEffect, useId } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import type { BriefDetailDto } from "@/types";
import { cn } from "@/lib/utils";

interface BriefContentRendererProps {
  content: BriefDetailDto["content"];
  /** Enable edit mode with toolbar. Default: false (read-only) */
  editable?: boolean;
  /** Callback when content changes (only in edit mode) */
  onChange?: (content: JSONContent) => void;
  /** Callback when character count changes (only in edit mode) */
  onCharacterCountChange?: (count: number) => void;
  /** Validation error message */
  error?: string;
  /** Disable editing */
  disabled?: boolean;
  /** Render toolbar component (only in edit mode) */
  renderToolbar?: (editor: ReturnType<typeof useEditor>) => React.ReactNode;
  /** Custom class for editor container */
  className?: string;
  /** Minimum height for editor (only in edit mode) */
  minHeight?: string;
}

export function BriefContentRenderer({
  content,
  editable = false,
  onChange,
  onCharacterCountChange,
  error,
  disabled,
  renderToolbar,
  className,
  minHeight = "300px",
}: BriefContentRendererProps) {
  const errorId = useId();

  // Cast to JSONContent for TipTap compatibility
  const jsonContent = content as JSONContent | null;

  // Check for empty content before creating editor (only for read-only mode)
  const isEmpty =
    !editable &&
    (!jsonContent || (jsonContent.type === "doc" && (!jsonContent.content || jsonContent.content.length === 0)));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Typography,
      ...(editable ? [Underline] : []),
    ],
    content: isEmpty ? undefined : (jsonContent ?? ""),
    editable: editable && !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (editable && onChange) {
        onChange(editor.getJSON());
      }
      if (editable && onCharacterCountChange) {
        onCharacterCountChange(editor.getText().length);
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose dark:prose-invert max-w-none focus:outline-none",
          editable && `prose-sm min-h-[${minHeight}] p-4`
        ),
        ...(editable && { "aria-label": "Brief content editor" }),
      },
    },
  });

  // Sync disabled state in edit mode
  useEffect(() => {
    if (editor && editable) {
      editor.setEditable(!disabled);
    }
  }, [editor, editable, disabled]);

  // Update character count on mount in edit mode
  useEffect(() => {
    if (editor && editable && onCharacterCountChange) {
      onCharacterCountChange(editor.getText().length);
    }
  }, [editor, editable, onCharacterCountChange]);

  // Fallback when content is empty (read-only mode only)
  if (isEmpty) {
    return <p className="text-muted-foreground italic">No content available.</p>;
  }

  // Loading skeleton while editor initializes
  if (!editor) {
    return (
      <div className="animate-pulse">
        <div className="mb-4 h-4 w-3/4 rounded bg-muted" />
        <div className="mb-4 h-4 w-full rounded bg-muted" />
        <div className="mb-4 h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
    );
  }

  // Read-only mode
  if (!editable) {
    return <EditorContent editor={editor} />;
  }

  // Edit mode with optional toolbar
  return (
    <div className="space-y-0">
      <div
        className={cn(
          "overflow-hidden rounded-md border",
          error && "border-destructive",
          disabled && "opacity-50",
          className
        )}
      >
        {renderToolbar?.(editor)}
        <EditorContent editor={editor} />
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
