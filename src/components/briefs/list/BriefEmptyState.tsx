import Link from "next/link";
import { FileText, Share2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export type EmptyStateVariant = "no-briefs-creator" | "no-briefs-client" | "no-results";

export interface BriefEmptyStateProps {
  variant: EmptyStateVariant;
}

/**
 * Displays an empty state message with appropriate icon and action.
 * Three variants:
 * - no-briefs-creator: For creators who haven't created any briefs yet
 * - no-briefs-client: For clients who don't have any shared briefs
 * - no-results: When filters return no results
 */
export function BriefEmptyState({ variant }: BriefEmptyStateProps) {
  const configs = {
    "no-briefs-creator": {
      icon: FileText,
      title: "No briefs yet",
      description: "Create your first brief to get started with the B2Proof platform.",
      action: (
        <Button asChild>
          <Link href="/briefs/new">Create your first brief</Link>
        </Button>
      ),
    },
    "no-briefs-client": {
      icon: Share2,
      title: "No shared briefs",
      description: "You don't have any briefs shared with you yet. Check back later for updates.",
      action: null,
    },
    "no-results": {
      icon: Filter,
      title: "No briefs found",
      description: "No briefs match your current filters. Try adjusting your filters to see more results.",
      action: null,
    },
  };

  const config = configs[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{config.title}</h3>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">{config.description}</p>
      {config.action}
    </div>
  );
}
