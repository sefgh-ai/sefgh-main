"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

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
      let { data, error: fetchError } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      // If no stats exist, create them
      if (fetchError && fetchError.code === "PGRST116") {
        const { data: newData, error: insertError } = await supabase
          .from("user_stats")
          .insert({ user_id: userId })
          .select()
          .single();

        if (!isMountedRef.current) return;

        if (insertError) {
          throw insertError;
        }
        data = newData;
      } else if (fetchError) {
        throw fetchError;
      }

      setStats(data);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("[useUserStats] Error fetching stats:", err);
      setError(err.message);
      // Fallback to default stats
      setStats({
        level: 1,
        title: "Newbie",
        xp: 0,
        xp_to_next_level: 100,
        contributions: 0,
        contributions_max: 64,
        followers: 0,
        following: 0,
        projects: 0,
      });
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

  // Function to update stats
  const updateStats = useCallback(
    async (updates) => {
      if (!userId) return { error: "No user ID" };

      try {
        const { data, error } = await supabase
          .from("user_stats")
          .update(updates)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        if (isMountedRef.current) {
          setStats(data);
        }
        return { data };
      } catch (err) {
        console.error("[useUserStats] Error updating stats:", err);
        return { error: err.message };
      }
    },
    [supabase, userId]
  );

  // Function to increment a specific stat
  const incrementStat = useCallback(
    async (statName, amount = 1) => {
      if (!userId || !stats) return { error: "No user ID or stats" };

      const currentValue = stats[statName] || 0;
      return updateStats({ [statName]: currentValue + amount });
    },
    [userId, stats, updateStats]
  );

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
    updateStats,
    incrementStat,
  };
}
