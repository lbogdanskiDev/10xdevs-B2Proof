import { FileText, Plus, User } from "lucide-react";
import type { NavigationItem } from "@/lib/types/navigation.types";

/** Maximum number of briefs per user */
export const MAX_BRIEFS_PER_USER = 20;

/** Threshold for warning about approaching limit */
export const BRIEF_LIMIT_WARNING_THRESHOLD = 18;

/** Desktop sidebar breakpoint in pixels */
export const DESKTOP_BREAKPOINT = 1024;

/** Mobile breakpoint in pixels */
export const MOBILE_BREAKPOINT = 640;

/**
 * Get navigation items for the current user
 * @param briefCount - Current number of briefs
 * @param maxBriefs - Maximum allowed briefs
 * @returns Array of navigation items
 */
export function getNavigationItems(briefCount: number, maxBriefs: number): NavigationItem[] {
  return [
    {
      name: "Briefs",
      href: "/briefs",
      icon: FileText,
    },
    {
      name: "New Brief",
      href: "/briefs/new",
      icon: Plus,
      creatorOnly: true,
      disabled: briefCount >= maxBriefs,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
    },
  ];
}
