import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { BriefStatusBadge } from "../shared/BriefStatusBadge";
import { OwnershipBadge } from "../shared/OwnershipBadge";
import { formatRelativeTime } from "@/lib/utils/date";
import type { BriefListItemDto } from "@/types";

export interface BriefCardProps {
  brief: BriefListItemDto;
}

/**
 * Card component displaying a brief summary.
 * The entire card is clickable and navigates to the brief detail page.
 */
export function BriefCard({ brief }: BriefCardProps) {
  return (
    <Link
      href={`/briefs/${brief.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold leading-tight line-clamp-2">{brief.header}</h3>
            <OwnershipBadge isOwned={brief.isOwned} className="shrink-0" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <BriefStatusBadge status={brief.status} />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                <span aria-label={`${brief.commentCount} comments`}>{brief.commentCount}</span>
              </div>
              <time dateTime={brief.updatedAt}>{formatRelativeTime(brief.updatedAt)}</time>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
