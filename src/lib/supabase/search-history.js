/**
 * Search History Helper Functions
 *
 * Manages search history stored in Supabase
 * Supports searches from both search page and AI chat
 */

import { askGo } from "@/lib/go-data";

// Each function asks the Go endpoints (DATA-001b), which answer exactly what
// the function returns; the argument checks stay here. The direct database
// path was retired in P7-08a. contracts/search-history pins the calls.
const noCounts = () => ({ total: 0, search: 0, chat: 0 });

/**
 * Save a search query to history
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {string} source - Source of search ('search' or 'chat')
 * @param {Object} options - Additional options
 * @param {Object} options.filters - Applied filters (language, stars, etc.)
 * @param {number} options.resultsCount - Number of results returned
 * @returns {Promise<Object>} - Created search history record
 */
export async function saveSearchHistory(userId, query, source, options = {}) {
  if (!userId || !query?.trim()) {
    return null;
  }

  const { filters = {}, resultsCount = 0 } = options;

  // Go also counts the saved search in platform_stats (R-102).
  return askGo(
    "/api/search-history",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: userId, query: query.trim(), source, filters, resultsCount }),
    },
    null
  );
}

/**
 * Get user's search history
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max results to return (default 50)
 * @param {number} options.offset - Offset for pagination (default 0)
 * @param {string} options.source - Filter by source ('search', 'chat', or null for all)
 * @returns {Promise<Array>} - Array of search history records
 */
export async function getSearchHistory(userId, options = {}) {
  if (!userId) {
    return [];
  }

  const { limit = 50, offset = 0, source = null } = options;

  // The page as .range(offset, offset + limit - 1) wrote it.
  const to = offset + limit - 1;
  const params = new URLSearchParams({ user: userId, offset: `${offset}`, limit: `${to - offset + 1}` });
  if (source) params.set("source", source);
  return askGo(`/api/search-history?${params}`, {}, []);
}

/**
 * Get search history grouped by date
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Search history grouped by date
 */
export async function getSearchHistoryGrouped(userId, options = {}) {
  const history = await getSearchHistory(userId, options);

  // Group by date
  const grouped = history.reduce((acc, item) => {
    const date = new Date(item.created_at).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});

  return grouped;
}

/**
 * Delete a single search history item
 * @param {string} historyId - Search history ID
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteSearchHistoryItem(historyId) {
  return askGo(`/api/search-history/${encodeURIComponent(`${historyId}`)}`, { method: "DELETE" }, false);
}

/**
 * Clear all search history for a user
 * @param {string} userId - User ID
 * @param {string} source - Optional: clear only specific source ('search' or 'chat')
 * @returns {Promise<boolean>} - Success status
 */
export async function clearSearchHistory(userId, source = null) {
  // Go deletes only when this id is the caller's, as row-level security does.
  const params = new URLSearchParams({ user: `${userId}` });
  if (source) params.set("source", source);
  return askGo(`/api/search-history?${params}`, { method: "DELETE" }, false);
}

/**
 * Get search history count
 * @param {string} userId - User ID
 * @param {string} source - Optional: count only specific source
 * @returns {Promise<Object>} - Count object with total, search, and chat counts
 */
export async function getSearchHistoryCount(userId) {
  if (!userId) {
    return { total: 0, search: 0, chat: 0 };
  }

  return askGo(`/api/search-history/count?${new URLSearchParams({ user: userId })}`, {}, noCounts());
}
