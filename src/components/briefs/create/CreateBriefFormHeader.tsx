"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { CreateBriefFormHeaderProps } from "@/lib/types/create-brief.types";

export function CreateBriefFormHeader({ onCancel, isSaving, canSave }: CreateBriefFormHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <h1 className="text-lg font-semibold">Create Brief</h1>
        <Button type="submit" disabled={!canSave || isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </header>
  );
}
