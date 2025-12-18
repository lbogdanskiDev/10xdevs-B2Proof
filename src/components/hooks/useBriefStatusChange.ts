"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BriefStatus } from "@/types";

interface UseBriefStatusChangeProps {
  briefId: string;
  onSuccess?: () => void;
}

interface UseBriefStatusChangeReturn {
  isChanging: boolean;
  error: string | null;

  // Actions
  acceptBrief: () => Promise<void>;
  rejectBrief: () => Promise<void>;
  requestModification: (comment: string) => Promise<void>;
}

export function useBriefStatusChange({ briefId, onSuccess }: UseBriefStatusChangeProps): UseBriefStatusChangeReturn {
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const changeStatus = useCallback(
    async (status: BriefStatus, comment?: string) => {
      setIsChanging(true);
      setError(null);
      try {
        const response = await fetch(`/api/briefs/${briefId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, comment }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to change status");
        }
        onSuccess?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      } finally {
        setIsChanging(false);
      }
    },
    [briefId, onSuccess, router]
  );

  const acceptBrief = useCallback(async () => {
    await changeStatus("accepted");
  }, [changeStatus]);

  const rejectBrief = useCallback(async () => {
    await changeStatus("rejected");
  }, [changeStatus]);

  const requestModification = useCallback(
    async (comment: string) => {
      await changeStatus("needs_modification", comment);
    },
    [changeStatus]
  );

  return {
    isChanging,
    error,
    acceptBrief,
    rejectBrief,
    requestModification,
  };
}
