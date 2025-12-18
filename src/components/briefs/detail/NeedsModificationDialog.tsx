"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CharacterCounter } from "../shared/CharacterCounter";
import { BRIEF_CONSTANTS } from "@/lib/constants/brief.constants";

interface NeedsModificationDialogProps {
  trigger: React.ReactNode;
  onSubmit: (comment: string) => Promise<void>;
}

export function NeedsModificationDialog({ trigger, onSubmit }: NeedsModificationDialogProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const trimmedComment = comment.trim();
  const isValid = trimmedComment.length > 0 && trimmedComment.length <= BRIEF_CONSTANTS.MAX_COMMENT_LENGTH;

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedComment);
      setComment("");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      setOpen(newOpen);
      if (!newOpen) {
        setComment("");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Modification</DialogTitle>
          <DialogDescription>
            Please provide feedback on what changes are needed. This comment will be added to the brief.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            placeholder="Describe the modifications needed..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <CharacterCounter current={trimmedComment.length} max={BRIEF_CONSTANTS.MAX_COMMENT_LENGTH} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
