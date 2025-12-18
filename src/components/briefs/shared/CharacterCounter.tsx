"use client";

import { cn } from "@/lib/utils";

interface CharacterCounterProps {
  current: number;
  max: number;
  /** Warning threshold as decimal (0-1). Default: 0.8 (80%) */
  warningThreshold?: number;
  /** Danger threshold as decimal (0-1). Default: 0.95 (95%) */
  dangerThreshold?: number;
}

export function CharacterCounter({
  current,
  max,
  warningThreshold = 0.8,
  dangerThreshold = 0.95,
}: CharacterCounterProps) {
  const ratio = current / max;
  const isOverLimit = current > max;
  const isDanger = ratio >= dangerThreshold;
  const isWarning = ratio >= warningThreshold;

  return (
    <span
      className={cn(
        "text-sm",
        isOverLimit && "text-destructive font-medium",
        !isOverLimit && isDanger && "text-destructive",
        !isOverLimit && !isDanger && isWarning && "text-yellow-600 dark:text-yellow-400",
        !isOverLimit && !isDanger && !isWarning && "text-muted-foreground"
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {current}/{max}
    </span>
  );
}
