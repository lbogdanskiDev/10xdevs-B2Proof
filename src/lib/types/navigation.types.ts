import type { LucideIcon } from "lucide-react";
import type { UserProfileDto } from "@/types";

/**
 * Navigation item configuration
 */
export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  creatorOnly?: boolean;
  badge?: React.ReactNode;
}

/**
 * AuthContext value type
 */
export interface AuthContextValue {
  user: UserProfileDto | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

/**
 * Brief count data returned by useBriefCount hook
 */
export interface BriefCountData {
  count: number;
  max: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}
