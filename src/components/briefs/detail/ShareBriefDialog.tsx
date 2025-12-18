"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { RecipientTable } from "./recipients/RecipientTable";
import { RecipientAddForm } from "./recipients/RecipientAddForm";
import { RecipientLimitIndicator } from "./recipients/RecipientLimitIndicator";
import { useBriefRecipients } from "@/components/hooks/useBriefRecipients";
import { BRIEF_CONSTANTS } from "@/lib/constants/brief.constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { BriefRecipientDto } from "@/types";

interface ShareBriefDialogProps {
  briefId: string;
  initialRecipients: BriefRecipientDto[];
  trigger?: React.ReactNode;
}

export function ShareBriefDialog({ briefId, initialRecipients, trigger }: ShareBriefDialogProps) {
  const [open, setOpen] = useState(false);
  const { recipients, isLoading, error, canAddMore, addRecipient, removeRecipient } = useBriefRecipients({
    briefId,
    initialRecipients,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Share Brief</span>
            <RecipientLimitIndicator current={recipients.length} max={BRIEF_CONSTANTS.MAX_RECIPIENTS} />
          </DialogTitle>
          <DialogDescription>
            Add recipients to share this brief. They will receive access to view and comment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <RecipientAddForm onAdd={addRecipient} isLoading={isLoading} disabled={!canAddMore} />

          <div className="max-h-[300px] overflow-y-auto">
            <RecipientTable recipients={recipients} onRemove={removeRecipient} isLoading={isLoading} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
