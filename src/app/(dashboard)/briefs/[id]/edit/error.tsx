"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EditBriefError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Edit brief error:", error);
  }, [error]);

  return (
    <div className="container max-w-md py-16">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We couldn&apos;t load this brief for editing. Please try again or go back to the brief.
          </p>

          {process.env.NODE_ENV === "development" && (
            <pre className="text-left text-xs bg-muted p-2 rounded overflow-auto max-h-32">{error.message}</pre>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={reset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/briefs">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Briefs
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
