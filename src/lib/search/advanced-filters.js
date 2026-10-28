// The navbar's advanced filters that the search API sends on to GitHub
// (bug register R-017): license, the creation date range, topics and forks.
// The wiki and issues options stay in the navbar, for later: GitHub's
// repository search has no qualifier for them.

const RANGE_DAYS = { day: 1, week: 7, month: 30, year: 365 };
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Appends the supported filters to a search's URLSearchParams.
 *
 * A date range becomes `created=>=YYYY-MM-DD` from the browser's clock, so
 * the server needs none. GitHub reads `>` on a date as "after that whole
 * day", so `>=` is used: the range may include one extra day, never one
 * fewer.
 */
export function appendAdvancedFilters(params, filters = {}, now = new Date()) {
  if (filters.license) params.append("license", filters.license);
  const days = RANGE_DAYS[filters.dateRange];
  if (days) {
    const since = new Date(now.getTime() - days * DAY_MS);
    params.append("created", ">=" + since.toISOString().slice(0, 10));
  }
  const topics = (filters.topics || []).filter(Boolean);
  if (topics.length > 0) params.append("topic", topics.join(","));
  if (filters.forks) params.append("forks", filters.forks);
  return params;
}
