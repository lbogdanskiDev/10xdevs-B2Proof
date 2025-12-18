"use client";

import { useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CharacterCounter } from "@/components/briefs/shared/CharacterCounter";
import { CREATE_BRIEF_CONSTANTS } from "@/lib/constants/create-brief.constants";
import type { FooterFieldProps } from "@/lib/types/create-brief.types";
import { cn } from "@/lib/utils";

export function FooterField({ value, onChange, error, disabled }: FooterFieldProps) {
  const textareaId = useId();
  const errorId = useId();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={textareaId}>Footer (optional)</Label>
        <CharacterCounter
          current={value.length}
          max={CREATE_BRIEF_CONSTANTS.FOOTER_MAX_LENGTH}
          warningThreshold={CREATE_BRIEF_CONSTANTS.CHARACTER_COUNTER_WARNING_THRESHOLD}
          dangerThreshold={CREATE_BRIEF_CONSTANTS.CHARACTER_COUNTER_DANGER_THRESHOLD}
        />
      </div>
      <Textarea
        id={textareaId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter optional footer text..."
        disabled={disabled}
        rows={3}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
