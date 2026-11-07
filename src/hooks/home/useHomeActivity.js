"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSearchHistory, getSearchHistoryCount } from "@/lib/supabase/search-history";
import { fetchWithSession } from "@/lib/supabase/session-fetch";

// Everything Home's header and profile card show about the user (HOME-001),
// all from data SEFGH already stores:
// - searches: total from the history count; per-day activity and the recent
//   list from the newest saved searches (up to ACTIVITY_LIMIT rows);
// - starred: the length of the user's starred list (/api/repo/starred);
// - new this week: projects created in the last 7 days that match the user's
//   topic preferences (all projects when none are set).
// Any part that fails stays null, and the UI shows "—" for it.

const ACTIVITY_LIMIT = 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function matchesPreferences(project, preferences) {
  const names = (preferences?.tags || []).map((t) => t.name);
  if (names.length === 0) return true;
  const own = [project.category, ...(project.tags || []), project.language].filter(Boolean);
  return preferences.mode === "AND" ? names.every((n) => own.includes(n)) : names.some((n) => own.includes(n));
}

export function useHomeActivity(userId, preferences) {
  const [supabase] = useState(() => createClient());
  const [history, setHistory] = useState(null);
  const [searchTotal, setSearchTotal] = useState(null);
  const [starred, setStarred] = useState(null);
  const [recentProjects, setRecentProjects] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!userId) return undefined;
    getSearchHistory(userId, { limit: ACTIVITY_LIMIT })
      .then((rows) => alive && setHistory(Array.isArray(rows) ? rows : []))
      .catch(() => alive && setHistory([]));
    getSearchHistoryCount(userId)
      .then((c) => alive && setSearchTotal(typeof c?.search === "number" ? c.search : null))
      .catch(() => {});
    fetchWithSession("/api/repo/starred")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setStarred(Array.isArray(d?.repos) ? d.repos.length : null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  useEffect(() => {
    let alive = true;
    const since = new Date(Date.now() - WEEK_MS).toISOString();
    supabase
      .from("projects")
      .select("category,tags,language")
      .gte("created_at", since)
      .then(({ data, error }) => alive && setRecentProjects(error ? null : data || []));
    return () => {
      alive = false;
    };
  }, [supabase]);

  const newThisWeek = useMemo(
    () => (recentProjects ? recentProjects.filter((p) => matchesPreferences(p, preferences)).length : null),
    [recentProjects, preferences]
  );

  // Searches per local day: { "2026-11-07": 3, ... }
  const perDay = useMemo(() => {
    const out = {};
    for (const row of history || []) {
      if (!row?.created_at) continue;
      const d = new Date(row.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out[key] = (out[key] || 0) + 1;
    }
    return out;
  }, [history]);

  const recentSearches = useMemo(
    () => (history || []).filter((r) => r.source !== "chat" && r.query).slice(0, 3),
    [history]
  );

  return {
    loading: Boolean(userId) && history === null,
    searchTotal,
    starred,
    newThisWeek,
    perDay,
    recentSearches,
  };
}
