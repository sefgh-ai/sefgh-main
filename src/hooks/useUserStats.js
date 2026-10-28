"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// A new user's stats: the column defaults of public.user_stats.
const DEFAULT_STATS = {
  level: 1,
  title: "Newbie",
  xp: 0,
  xp_to_next_level: 100,
  contributions: 0,
  contributions_max: 64,
  followers: 0,
  following: 0,
  projects: 0,
};

export function useUserStats(userId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Create Supabase client once and store in state
  const [supabase] = useState(() => createClient());
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Try to fetch existing stats
      const { data, error: fetchError } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      // The server creates every user's row and is the only writer (R-103).
      // If one is missing, show the starting values rather than create it.
      if (fetchError && fetchError.code === "PGRST116") {
        setStats(DEFAULT_STATS);
        setError(null);
        return;
      }
      if (fetchError) throw fetchError;

      setStats(data);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("[useUserStats] Error fetching stats:", err);
      setError(err.message);
      // Fallback to default stats
      setStats(DEFAULT_STATS);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [supabase, userId]);

  // Subscribe to real-time updates
  useEffect(() => {
    isMountedRef.current = true;
    fetchStats();

    // Timeout to ensure loading doesn't get stuck
    const loadingTimeout = setTimeout(() => {
      if (isMountedRef.current && loading) {
        console.warn(
          "[useUserStats] Loading timeout - forcing loading to false"
        );
        setLoading(false);
      }
    }, 5000);

    if (!userId) {
      clearTimeout(loadingTimeout);
      return;
    }

    const channel = supabase
      .channel(`user_stats:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_stats",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[useUserStats] Real-time update:", payload);
          if (payload.new && isMountedRef.current) {
            setStats(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      isMountedRef.current = false;
      clearTimeout(loadingTimeout);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId, fetchStats]);

  // Stats are read-only here: the server changes them (R-103).
  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
}
