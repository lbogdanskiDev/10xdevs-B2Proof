"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CharacterCounter } from "@/components/briefs/shared/CharacterCounter";
import { CREATE_BRIEF_CONSTANTS } from "@/lib/constants/create-brief.constants";
import type { HeaderFieldProps } from "@/lib/types/create-brief.types";
import { cn } from "@/lib/utils";

export function HeaderField({ value, onChange, error, disabled }: HeaderFieldProps) {
  const inputId = useId();
  const errorId = useId();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={inputId}>
          Header <span className="text-destructive">*</span>
        </Label>
        <CharacterCounter
          current={value.length}
          max={CREATE_BRIEF_CONSTANTS.HEADER_MAX_LENGTH}
          warningThreshold={CREATE_BRIEF_CONSTANTS.CHARACTER_COUNTER_WARNING_THRESHOLD}
          dangerThreshold={CREATE_BRIEF_CONSTANTS.CHARACTER_COUNTER_DANGER_THRESHOLD}
        />
      </div>
      <Input
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter brief header..."
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
        data-test-id="brief-header-input"
      />
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
