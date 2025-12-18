import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface OwnershipBadgeProps {
  isOwned: boolean;
  className?: string;
}

/**
 * Displays ownership information for a brief.
 * Shows "My Brief" for owned briefs or "Shared with me" for shared ones.
 */
export function OwnershipBadge({ isOwned, className }: OwnershipBadgeProps) {
  return (
    <Badge variant="outline" className={cn(className)}>
      {isOwned ? "My Brief" : "Shared with me"}
    </Badge>
  );
}
