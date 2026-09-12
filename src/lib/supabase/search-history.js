/**
 * Search History Helper Functions
 *
 * Manages search history stored in Supabase
 * Supports searches from both search page and AI chat
 */

import { createClient } from "@/lib/supabase/client";

// Module-level client - created once and reused
const supabase = createClient();

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

  const { data, error } = await supabase
    .from("search_history")
    .insert({
      user_id: userId,
      query: query.trim(),
      source,
      filters,
      results_count: resultsCount,
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving search history:", error);
    return null;
  }

  // Increment total searches count in platform_stats (fire and forget)
  try {
    supabase.rpc("increment_platform_stat", { key: "total_searches" });
  } catch {
    // Silently ignore errors - stats update is not critical
  }

  return data;
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

  let query = supabase
    .from("search_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (source) {
    query = query.eq("source", source);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching search history:", error);
    return [];
  }

  return data || [];
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
    const date = new Date(item.created_at).toLocaleDateString("en-US", {
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
  const { error } = await supabase
    .from("search_history")
    .delete()
    .eq("id", historyId);

  if (error) {
    console.error("Error deleting search history item:", error);
    return false;
  }

  return true;
}

/**
 * Clear all search history for a user
 * @param {string} userId - User ID
 * @param {string} source - Optional: clear only specific source ('search' or 'chat')
 * @returns {Promise<boolean>} - Success status
 */
export async function clearSearchHistory(userId, source = null) {
  let query = supabase.from("search_history").delete().eq("user_id", userId);

  if (source) {
    query = query.eq("source", source);
  }

  const { error } = await query;

  if (error) {
    console.error("Error clearing search history:", error);
    return false;
  }

  return true;
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

  const { data, error } = await supabase
    .from("search_history")
    .select("source")
    .eq("user_id", userId);

  if (error) {
    console.error("Error getting search history count:", error);
    return { total: 0, search: 0, chat: 0 };
  }

  return {
    total: data.length,
    search: data.filter((item) => item.source === "search").length,
    chat: data.filter((item) => item.source === "chat").length,
  };
}
