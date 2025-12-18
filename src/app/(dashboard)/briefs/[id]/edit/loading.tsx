import { Skeleton } from "@/components/ui/skeleton";

export default function EditBriefLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-9 w-16" />
        </div>
      </header>

      {/* Content skeleton */}
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6">
        {/* Header field skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-9 w-full" />
        </div>

        {/* Editor skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="rounded-md border">
            <div className="flex items-center gap-2 border-b bg-muted/50 p-2">
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
            <div className="min-h-[300px] p-4">
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer field skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </main>
    </div>
  );
}
