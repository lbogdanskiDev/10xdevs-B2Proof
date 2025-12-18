"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipientTable } from "./RecipientTable";
import { RecipientAddForm } from "./RecipientAddForm";
import { RecipientLimitIndicator } from "./RecipientLimitIndicator";
import { useBriefRecipients } from "@/components/hooks/useBriefRecipients";
import { BRIEF_CONSTANTS } from "@/lib/constants/brief.constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { BriefRecipientDto } from "@/types";

interface BriefRecipientsSectionProps {
  briefId: string;
  initialRecipients: BriefRecipientDto[];
}

export function BriefRecipientsSection({ briefId, initialRecipients }: BriefRecipientsSectionProps) {
  const { recipients, isLoading, error, canAddMore, addRecipient, removeRecipient } = useBriefRecipients({
    briefId,
    initialRecipients,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Recipients</CardTitle>
        <RecipientLimitIndicator current={recipients.length} max={BRIEF_CONSTANTS.MAX_RECIPIENTS} />
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <RecipientTable recipients={recipients} onRemove={removeRecipient} isLoading={isLoading} />

        <RecipientAddForm onAdd={addRecipient} isLoading={isLoading} disabled={!canAddMore} />
      </CardContent>
    </Card>
  );
}
