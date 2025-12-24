"use client";

import { useState, useEffect, useCallback } from "react";
import { MAX_BRIEFS_PER_USER, BRIEF_LIMIT_WARNING_THRESHOLD } from "@/lib/constants/navigation.constants";
import type { BriefCountData } from "@/lib/types/navigation.types";

/**
 * Hook for fetching and caching the user's brief count
 * @param initialCount - Optional initial count value (from server)
 * @returns Brief count data with loading state and refresh function
 */
export function useBriefCount(initialCount = 0): BriefCountData {
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(initialCount === 0);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/briefs?limit=1");
      if (!response.ok) {
        throw new Error("Failed to fetch brief count");
      }
      const data = await response.json();
      setCount(data.pagination.total);
    } catch {
      // Fallback: keep current count, don't block UI
      // eslint-disable-next-line no-console
      console.error("Failed to fetch brief count");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if no initial count was provided
    if (initialCount === 0) {
      refresh();
    }
  }, [initialCount, refresh]);

  return {
    count,
    max: MAX_BRIEFS_PER_USER,
    isAtLimit: count >= MAX_BRIEFS_PER_USER,
    isNearLimit: count >= BRIEF_LIMIT_WARNING_THRESHOLD,
    isLoading,
    refresh,
  };
}
