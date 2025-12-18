"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface CreateBriefErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CreateBriefError({ error, reset }: CreateBriefErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[Create Brief Error]:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-center px-4">
          <h1 className="text-lg font-semibold">Create Brief</h1>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>We encountered an error while loading the brief editor. Please try again.</p>
            {error.message && <p className="font-mono text-sm">Error: {error.message}</p>}
          </AlertDescription>
        </Alert>

        <div className="mt-6 flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <a href="/briefs">Go to Briefs</a>
          </Button>
        </div>
      </main>
    </div>
  );
}
