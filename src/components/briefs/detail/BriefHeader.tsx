"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { BriefStatusBadge } from "../shared/BriefStatusBadge";
import { BriefActionButtons } from "./BriefActionButtons";
import { formatDistanceToNow } from "date-fns";
import type { BriefDetailDto } from "@/types";

interface BriefHeaderProps {
  brief: BriefDetailDto;
  onStatusChange?: () => void;
}

export function BriefHeader({ brief, onStatusChange }: BriefHeaderProps) {
  const formattedDate = formatDistanceToNow(new Date(brief.updatedAt), { addSuffix: true });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-2xl font-semibold">{brief.header}</h1>
          <div className="flex items-center gap-2">
            <BriefStatusBadge status={brief.status} />
            <span className="text-sm text-muted-foreground">Updated {formattedDate}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <BriefActionButtons brief={brief} onStatusChange={onStatusChange} />
      </CardContent>
    </Card>
  );
}
