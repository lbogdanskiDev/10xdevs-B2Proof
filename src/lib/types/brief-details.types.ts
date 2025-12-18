import type { CommentDto, BriefRecipientDto, PaginationMetadata, BriefStatus } from "@/types";

/**
 * ViewModel for comments section with state management
 */
export interface CommentsViewModel {
  comments: CommentDto[];
  pagination: PaginationMetadata;
  isLoading: boolean;
  error: string | null;
}

/**
 * ViewModel for recipients section with state management
 */
export interface RecipientsViewModel {
  recipients: BriefRecipientDto[];
  isLoading: boolean;
  error: string | null;
  canAddMore: boolean; // current count < 10
}

/**
 * Props for brief status actions
 */
export interface BriefStatusActionResult {
  success: boolean;
  error?: string;
  newStatus?: BriefStatus;
}

/**
 * Polling configuration for comments
 */
export interface CommentPollingConfig {
  enabled: boolean;
  intervalMs: number; // default: 30000 (30s)
}
