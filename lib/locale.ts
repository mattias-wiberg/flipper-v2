export function formatNumber(x: number) {
  return x.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Formats a time delta (in milliseconds) as a human-readable string.
 * Examples: "just now", "5m ago", "2h ago", "3d ago", "Aug 5, 2025"
 */
export function formatTimeDelta(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  // Otherwise, show the date
  const date = new Date(Date.now() - ms);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
