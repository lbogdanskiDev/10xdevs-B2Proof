"use client";

import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle } from "lucide-react";
import { NeedsModificationDialog } from "./NeedsModificationDialog";
import { useBriefStatusChange } from "@/components/hooks/useBriefStatusChange";
import { toast } from "sonner";

interface RecipientActionsProps {
  briefId: string;
  onStatusChange?: () => void;
}

export function RecipientActions({ briefId, onStatusChange }: RecipientActionsProps) {
  const { isChanging, acceptBrief, rejectBrief, requestModification } = useBriefStatusChange({
    briefId,
    onSuccess: onStatusChange,
  });

  const handleAccept = async () => {
    try {
      await acceptBrief();
      toast.success("Brief accepted", {
        description: "The brief has been accepted successfully.",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to accept the brief. Please try again.",
      });
    }
  };

  const handleReject = async () => {
    try {
      await rejectBrief();
      toast.success("Brief rejected", {
        description: "The brief has been rejected.",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to reject the brief. Please try again.",
      });
    }
  };

  const handleNeedsModification = async (comment: string) => {
    try {
      await requestModification(comment);
      toast.success("Modification requested", {
        description: "Your feedback has been sent to the brief owner.",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to request modification. Please try again.",
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handleAccept} disabled={isChanging}>
        <Check className="mr-2 h-4 w-4" />
        Accept
      </Button>

      <Button variant="outline" onClick={handleReject} disabled={isChanging}>
        <X className="mr-2 h-4 w-4" />
        Reject
      </Button>

      <NeedsModificationDialog
        trigger={
          <Button variant="outline" disabled={isChanging}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Needs Modification
          </Button>
        }
        onSubmit={handleNeedsModification}
      />
    </div>
  );
}
