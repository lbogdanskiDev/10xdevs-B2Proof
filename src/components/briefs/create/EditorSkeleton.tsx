import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  return (
    <div className="space-y-3">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
        <div className="mx-2 h-6 w-px bg-border" />
        <Skeleton className="h-8 w-32" />
        <div className="mx-2 h-6 w-px bg-border" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* Editor content skeleton */}
      <div className="min-h-[300px] rounded-md border p-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>

      {/* Character counter skeleton */}
      <div className="flex justify-end">
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
