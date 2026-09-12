import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { logError } from "@/lib/error-tracking";

const PAGE_SIZE = 10;

/**
 * Custom hook to fetch and manage projects data from Supabase with real-time updates and pagination
 * @param {string} selectedTab - Currently selected tab (e.g., "latest", "monthly", "yearly")
 * @returns {Object} result
 * @returns {Array} result.allProjects - Array of all project objects
 * @returns {boolean} result.loading - Loading state indicator
 * @returns {boolean} result.loadingMore - Loading more state indicator
 * @returns {boolean} result.hasMore - Whether there are more projects to load
 * @returns {Function} result.loadMore - Function to load more projects
 */
export function useProjects(selectedTab) {
  // Start with empty array and loading state - fetch real data from DB
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Create Supabase client once
  const [supabase] = useState(() => createClient());

  // Build query with filters
  const buildQuery = useCallback(
    (from = 0, limit = PAGE_SIZE) => {
      let query = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply time-based filters
      if (selectedTab === "monthly") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        query = query.gte("created_at", oneMonthAgo.toISOString());
      } else if (selectedTab === "yearly") {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        query = query.gte("created_at", oneYearAgo.toISOString());
      }

      return query.range(from, from + limit - 1);
    },
    [supabase, selectedTab]
  );

  // Load more projects
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const { data, error } = await buildQuery(offset, PAGE_SIZE);

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      if (error) {
        console.error("Error loading more projects:", error);
        logError("projects_load_more_failed", error, { selectedTab, offset });
      } else if (data) {
        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        }
        if (data.length > 0) {
          setAllProjects((prev) => [...prev, ...data]);
          setOffset((prev) => prev + data.length);
        }
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Error loading more projects:", error);
      logError("projects_load_more_failed", error, { selectedTab, offset });
    } finally {
      if (isMountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [buildQuery, loadingMore, hasMore, offset, selectedTab]);

  // Fetch projects from Supabase with real-time subscription
  useEffect(() => {
    let channel;
    isMountedRef.current = true;

    const fetchProjects = async () => {
      try {
        const { data, error } = await buildQuery(0, PAGE_SIZE);

        // Only update state if component is still mounted
        if (!isMountedRef.current) return;

        if (error) {
          console.error("Error fetching projects:", error);
          logError("projects_fetch_failed", error, { selectedTab });
        } else if (data && data.length > 0) {
          setAllProjects(data);
          setOffset(data.length);
          setHasMore(data.length >= PAGE_SIZE);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        console.error("Error fetching projects:", error);
        logError("projects_fetch_failed", error, { selectedTab });
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchProjects();

    // Set up real-time subscription
    channel = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "projects",
        },
        (payload) => {
          if (!isMountedRef.current) return;
          console.log("Real-time project change:", payload);

          if (payload.eventType === "INSERT") {
            // Add new project to the beginning
            setAllProjects((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            // Update existing project
            setAllProjects((prev) =>
              prev.map((project) =>
                project.id === payload.new.id ? payload.new : project
              )
            );
          } else if (payload.eventType === "DELETE") {
            // Remove deleted project
            setAllProjects((prev) =>
              prev.filter((project) => project.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      isMountedRef.current = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, selectedTab, buildQuery]);

  return { allProjects, loading, loadingMore, hasMore, loadMore };
}
