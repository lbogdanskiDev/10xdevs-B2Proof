"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";
import { useBriefComments } from "@/components/hooks/useBriefComments";
import { toast } from "sonner";
import { RefreshCw, Loader2 } from "lucide-react";
import { generatePageNumbers } from "@/lib/utils/pagination";
import type { CommentDto, PaginatedResponse } from "@/types";

interface BriefCommentsSectionProps {
  briefId: string;
  initialComments: PaginatedResponse<CommentDto>;
}

export function BriefCommentsSection({ briefId, initialComments }: BriefCommentsSectionProps) {
  const { comments, pagination, isLoading, currentPage, refresh, changePage, addComment, deleteComment } =
    useBriefComments({
      briefId,
      initialData: initialComments,
    });

  const handleAddComment = async (content: string) => {
    try {
      await addComment(content);
      toast.success("Comment added", {
        description: "Your comment has been posted.",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to add comment. Please try again.",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      toast.success("Comment deleted", {
        description: "Your comment has been removed.",
      });
    } catch {
      toast.error("Error", {
        description: "Failed to delete comment. Please try again.",
      });
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch {
      // Silent fail for manual refresh - polling will retry
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Comments ({pagination.total})</CardTitle>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} aria-label="Refresh comments">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        <CommentList comments={comments} onDelete={handleDeleteComment} />

        {pagination.totalPages > 1 && (
          <CommentsPagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={changePage}
            isLoading={isLoading}
          />
        )}

        <div className="border-t pt-6">
          <CommentForm onSubmit={handleAddComment} />
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-component for pagination
interface CommentsPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => Promise<void>;
  isLoading: boolean;
}

function CommentsPagination({ currentPage, totalPages, onPageChange, isLoading }: CommentsPaginationProps) {
  const pages = generatePageNumbers(currentPage, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(currentPage - 1)}
            aria-disabled={currentPage <= 1 || isLoading}
            className={currentPage <= 1 || isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>

        {pages.map((page, index) => (
          <PaginationItem key={index}>
            {page === "..." ? (
              <span className="px-2">...</span>
            ) : (
              <PaginationLink
                onClick={() => onPageChange(page as number)}
                isActive={currentPage === page}
                className={isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(currentPage + 1)}
            aria-disabled={currentPage >= totalPages || isLoading}
            className={currentPage >= totalPages || isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
