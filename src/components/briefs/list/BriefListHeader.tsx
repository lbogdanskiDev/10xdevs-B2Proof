import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { UserRole } from "@/types";
import { MAX_BRIEFS_PER_USER } from "@/lib/constants/brief-status.constants";

export interface BriefListHeaderProps {
  userRole: UserRole;
  briefCount?: number;
}

/**
 * Header for the brief list page.
 * - Shows page title
 * - For creators: displays "Create Brief" button (disabled when limit reached)
 * - For clients: no action button
 */
export function BriefListHeader({ userRole, briefCount = 0 }: BriefListHeaderProps) {
  const isCreator = userRole === "creator";
  const isLimitReached = briefCount >= MAX_BRIEFS_PER_USER;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Briefs</h1>
        <p className="text-muted-foreground">
          {isCreator ? "Manage and track your briefs" : "View and respond to briefs shared with you"}
        </p>
      </div>

      {isCreator && (
        <Button asChild disabled={isLimitReached} data-test-id="create-brief-button">
          {isLimitReached ? (
            <span className="opacity-50">
              <Plus className="mr-2 h-4 w-4" />
              Create Brief
            </span>
          ) : (
            <Link href="/briefs/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Brief
            </Link>
          )}
        </Button>
      )}
    </div>
  );
}
