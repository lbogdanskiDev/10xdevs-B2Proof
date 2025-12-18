"use client";

import { useState, useCallback } from "react";
import { BriefContentRenderer } from "@/components/briefs/detail/BriefContentRenderer";
import { EditorMenuBar } from "./EditorMenuBar";
import { CharacterCounter } from "@/components/briefs/shared/CharacterCounter";
import { CREATE_BRIEF_CONSTANTS } from "@/lib/constants/create-brief.constants";
import type { BriefEditorProps } from "@/lib/types/create-brief.types";

export function BriefEditor({ content, onChange, onCharacterCountChange, error, disabled }: BriefEditorProps) {
  const [characterCount, setCharacterCount] = useState(0);

  const handleCharacterCountChange = useCallback(
    (count: number) => {
      setCharacterCount(count);
      onCharacterCountChange(count);
    },
    [onCharacterCountChange]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Content <span className="text-destructive">*</span>
        </span>
        <CharacterCounter
          current={characterCount}
          max={CREATE_BRIEF_CONSTANTS.CONTENT_MAX_LENGTH}
          warningThreshold={CREATE_BRIEF_CONSTANTS.CHARACTER_COUNTER_WARNING_THRESHOLD}
          dangerThreshold={CREATE_BRIEF_CONSTANTS.CHARACTER_COUNTER_DANGER_THRESHOLD}
        />
      </div>
      <BriefContentRenderer
        content={content}
        editable
        onChange={onChange}
        onCharacterCountChange={handleCharacterCountChange}
        error={error}
        disabled={disabled}
        renderToolbar={(editor) => <EditorMenuBar editor={editor} />}
      />
    </div>
  );
}
