import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { type ButtonProps, buttonVariants } from "@/components/ui/button";

const paginationStyles = "mx-auto flex w-full justify-center";
const paginationContentStyles = "flex flex-row items-center gap-1";
const paginationPreviousStyles = "gap-1 pl-2.5";
const paginationNextStyles = "gap-1 pr-2.5";
const paginationEllipsisStyles = "flex h-9 w-9 items-center justify-center";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav role="navigation" aria-label="pagination" className={cn(paginationStyles, className)} {...props} />;
}

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => <ul ref={ref} className={cn(paginationContentStyles, className)} {...props} />
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
  size?: ButtonProps["size"];
} & React.ComponentProps<"a">;

function PaginationLink({ className, isActive, size = "icon", children, ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn(paginationPreviousStyles, className)}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>Previous</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn(paginationNextStyles, className)}
      {...props}
    >
      <span>Next</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span aria-hidden className={cn(paginationEllipsisStyles, className)} {...props}>
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
