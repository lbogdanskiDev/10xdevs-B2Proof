import { Badge } from "@/components/ui/badge";
import { BRIEF_LIMIT_WARNING_THRESHOLD, MAX_BRIEFS_PER_USER } from "@/lib/constants/navigation";

interface BriefCountBadgeProps {
  current: number;
  max?: number;
}

export function BriefCountBadge({ current, max = MAX_BRIEFS_PER_USER }: BriefCountBadgeProps) {
  const isAtLimit = current >= max;
  const isNearLimit = current >= BRIEF_LIMIT_WARNING_THRESHOLD;

  let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";

  if (isAtLimit) {
    variant = "destructive";
  } else if (isNearLimit) {
    variant = "outline";
  }

  return (
    <Badge variant={variant} className="ml-auto text-xs tabular-nums">
      {current}/{max}
    </Badge>
  );
}
