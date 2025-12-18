"use client";

import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered } from "lucide-react";
import type { EditorMenuBarProps } from "@/lib/types/create-brief.types";

type HeadingLevel = "paragraph" | "1" | "2" | "3";

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

  return (
    <div
      className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 bg-muted/50 p-2"
      role="toolbar"
      aria-label="Text formatting options"
    >
      {/* Text style toggles */}
      <div className="flex gap-1">
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Underline"
        >
          <Underline className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("strike")}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>
      </div>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* Heading select */}
      <Select value={getCurrentHeadingLevel()} onValueChange={handleHeadingChange}>
        <SelectTrigger className="h-8 w-32" aria-label="Text style">
          <SelectValue placeholder="Paragraph" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Paragraph</SelectItem>
          <SelectItem value="1">Heading 1</SelectItem>
          <SelectItem value="2">Heading 2</SelectItem>
          <SelectItem value="3">Heading 3</SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-2 h-6" />

      {/* List toggles */}
      <div className="flex gap-1">
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  );
}
