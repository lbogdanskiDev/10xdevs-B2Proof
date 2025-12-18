"use client";

import { Suspense, lazy, useCallback } from "react";
import { CreateBriefFormHeader } from "./CreateBriefFormHeader";
import { HeaderField } from "./HeaderField";
import { FooterField } from "./FooterField";
import { EditorSkeleton } from "./EditorSkeleton";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { useCreateBriefForm } from "@/components/hooks/useCreateBriefForm";
import { useUnsavedChangesWarning } from "@/components/hooks/useUnsavedChangesWarning";

const BriefEditor = lazy(() => import("./BriefEditor").then((mod) => ({ default: mod.BriefEditor })));

export function CreateBriefForm() {
  const { formState, setHeader, setContent, setContentCharCount, setFooter, canSubmit, handleSubmit, handleCancel } =
    useCreateBriefForm();

  const { showDialog, setShowDialog, confirmNavigation, handleNavigation } = useUnsavedChangesWarning(
    formState.isDirty
  );

  const onCancel = useCallback(() => {
    if (formState.isDirty) {
      handleNavigation("/briefs");
    } else {
      handleCancel();
    }
  }, [formState.isDirty, handleNavigation, handleCancel]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await handleSubmit();
    },
    [handleSubmit]
  );

  return (
    <>
      <form onSubmit={onSubmit} className="flex min-h-screen flex-col">
        <CreateBriefFormHeader onCancel={onCancel} isSaving={formState.isSubmitting} canSave={canSubmit} />

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

      <UnsavedChangesDialog open={showDialog} onOpenChange={setShowDialog} onConfirm={confirmNavigation} />
    </>
  );
}
