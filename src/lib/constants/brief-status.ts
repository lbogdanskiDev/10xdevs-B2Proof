import { FileEdit, Send, CheckCircle2, XCircle, AlertCircle, type LucideIcon } from "lucide-react";
import type { BriefStatus } from "@/types";

/**
 * Badge variant type including custom success and warning variants
 */
export type StatusBadgeVariant = "secondary" | "default" | "success" | "destructive" | "warning";

/**
 * Configuration for status badge display
 */
export interface StatusBadgeConfig {
  variant: StatusBadgeVariant;
  icon: LucideIcon;
  label: string;
}

/**
 * Map of brief status to badge configuration
 */
export type StatusConfigMap = Record<BriefStatus, StatusBadgeConfig>;

/**
 * Status configuration for BriefStatusBadge component
 */
export const BRIEF_STATUS_CONFIG: StatusConfigMap = {
  draft: {
    variant: "secondary",
    icon: FileEdit,
    label: "Draft",
  },
  sent: {
    variant: "default",
    icon: Send,
    label: "Sent",
  },
  accepted: {
    variant: "success",
    icon: CheckCircle2,
    label: "Accepted",
  },
  rejected: {
    variant: "destructive",
    icon: XCircle,
    label: "Rejected",
  },
  needs_modification: {
    variant: "warning",
    icon: AlertCircle,
    label: "Needs Modification",
  },
};

/**
 * Maximum number of briefs a creator can have
 */
export const MAX_BRIEFS_PER_USER = 20;

/**
 * Threshold at which to show the brief limit warning
 */
export const BRIEF_LIMIT_WARNING_THRESHOLD = 18;

/**
 * Number of briefs to display per page
 */
export const BRIEFS_PER_PAGE = 10;
