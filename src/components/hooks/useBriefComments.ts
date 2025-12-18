"use client";

import { useState, useEffect, useCallback } from "react";
import type { CommentDto, PaginatedResponse, PaginationMetadata } from "@/types";
import { BRIEF_CONSTANTS } from "@/lib/constants/brief.constants";

interface UseBriefCommentsProps {
  briefId: string;
  initialData: PaginatedResponse<CommentDto>;
  pollingInterval?: number;
}

interface UseBriefCommentsReturn {
  comments: CommentDto[];
  pagination: PaginationMetadata;
  isLoading: boolean;
  error: string | null;
  currentPage: number;

  // Actions
  refresh: () => Promise<void>;
  changePage: (page: number) => Promise<void>;
  addComment: (content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

export function useBriefComments({
  briefId,
  initialData,
  pollingInterval = BRIEF_CONSTANTS.COMMENT_POLLING_INTERVAL,
}: UseBriefCommentsProps): UseBriefCommentsReturn {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchComments = useCallback(
    async (page: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/briefs/${briefId}/comments?page=${page}`);
        if (!response.ok) {
          throw new Error("Failed to fetch comments");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [briefId]
  );

  const refresh = useCallback(async () => {
    await fetchComments(currentPage);
  }, [fetchComments, currentPage]);

  const changePage = useCallback(
    async (page: number) => {
      setCurrentPage(page);
      await fetchComments(page);
    },
    [fetchComments]
  );

  const addComment = useCallback(
    async (content: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/briefs/${briefId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add comment");
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

  const deleteComment = useCallback(
    async (commentId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/comments/${commentId}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete comment");
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refresh]
  );

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      refresh().catch(console.error); // Silent fail for polling
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [refresh, pollingInterval]);

  return {
    comments: data.data,
    pagination: data.pagination,
    isLoading,
    error,
    currentPage,
    refresh,
    changePage,
    addComment,
    deleteComment,
  };
}
