"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface BriefListErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for brief list page.
 * Displays error message and provides a way to retry.
 */
export default function BriefListError({ error, reset }: BriefListErrorProps) {
  useEffect(() => {
    // Log error to console for debugging
    // eslint-disable-next-line no-console
    console.error("[Brief List Error]:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Briefs</h1>
        <p className="text-muted-foreground">An error occurred while loading briefs</p>
      </div>

      {/* Error Alert */}
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            We encountered an error while loading your briefs. This could be due to a network issue or a server error.
          </p>
          {error.message && <p className="text-sm font-mono">Error: {error.message}</p>}
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <a href="/">Go to home</a>
        </Button>
      </div>
    </div>
  );
}
