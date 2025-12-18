import { BriefCard } from "./BriefCard";
import type { BriefListItemDto } from "@/types";

export interface BriefListProps {
  briefs: BriefListItemDto[];
}

/**
 * Displays a responsive grid of brief cards.
 * Grid layout: 1 column on mobile, 2 columns on md, 3 columns on lg.
 */
export function BriefList({ briefs }: BriefListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {briefs.map((brief) => (
        <BriefCard key={brief.id} brief={brief} />
      ))}
    </div>
  );
}
