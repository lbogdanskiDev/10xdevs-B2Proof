"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

export interface BriefPaginationProps {
  currentPage: number;
  totalPages: number;
}

/**
 * Pagination component for brief list.
 * Allows navigation between pages using Previous/Next buttons.
 * Updates URL search params to maintain page state.
 */
export function BriefPagination({ currentPage, totalPages }: BriefPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  function createPageUrl(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    return `${pathname}?${params.toString()}`;
  }

  function handlePreviousPage() {
    if (hasPreviousPage) {
      router.push(createPageUrl(currentPage - 1));
    }
  }

  function handleNextPage() {
    if (hasNextPage) {
      router.push(createPageUrl(currentPage + 1));
    }
  }

  if (totalPages <= 1) {
    return null;
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={hasPreviousPage ? createPageUrl(currentPage - 1) : undefined}
            onClick={(e) => {
              if (!hasPreviousPage) {
                e.preventDefault();
                return;
              }
              e.preventDefault();
              handlePreviousPage();
            }}
            className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>

        <PaginationItem>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
        </PaginationItem>

        <PaginationItem>
          <PaginationNext
            href={hasNextPage ? createPageUrl(currentPage + 1) : undefined}
            onClick={(e) => {
              if (!hasNextPage) {
                e.preventDefault();
                return;
              }
              e.preventDefault();
              handleNextPage();
            }}
            className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
