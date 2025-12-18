"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { StatusResetAlertDialogProps } from "@/lib/types/brief-form.types";
import { BRIEF_STATUS_CONFIG } from "@/lib/constants/brief-status";

export function StatusResetAlertDialog({ open, onOpenChange, onConfirm, currentStatus }: StatusResetAlertDialogProps) {
  const statusConfig = BRIEF_STATUS_CONFIG[currentStatus];
  const statusLabel = statusConfig?.label ?? currentStatus;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Brief Status?</AlertDialogTitle>
          <AlertDialogDescription>
            This brief currently has the status <strong>&quot;{statusLabel}&quot;</strong>. Saving changes will reset
            the status to <strong>&quot;Draft&quot;</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Continue and Reset Status</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
