"use client";

import type { LucideIcon } from "lucide-react";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EditorMenuBarProps } from "@/lib/types/create-brief.types";

// ============================================================================
// Types
// ============================================================================

type TextFormat = "bold" | "italic" | "underline" | "strike";
type ListFormat = "bulletList" | "orderedList";
type HeadingLevel = "paragraph" | "1" | "2" | "3";

interface FormatConfig {
  format: TextFormat | ListFormat;
  icon: LucideIcon;
  label: string;
}

interface HeadingOption {
  value: HeadingLevel;
  label: string;
}

// ============================================================================
// Configuration
// ============================================================================

const TEXT_FORMATS: FormatConfig[] = [
  { format: "bold", icon: Bold, label: "Bold" },
  { format: "italic", icon: Italic, label: "Italic" },
  { format: "underline", icon: Underline, label: "Underline" },
  { format: "strike", icon: Strikethrough, label: "Strikethrough" },
];

const LIST_FORMATS: FormatConfig[] = [
  { format: "bulletList", icon: List, label: "Bullet list" },
  { format: "orderedList", icon: ListOrdered, label: "Numbered list" },
];

const HEADING_OPTIONS: HeadingOption[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "1", label: "Heading 1" },
  { value: "2", label: "Heading 2" },
  { value: "3", label: "Heading 3" },
];

// ============================================================================
// Format Toggle Mapping
// ============================================================================

const FORMAT_TOGGLE_MAP: Record<TextFormat | ListFormat, string> = {
  bold: "toggleBold",
  italic: "toggleItalic",
  underline: "toggleUnderline",
  strike: "toggleStrike",
  bulletList: "toggleBulletList",
  orderedList: "toggleOrderedList",
};

// ============================================================================
// Component
// ============================================================================

export function EditorMenuBar({ editor }: EditorMenuBarProps) {
  if (!editor) {
    return null;
  }

  const getCurrentHeadingLevel = (): HeadingLevel => {
    if (editor.isActive("heading", { level: 1 })) return "1";
    if (editor.isActive("heading", { level: 2 })) return "2";
    if (editor.isActive("heading", { level: 3 })) return "3";
    return "paragraph";
  };

  const handleHeadingChange = (value: HeadingLevel) => {
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else {
      editor
        .chain()
        .focus()
        .toggleHeading({ level: parseInt(value) as 1 | 2 | 3 })
        .run();
    }
  };

  const handleFormatToggle = (format: TextFormat | ListFormat) => {
    const method = FORMAT_TOGGLE_MAP[format];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.chain().focus() as any)[method]().run();
  };

  const renderFormatToggle = ({ format, icon: Icon, label }: FormatConfig) => (
    <Toggle
      key={format}
      size="sm"
      pressed={editor.isActive(format)}
      onPressedChange={() => handleFormatToggle(format)}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Toggle>
  );

  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 bg-muted/50 p-2"
      role="toolbar"
      aria-label="Text formatting options"
    >
      {/* Text style toggles */}
      <div className="flex gap-1">{TEXT_FORMATS.map(renderFormatToggle)}</div>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Heading select */}
      <Select value={getCurrentHeadingLevel()} onValueChange={handleHeadingChange}>
        <SelectTrigger className="h-8 w-32" aria-label="Text style">
          <SelectValue placeholder="Paragraph" />
        </SelectTrigger>
        <SelectContent>
          {HEADING_OPTIONS.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* List toggles */}
      <div className="flex gap-1">{LIST_FORMATS.map(renderFormatToggle)}</div>
    </div>
  );
}
