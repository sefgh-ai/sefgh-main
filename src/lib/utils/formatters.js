/**
 * Format a timestamp into a human-readable relative time string
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted time string (e.g., "2m ago", "3h ago", "5d ago")
 */
export function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format a date into a readable string
 * @param {string|Date} date - The date to format
 * @param {Object} [options] - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
}

// Every number the app shows uses Indian grouping, the owner's choice of
// 2026-10-14 (bug register R-053). The locale is written out, never left to
// the machine: a server in India and a browser elsewhere used to disagree
// ("1,20,000" against "120,000"), and React then discarded the server's HTML.
const indian = new Intl.NumberFormat("en-IN");

/**
 * A number in full, with Indian grouping: 120000 → "1,20,000".
 * Anything that is not a finite number shows as "0".
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  const n = Number(num);
  return Number.isFinite(n) ? indian.format(n) : "0";
}

/**
 * A number in short form, in Indian units: thousand (K), lakh (L), crore
 * (Cr). 1234 → "1.2K", 120000 → "1.2L", 12345678 → "1.2Cr".
 *
 * Written out rather than left to Intl's compact notation, which for en-IN
 * writes thousands as "T" (easily read as trillion) and depends on the ICU
 * version, which can differ between the server and the browser. One decimal,
 * cut rather than rounded, so 99,999 is "99.9K" and never "100K".
 * @param {number} num - The number to format
 * @returns {string} Compact formatted number string
 */
export function formatCompactNumber(num) {
  const n = Number(num);
  if (!Number.isFinite(n)) return "0";
  for (const [size, unit] of [[1e7, "Cr"], [1e5, "L"], [1e3, "K"]]) {
    if (Math.abs(n) >= size) {
      const scaled = Math.trunc((n / size) * 10) / 10;
      return `${indian.format(scaled)}${unit}`;
    }
  }
  return indian.format(Math.trunc(n));
}

/**
 * Truncate a string to a maximum length
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string with ellipsis if needed
 */
export function truncateString(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
