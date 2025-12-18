"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ProfileErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for profile page.
 * Displays error message and provides a way to retry.
 */
export default function ProfileError({ error, reset }: ProfileErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[Profile Error]:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">An error occurred while loading your profile</p>
      </div>

      {/* Error Alert */}
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>We encountered an error while loading your profile. Please try again.</p>
          {error.message && <p className="font-mono text-sm">Error: {error.message}</p>}
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <a href="/briefs">Go to Briefs</a>
        </Button>
      </div>
    </div>
  );
}
