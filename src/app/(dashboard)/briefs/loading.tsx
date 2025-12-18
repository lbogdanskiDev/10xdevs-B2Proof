import { BriefListSkeleton } from "@/components/briefs";

/**
 * Loading UI for brief list page.
 * Automatically displayed by Next.js while the page is loading.
 */
export default function BriefListLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-9 w-32 animate-pulse rounded-md bg-primary/10" />
          <div className="h-5 w-64 animate-pulse rounded-md bg-primary/10" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-md bg-primary/10" />
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-9 w-64 animate-pulse rounded-md bg-primary/10" />
        <div className="h-9 w-48 animate-pulse rounded-md bg-primary/10" />
      </div>

      {/* Brief list skeleton */}
      <BriefListSkeleton />
    </div>
  );
}
