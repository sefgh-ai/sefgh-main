import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ActivityLogger } from "@/lib/activity-logger";
import { logError } from "@/lib/error-tracking";
import { saveSearchHistory } from "@/lib/supabase/search-history";

const CACHE_KEY = "sefgh_search_cache";
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// Helper to get cached search results
function getCachedResults() {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    // Check if cache is expired
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// Helper to save search results to cache
function setCachedResults(data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...data,
        timestamp: Date.now(),
      })
    );
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Custom hook for GitHub repository search with history tracking
 * @param {string} userId - User ID for saving search history to database
 * @returns {Object} result
 * @returns {string} result.searchQuery - Current search query string
 * @returns {Function} result.setSearchQuery - Set search query
 * @returns {Array} result.searchResults - Array of GitHub repository results
 * @returns {boolean} result.loading - Loading state indicator
 * @returns {string} result.language - Selected language filter
 * @returns {Function} result.setLanguage - Set language filter
 * @returns {string} result.sort - Current sort option
 * @returns {Function} result.setSort - Set sort option
 * @returns {string} result.stars - Star count filter
 * @returns {Function} result.setStars - Set stars filter
 * @returns {Function} result.handleSearch - Execute search (async)
 * @returns {Function} result.handleClearFilters - Clear all filters
 */
export function useGitHubSearch(userId) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const hasRestoredCache = useRef(false);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [language, setLanguage] = useState("");
  const [sort, setSort] = useState("all");
  const [stars, setStars] = useState("");
  const [mode, setMode] = useState("scout");
  const [view, setView] = useState("grid");
  const [searchTime, setSearchTime] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Restore cached results on mount
  useEffect(() => {
    if (hasRestoredCache.current) return;
    hasRestoredCache.current = true;

    const cached = getCachedResults();
    if (cached && cached.results?.length > 0) {
      // Only restore if no URL query or URL query matches cached query
      if (!initialQuery || initialQuery === cached.query) {
        setSearchQuery(cached.query || "");
        setSearchResults(cached.results || []);
        setTotalCount(cached.totalCount || 0);
        setSearchTime(cached.searchTime || null);
        setCurrentPage(cached.currentPage || 1);
        setLanguage(cached.language || "");
        setSort(cached.sort || "all");
        setStars(cached.stars || "");
        setView(cached.view || "grid");
        // Mark as auto-searched to prevent duplicate search
        if (initialQuery === cached.query) {
          setHasAutoSearched(true);
        }
      }
    }
  }, [initialQuery]);
  const [advancedFilters, setAdvancedFilters] = useState({
    license: "",
    dateRange: "",
    hasWiki: false,
    hasIssues: false,
    topics: [],
    forks: "",
  });

  const handleSearch = useCallback(
    async (e, queryOverride = null) => {
      e?.preventDefault();

      const query = queryOverride || searchQuery;
      if (!query.trim()) {
        toast.error("Please enter a search query");
        return;
      }

      setLoading(true);
      const startTime = performance.now();
      try {
        const params = new URLSearchParams({
          q: query,
          sort: sort,
        });

        if (language) params.append("language", language);
        if (stars) params.append("stars", stars);

        const response = await fetch(`/api/github/search?${params}`);
        const data = await response.json();
        const endTime = performance.now();
        const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

        if (response.ok) {
          setSearchResults(data.items || []);
          setTotalCount(data.total_count || 0);
          setSearchTime(timeTaken);
          setCurrentPage(1);
          toast.success(`Found ${data.total_count} repositories`);

          // Cache the results
          setCachedResults({
            query,
            results: data.items || [],
            totalCount: data.total_count || 0,
            searchTime: timeTaken,
            currentPage: 1,
            language,
            sort,
            stars,
            view,
          });

          // Log search activity
          ActivityLogger.search(query);

          // Save to search history in database (if user is authenticated)
          if (userId) {
            saveSearchHistory(userId, query.trim(), "search", {
              filters: { language, sort, stars },
              resultsCount: data.total_count || 0,
            });
          }
        } else {
          throw new Error(data.error || "Search failed");
        }
      } catch (error) {
        console.error("Search error:", error);
        logError("search_failed", error, {
          searchQuery: query,
          language,
          sort,
          stars,
        });
        toast.error(error.message || "Failed to search repositories");
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, sort, language, stars, userId]
  );

  // Auto-search when there's an initial query from URL params
  useEffect(() => {
    if (initialQuery && !hasAutoSearched) {
      setHasAutoSearched(true);
      handleSearch();
    }
  }, [initialQuery, hasAutoSearched, handleSearch]);

  const handleClearFilters = useCallback(() => {
    setLanguage("");
    setSort("all");
    setStars("");
    setAdvancedFilters({
      license: "",
      dateRange: "",
      hasWiki: false,
      hasIssues: false,
      topics: [],
      forks: "",
    });
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !searchQuery.trim()) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        sort: sort,
        page: nextPage.toString(),
        per_page: "30",
      });

      if (language) params.append("language", language);
      if (stars) params.append("stars", stars);

      const response = await fetch(`/api/github/search?${params}`);
      const data = await response.json();

      if (response.ok) {
        const newResults = [...searchResults, ...(data.items || [])];
        setSearchResults(newResults);
        setCurrentPage(nextPage);

        // Update cache with new results
        setCachedResults({
          query: searchQuery,
          results: newResults,
          totalCount,
          searchTime,
          currentPage: nextPage,
          language,
          sort,
          stars,
          view,
        });
      } else {
        throw new Error(data.error || "Failed to load more");
      }
    } catch (error) {
      console.error("Load more error:", error);
      toast.error("Failed to load more results");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, searchQuery, sort, language, stars, currentPage]);

  const handlePageChange = useCallback(
    async (page) => {
      if (loadingMore || !searchQuery.trim() || page === currentPage) return;

      setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          sort: sort,
          page: page.toString(),
          per_page: "30",
        });

        if (language) params.append("language", language);
        if (stars) params.append("stars", stars);

        const response = await fetch(`/api/github/search?${params}`);
        const data = await response.json();

        if (response.ok) {
          setSearchResults(data.items || []);
          setTotalCount(data.total_count || 0);
          setCurrentPage(page);

          // Update cache
          setCachedResults({
            query: searchQuery,
            results: data.items || [],
            totalCount: data.total_count || 0,
            searchTime,
            currentPage: page,
            language,
            sort,
            stars,
            view,
          });

          // Scroll to top of results
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          throw new Error(data.error || "Failed to load page");
        }
      } catch (error) {
        console.error("Page change error:", error);
        toast.error("Failed to load page");
      } finally {
        setLoadingMore(false);
      }
    },
    [loadingMore, searchQuery, sort, language, stars, currentPage]
  );

  const hasMore = searchResults.length < totalCount;

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    loading,
    loadingMore,
    language,
    setLanguage,
    sort,
    setSort,
    stars,
    setStars,
    mode,
    setMode,
    view,
    setView,
    advancedFilters,
    setAdvancedFilters,
    handleSearch,
    handleClearFilters,
    handleLoadMore,
    handlePageChange,
    hasMore,
    searchTime,
    totalCount,
    currentPage,
  };
}
