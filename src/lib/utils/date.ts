/**
 * Formats a date string to a relative time format.
 *
 * @param dateString - ISO date string to format
 * @returns Formatted relative time string (e.g., "just now", "5 minutes ago", "2 hours ago", "3 days ago", "Jan 15")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Less than 1 minute
  if (diffInSeconds < 60) {
    return "just now";
  }

  // Less than 1 hour
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? "1 minute ago" : `${diffInMinutes} minutes ago`;
  }

  // Less than 24 hours
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  }

  // Less than 7 days
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  }

  // More than 7 days - show formatted date
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const currentYear = now.getFullYear();
  const dateYear = date.getFullYear();

  // Include year if different from current year
  if (dateYear !== currentYear) {
    return `${month} ${day}, ${dateYear}`;
  }

  return `${month} ${day}`;
}
