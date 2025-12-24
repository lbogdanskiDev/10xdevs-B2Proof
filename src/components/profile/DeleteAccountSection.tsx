"use client";

import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { useDeleteAccount } from "@/components/hooks/useDeleteAccount";
interface DeleteAccountSectionProps {
  userEmail: string;
}

export function DeleteAccountSection({ userEmail }: DeleteAccountSectionProps) {
  const {
    confirmEmail,
    isDialogOpen,
    isDeleting,
    error,
    canDelete,
    setConfirmEmail,
    openDialog,
    closeDialog,
    handleDelete,
  } = useDeleteAccount({ userEmail });

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible and destructive actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button variant="destructive" onClick={openDialog}>
              Delete My Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        open={isDialogOpen}
        onOpenChange={(open) => (open ? openDialog() : closeDialog())}
        userEmail={userEmail}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        confirmEmail={confirmEmail}
        setConfirmEmail={setConfirmEmail}
        canDelete={canDelete}
        error={error}
      />
    </>
  );
}
