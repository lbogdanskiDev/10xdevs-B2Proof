"use client";

import { useState, useCallback } from "react";
import type { BriefRecipientDto } from "@/types";
import { BRIEF_CONSTANTS } from "@/lib/constants/brief.constants";

interface UseBriefRecipientsProps {
  briefId: string;
  initialRecipients: BriefRecipientDto[];
}

interface UseBriefRecipientsReturn {
  recipients: BriefRecipientDto[];
  isLoading: boolean;
  error: string | null;
  canAddMore: boolean;

  // Actions
  refresh: () => Promise<void>;
  addRecipient: (email: string) => Promise<void>;
  removeRecipient: (recipientId: string) => Promise<void>;
}

export function useBriefRecipients({ briefId, initialRecipients }: UseBriefRecipientsProps): UseBriefRecipientsReturn {
  const [recipients, setRecipients] = useState(initialRecipients);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAddMore = recipients.length < BRIEF_CONSTANTS.MAX_RECIPIENTS;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/briefs/${briefId}/recipients`);
      if (!response.ok) {
        throw new Error("Failed to fetch recipients");
      }
      const result = await response.json();
      setRecipients(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [briefId]);

  const addRecipient = useCallback(
    async (email: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/briefs/${briefId}/recipients`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add recipient");
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [briefId, refresh]
  );

  const removeRecipient = useCallback(
    async (recipientId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/briefs/${briefId}/recipients/${recipientId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to remove recipient");
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [briefId, refresh]
  );

  return {
    recipients,
    isLoading,
    error,
    canAddMore,
    refresh,
    addRecipient,
    removeRecipient,
  };
}
