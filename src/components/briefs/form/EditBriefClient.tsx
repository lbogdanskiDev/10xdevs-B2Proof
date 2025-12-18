"use client";

import { Suspense, lazy, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { HeaderField } from "@/components/briefs/create/HeaderField";
import { FooterField } from "@/components/briefs/create/FooterField";
import { EditorSkeleton } from "@/components/briefs/create/EditorSkeleton";
import { UnsavedChangesDialog } from "@/components/briefs/create/UnsavedChangesDialog";
import { StatusResetAlertDialog } from "./StatusResetAlertDialog";
import { useEditBriefForm } from "@/components/hooks/useEditBriefForm";
import { useUnsavedChangesWarning } from "@/components/hooks/useUnsavedChangesWarning";
import { toBriefInitialData } from "@/lib/types/brief-form.types";
import type { EditBriefClientProps } from "@/lib/types/brief-form.types";

const BriefEditor = lazy(() =>
  import("@/components/briefs/create/BriefEditor").then((mod) => ({ default: mod.BriefEditor }))
);

export function EditBriefClient({ brief }: EditBriefClientProps) {
  const initialData = toBriefInitialData(brief);
  const isNonDraftBrief = brief.status !== "draft";

  const { formState, setHeader, setContent, setContentCharCount, setFooter, canSubmit, handleSubmit, handleCancel } =
    useEditBriefForm({ initialData });

  const { showDialog, setShowDialog, confirmNavigation, handleNavigation } = useUnsavedChangesWarning(
    formState.isDirty
  );

  // Status reset alert state
  const [showStatusResetAlert, setShowStatusResetAlert] = useState(false);

  const onCancel = useCallback(() => {
    if (formState.isDirty) {
      handleNavigation(`/briefs/${brief.id}`);
    } else {
      handleCancel();
    }
  }, [formState.isDirty, handleNavigation, handleCancel, brief.id]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // If brief is non-draft, show confirmation dialog first
      if (isNonDraftBrief) {
        setShowStatusResetAlert(true);
        return;
      }

      await handleSubmit();
    },
    [handleSubmit, isNonDraftBrief]
  );

  const onConfirmStatusReset = useCallback(async () => {
    setShowStatusResetAlert(false);
    await handleSubmit();
  }, [handleSubmit]);

  return (
    <>
      <form onSubmit={onSubmit} className="flex min-h-screen flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 border-b bg-background">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={formState.isSubmitting}>
              Cancel
            </Button>
            <h1 className="text-lg font-semibold">Edit Brief</h1>
            <Button type="submit" disabled={!canSubmit || formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </header>

        {/* Form Content */}
        <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6">
          <HeaderField
            value={formState.header}
            onChange={setHeader}
            error={formState.errors.header}
            disabled={formState.isSubmitting}
          />

          <Suspense fallback={<EditorSkeleton />}>
            <BriefEditor
              content={formState.content}
              onChange={setContent}
              onCharacterCountChange={setContentCharCount}
              error={formState.errors.content}
              disabled={formState.isSubmitting}
            />
          </Suspense>

          <FooterField
            value={formState.footer}
            onChange={setFooter}
            error={formState.errors.footer}
            disabled={formState.isSubmitting}
          />

          {formState.errors.general && (
            <p className="text-sm text-destructive" role="alert">
              {formState.errors.general}
            </p>
          )}
        </main>
      </form>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog open={showDialog} onOpenChange={setShowDialog} onConfirm={confirmNavigation} />

      {/* Status Reset Alert Dialog */}
      <StatusResetAlertDialog
        open={showStatusResetAlert}
        onOpenChange={setShowStatusResetAlert}
        onConfirm={onConfirmStatusReset}
        currentStatus={brief.status}
      />
    </>
  );
}
