/**
 * Query Utilities
 *
 * Provides helper functions for database query patterns:
 * - Pagination calculations
 * - Offset calculation
 * - Common query patterns
 */

import type { PaginatedResponse, PaginationMetadata } from "@/types";

/**
 * Calculate offset from page and limit
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Offset value for database query
 *
 * @example
 * calculateOffset(1, 10) // returns 0
 * calculateOffset(2, 10) // returns 10
 * calculateOffset(3, 10) // returns 20
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calculate pagination metadata
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Number of items per page
 * @param total - Total number of items
 * @returns PaginationMetadata object with page, limit, total, and totalPages
 *
 * @example
 * calculatePagination(1, 10, 95)
 * // returns { page: 1, limit: 10, total: 95, totalPages: 10 }
 */
export function calculatePagination(page: number, limit: number, total: number): PaginationMetadata {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Create empty paginated response (metadata only)
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Number of items per page
 * @returns PaginationMetadata with zero items
 */
export function emptyPagination(page: number, limit: number): PaginationMetadata {
  return {
    page,
    limit,
    total: 0,
    totalPages: 0,
  };
}

/**
 * Create empty paginated response (full response with data array)
 *
 * @param page - Current page number (1-indexed)
 * @param limit - Number of items per page
 * @returns PaginatedResponse with empty data array
 *
 * @example
 * emptyPaginatedResponse<BriefListItemDto>(1, 10)
 * // { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
 */
export function emptyPaginatedResponse<T>(page: number, limit: number): PaginatedResponse<T> {
  return {
    data: [],
    pagination: emptyPagination(page, limit),
  };
}
