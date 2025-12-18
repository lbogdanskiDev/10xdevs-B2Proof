"use client";

import { useId } from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  confirmEmail: string;
  setConfirmEmail: (email: string) => void;
  canDelete: boolean;
  error: string | null;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  userEmail,
  onConfirm,
  isDeleting,
  confirmEmail,
  setConfirmEmail,
  canDelete,
  error,
}: DeleteAccountDialogProps) {
  const emailInputId = useId();
  const errorId = useId();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account?</AlertDialogTitle>
          <AlertDialogDescription>
            This action is <strong>permanent and cannot be undone</strong>. All your data, including briefs and
            comments, will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive" id={errorId}>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor={emailInputId}>
              Type <span className="font-semibold">{userEmail}</span> to confirm:
            </Label>
            <Input
              id={emailInputId}
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              disabled={isDeleting}
              placeholder="Enter your email address"
              aria-describedby={error ? errorId : undefined}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!canDelete || isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Account"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
