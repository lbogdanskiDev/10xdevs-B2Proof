import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MAX_BRIEFS_PER_USER } from "@/lib/constants/brief-status.constants";

export interface BriefLimitAlertProps {
  currentCount: number;
}

/**
 * Warning alert displayed when brief count approaches the limit.
 * Shows how many briefs the user has created out of the maximum allowed.
 */
export function BriefLimitAlert({ currentCount }: BriefLimitAlertProps) {
  const remaining = MAX_BRIEFS_PER_USER - currentCount;

  return (
    <Alert variant="warning">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Approaching brief limit</AlertTitle>
      <AlertDescription>
        You have created {currentCount} out of {MAX_BRIEFS_PER_USER} briefs. You have {remaining}{" "}
        {remaining === 1 ? "brief" : "briefs"} remaining.
      </AlertDescription>
    </Alert>
  );
}
