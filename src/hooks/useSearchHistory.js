"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSearchHistory,
  getSearchHistoryGrouped,
  deleteSearchHistoryItem,
  clearSearchHistory,
  getSearchHistoryCount,
} from "@/lib/supabase/search-history";

/**
 * Hook to manage search history
 * @param {string} userId - User ID
 * @param {Object} options - Hook options
 * @param {string} options.source - Filter by source ('search', 'chat', or null for all)
 * @param {boolean} options.grouped - Return grouped by date
 * @returns {Object} Search history state and actions
 */
export function useSearchHistory(userId, options = {}) {
  const { source = null, grouped = false } = options;

  const [history, setHistory] = useState(grouped ? {} : []);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, search: 0, chat: 0 });
  const isMountedRef = useRef(true);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!userId) {
      setHistory(grouped ? {} : []);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [historyData, countsData] = await Promise.all([
        grouped
          ? getSearchHistoryGrouped(userId, { source })
          : getSearchHistory(userId, { source }),
        getSearchHistoryCount(userId),
      ]);

      if (isMountedRef.current) {
        setHistory(historyData);
        setCounts(countsData);
      }
    } catch (error) {
      console.error("Error fetching search history:", error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, source, grouped]);

  // Delete single item
  const deleteItem = useCallback(
    async (historyId) => {
      const success = await deleteSearchHistoryItem(historyId);
      if (success) {
        fetchHistory();
      }
      return success;
    },
    [fetchHistory]
  );

  // Clear all history
  const clearAll = useCallback(
    async (sourceFilter = null) => {
      const success = await clearSearchHistory(userId, sourceFilter);
      if (success) {
        fetchHistory();
      }
      return success;
    },
    [userId, fetchHistory]
  );

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    fetchHistory();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchHistory]);

  return {
    history,
    loading,
    counts,
    refresh: fetchHistory,
    deleteItem,
    clearAll,
  };
}
