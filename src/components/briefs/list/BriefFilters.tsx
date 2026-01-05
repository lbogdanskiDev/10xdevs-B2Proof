"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRIEF_STATUS_CONFIG } from "@/lib/constants/brief-status.constants";
import type { UserRole } from "@/types";

export interface BriefFiltersProps {
  userRole: UserRole;
}

/**
 * Filter controls for brief list.
 * - Clients: Shows owned/shared tabs + status filter
 * - Creators: Shows only status filter
 * Updates URL search params to maintain filter state for deep linking.
 */
export function BriefFilters({ userRole }: BriefFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const isCreator = userRole === "creator";
  const currentFilter = searchParams.get("filter") || "owned";
  const currentStatus = searchParams.get("status") || "all";

  function updateSearchParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset to page 1 when filters change
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleFilterChange(value: string) {
    if (value === "owned" || value === "shared") {
      updateSearchParams({ filter: value });
    }
  }

  function handleStatusChange(status: string) {
    updateSearchParams({ status: status === "all" ? null : status });
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {isCreator && (
        <Tabs value={currentFilter} onValueChange={handleFilterChange}>
          <TabsList>
            <TabsTrigger value="owned" aria-controls={undefined}>
              My Briefs
            </TabsTrigger>
            <TabsTrigger value="shared" aria-controls={undefined}>
              Shared with me
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm font-medium">
          Status:
        </label>
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger id="status-filter" className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(BRIEF_STATUS_CONFIG).map(([status, config]) => (
              <SelectItem key={status} value={status}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
