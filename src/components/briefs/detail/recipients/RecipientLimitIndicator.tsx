"use client";

import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface RecipientLimitIndicatorProps {
  current: number;
  max: number;
}

export function RecipientLimitIndicator({ current, max }: RecipientLimitIndicatorProps) {
  const isNearLimit = current >= max * 0.8;
  const isAtLimit = current >= max;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-sm",
        isAtLimit && "text-destructive",
        !isAtLimit && isNearLimit && "text-yellow-600 dark:text-yellow-400",
        !isAtLimit && !isNearLimit && "text-muted-foreground"
      )}
    >
      <Users className="h-4 w-4" />
      <span>
        {current}/{max} recipients
      </span>
    </div>
  );
}
