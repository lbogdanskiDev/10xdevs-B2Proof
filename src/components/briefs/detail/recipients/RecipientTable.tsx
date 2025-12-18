"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { BriefRecipientDto } from "@/types";

interface RecipientTableProps {
  recipients: BriefRecipientDto[];
  onRemove: (recipientId: string) => Promise<void>;
  isLoading?: boolean;
}

export function RecipientTable({ recipients, onRemove, isLoading }: RecipientTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (recipientId: string) => {
    setRemovingId(recipientId);
    try {
      await onRemove(recipientId);
    } finally {
      setRemovingId(null);
    }
  };

  if (recipients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No recipients yet. Add someone to share this brief.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Shared</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recipients.map((recipient) => (
          <TableRow key={recipient.id}>
            <TableCell className="font-medium">{recipient.recipientEmail}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(new Date(recipient.sharedAt), { addSuffix: true })}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(recipient.id)}
                disabled={isLoading || removingId === recipient.id}
                aria-label={`Remove ${recipient.recipientEmail}`}
              >
                {removingId === recipient.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
