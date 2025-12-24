import { Badge } from "@/components/ui/badge";
import { BRIEF_STATUS_CONFIG } from "@/lib/constants/brief-status.constants";
import type { BriefStatus } from "@/types";
import { cn } from "@/lib/utils";

export interface BriefStatusBadgeProps {
  status: BriefStatus;
  className?: string;
}

/**
 * Displays a brief status with appropriate icon, color, and label.
 * Uses the BRIEF_STATUS_CONFIG for consistent styling across the app.
 */
export function BriefStatusBadge({ status, className }: BriefStatusBadgeProps) {
  const config = BRIEF_STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  );
}
