/**
 * Generate page numbers with ellipsis for pagination display.
 * Shows first/last pages and pages around the current page.
 *
 * @param current - Current page number (1-indexed)
 * @param total - Total number of pages
 * @returns Array of page numbers and "..." placeholders
 *
 * @example
 * generatePageNumbers(1, 10) // [1, 2, 3, 4, "...", 10]
 * generatePageNumbers(5, 10) // [1, "...", 4, 5, 6, "...", 10]
 * generatePageNumbers(10, 10) // [1, "...", 7, 8, 9, 10]
 */
export function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, "...", total];
  }

  if (current >= total - 2) {
    return [1, "...", total - 3, total - 2, total - 1, total];
  }

  return [1, "...", current - 1, current, current + 1, "...", total];
}
