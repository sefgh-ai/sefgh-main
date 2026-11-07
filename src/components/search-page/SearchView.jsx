"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import { useGitHubSearch } from "@/hooks/search/useGitHubSearch";
import { useStoredChoice } from "@/hooks/home/useStoredChoice";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/utils/formatters";
import HomeShell from "@/components/home/HomeShell";
import SearchBar from "./SearchBar";
import { SearchFilterChips, UnderstoodAs } from "./SearchFilterChips";
import SearchResultsViews, { ViewSwitch } from "./SearchResultsViews";
import RepoPreviewDrawer from "./RepoPreviewDrawer";
import styles from "@/components/home/home.module.css";

const EXAMPLES = [
  ["Web", "a full-stack Next.js boilerplate with auth", "#58a6ff"],
  ["AI & ML", "a local LLM runner with a REST API", "#a371f7"],
  ["Graphics", "a 3D rendering engine in Rust", "#3fb950"],
  ["Data", "a real-time data visualization library", "#ffa657"],
  ["Mobile", "a lightweight mobile OS in Swift", "#f778ba"],
  ["Games", "a game engine built with C++ and Lua", "#58a6ff"],
];

// Platform numbers, from the same platform_stats table the old banner read.
function usePlatformStats() {
  const [supabase] = useState(() => createClient());
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    supabase
      .from("platform_stats")
      .select("stat_key, stat_value")
      .then(({ data, error }) => {
        if (!alive || error || !data) return;
        setStats(Object.fromEntries(data.map((r) => [r.stat_key, r.stat_value])));
      });
    return () => {
      alive = false;
    };
  }, [supabase]);
  return stats;
}

/**
 * Search (/search), redesigned in SEARCH-001 on the approved "Commit"
 * direction, inside Home's rail. The search itself is unchanged
 * (useGitHubSearch: /api/github/search, filters, pages, history, cache).
 * New: filter chips re-run the current search when changed, results switch
 * between Rows / Cards / Table (remembered), and a result opens a drawer.
 */
export default function SearchView({ fontClassName = "" }) {
  const { user } = useAuth();
  const s = useGitHubSearch(user?.id);
  const stats = usePlatformStats();
  const [storedView, setStoredView] = useStoredChoice("sefgh.searchView");
  const view = storedView === "cards" || storedView === "table" ? storedView : "rows";
  const [selected, setSelected] = useState(null);

  const hasResults = s.searchResults.length > 0;
  // A search has run (or was restored from the cache) once it has a time.
  const searched = hasResults || s.searchTime != null;

  // A filter the user changes re-runs the current search (the old navbar
  // needed a new search to apply it). Only user changes count: filters the
  // hook restores from its cache must not trigger another request.
  const filterKey = JSON.stringify([s.language, s.stars, s.sort, s.advancedFilters.license, s.advancedFilters.dateRange]);
  const userChangedFilter = useRef(false);
  const byUser = (set) => (v) => {
    userChangedFilter.current = true;
    set(v);
  };
  const { handleSearch, searchQuery } = s;
  useEffect(() => {
    if (!userChangedFilter.current) return;
    userChangedFilter.current = false;
    if (searched && searchQuery.trim()) handleSearch(null, searchQuery);
    // Only a filter change should re-run; typing in the bar must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const runSearch = (text) => {
    if (!text?.trim()) return;
    handleSearch(null, text);
  };

  return (
    <div className={`dark min-h-screen shrink-0 ${styles.root} ${fontClassName}`}>
      <HomeShell user={user} showSearch={false} title="Search">
        <div className="mx-auto w-full max-w-[1100px] px-4 pb-28 pt-7 sm:px-8 md:pb-12">
          {!hasResults && !s.loading && (
            <>
              <p className={styles.eyebrow}>Search</p>
              <h1 className={`mb-5 mt-2.5 text-[28px] font-bold tracking-[-0.035em] sm:text-4xl ${styles.display}`}>Find a repository</h1>
            </>
          )}

          <SearchBar
            query={s.searchQuery}
            setQuery={s.setSearchQuery}
            onSearch={runSearch}
            loading={s.loading}
            mode={s.mode}
            setMode={s.setMode}
            autoFocus={!hasResults}
          />

          {(hasResults || s.loading || searched) && (
            <div className="mt-4 flex flex-col gap-3.5">
              <SearchFilterChips
                language={s.language}
                setLanguage={byUser(s.setLanguage)}
                stars={s.stars}
                setStars={byUser(s.setStars)}
                sort={s.sort}
                setSort={byUser(s.setSort)}
                advancedFilters={s.advancedFilters}
                setAdvancedFilters={byUser(s.setAdvancedFilters)}
                onClear={() => {
                  userChangedFilter.current = true;
                  s.handleClearFilters();
                }}
              />
              {hasResults && <UnderstoodAs query={s.searchQuery} />}
            </div>
          )}

          {hasResults || s.loading ? (
            <>
              <div className="mb-3 mt-4 flex items-center gap-3">
                <p className={`text-[13px] text-[var(--l-muted)] ${styles.mono}`} aria-live="polite">
                  {s.loading ? (
                    "Searching…"
                  ) : (
                    <>
                      <b className="font-semibold text-[var(--l-ink)]">{formatNumber(s.totalCount)}</b> repositories
                      {s.searchTime ? ` · ${s.searchTime}s` : ""}
                    </>
                  )}
                </p>
                <span className="ml-auto">
                  <ViewSwitch view={view} onChange={setStoredView} />
                </span>
              </div>
              <SearchResultsViews
                view={view}
                repos={s.searchResults}
                loading={s.loading}
                totalCount={s.totalCount}
                currentPage={s.currentPage}
                onPageChange={s.handlePageChange}
                onOpen={setSelected}
              />
            </>
          ) : searched ? (
            <div className="py-16 text-center">
              <p className={`text-base font-bold ${styles.display}`}>No repositories found</p>
              <p className="mt-1.5 text-sm text-[var(--l-muted)]">Try other words, or clear the filters.</p>
            </div>
          ) : (
            <>
              <div className="mb-8 mt-6 flex gap-9">
                {[
                  ["repos_indexed", "repos indexed"],
                  ["total_searches", "searches run"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <b className={`block text-[22px] font-bold leading-none ${styles.display}`}>
                      {stats && stats[key] != null ? formatNumber(stats[key]) : "—"}
                    </b>
                    <span className={`text-xs text-[var(--l-muted)] ${styles.mono}`}>{label}</span>
                  </div>
                ))}
              </div>
              <p className={`${styles.eyebrow} mb-3`}>Try a search</p>
              <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {EXAMPLES.map(([topic, q, color]) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => {
                        s.setSearchQuery(q);
                        runSearch(q);
                      }}
                      className={`${styles.card} ${styles.row} h-full w-full p-[18px] text-left ${styles.focusRing}`}
                    >
                      <span className={`mb-2.5 block text-xs ${styles.mono}`} style={{ color }}>
                        # {topic}
                      </span>
                      <span className={`text-[15px] leading-snug ${styles.mono}`}>
                        <span className="text-[var(--l-green)]">❯</span> {q}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </HomeShell>

      <MobileBottomNav user={user} />
      <RepoPreviewDrawer repo={selected} onClose={() => setSelected(null)} fontClassName={fontClassName} />
    </div>
  );
}
