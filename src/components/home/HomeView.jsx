"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PreferencesDialog } from "@/components/PreferencesDialog";
import AutoOnboarding from "@/components/AutoOnboarding";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import { useProjects } from "@/hooks/home/useProjects";
import { useFilteredProjects } from "@/hooks/home/useFilteredProjects";
import { useHomeActivity } from "@/hooks/home/useHomeActivity";
import { useStoredChoice } from "@/hooks/home/useStoredChoice";
import { getInitialPreferences, clearSavedPreferences } from "@/lib/utils/home/preferencesHelper";
import HomeShell, { TABS } from "./HomeShell";
import HomeWelcome from "./HomeWelcome";
import HomeTopics from "./HomeTopics";
import HomeProjectTable from "./HomeProjectTable";
import HomeProfile from "./HomeProfile";
import styles from "./home.module.css";

/**
 * Home (/home), redesigned in HOME-001 on the approved "Commit" direction:
 * icon rail expandable to a sidebar, a welcome header with the Continue /
 * Sharpen card, a topic column, the dense project table, and the profile rail.
 * The data and behaviour are the old page's (projects per time tab, topic and
 * preference filtering, preferences dialog, onboarding); only the layout and
 * look change, plus the activity numbers and the recently opened repositories.
 */
export default function HomeView({ fontClassName = "" }) {
  const { user, loading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTab, setSelectedTab] = useState("latest");
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState(getInitialPreferences);

  const { allProjects, loading, loadingMore, hasMore, loadMore } = useProjects(selectedTab);
  const projects = useFilteredProjects(allProjects, selectedCategory, userPreferences);
  const activity = useHomeActivity(user?.id, userPreferences);
  const [sidebarChoice] = useStoredChoice("sefgh.homeSidebar");
  const sidebarExpanded = sidebarChoice === "expanded";

  const handlePreferencesSave = useCallback((preferences) => {
    setUserPreferences(preferences);
    setSelectedCategory("All");
    if (typeof window !== "undefined") {
      localStorage.setItem("projectPreferences", JSON.stringify(preferences));
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory("All");
    setUserPreferences({ tags: [], mode: "OR" });
    clearSavedPreferences();
  }, []);

  const openPreferences = () => setPreferencesOpen(true);
  const filtered = selectedCategory !== "All" || userPreferences.tags.length > 0;

  return (
    // `dark` scopes the site's shadcn tokens (dialogs, notification bell) to dark.
    <div className={`dark min-h-screen shrink-0 ${styles.root} ${fontClassName}`}>
      <HomeShell user={user} tab={selectedTab} onTabChange={setSelectedTab}>
        <AutoOnboarding />
        <HomeWelcome
          user={user}
          activity={activity}
          topicCount={userPreferences.tags.length}
          onAddTopics={openPreferences}
        />

        {/* Time tabs for small screens; the top bar carries them from sm up. */}
        <div className="flex gap-1 px-4 pt-4 sm:hidden" role="tablist" aria-label="Time range">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={selectedTab === t.value}
              onClick={() => setSelectedTab(t.value)}
              className={`${styles.tab} ${selectedTab === t.value ? styles.tabOn : ""} ${styles.focusRing}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Three columns need room: with the 232px sidebar open, the profile
            column waits for 2xl so the table keeps its five columns readable. */}
        <div
          className={`grid items-start gap-6 px-4 pb-28 pt-5 sm:px-8 md:pb-10 lg:grid-cols-[190px_minmax(0,1fr)] ${
            sidebarExpanded ? "2xl:grid-cols-[190px_minmax(0,1fr)_320px]" : "xl:grid-cols-[190px_minmax(0,1fr)_320px]"
          }`}
        >
          <HomeTopics
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            userPreferences={userPreferences}
            onOpenPreferences={openPreferences}
          />
          <HomeProjectTable
            projects={projects}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={loadMore}
            filtered={filtered}
            onClearFilters={handleClearFilters}
          />
          <div className={`lg:col-span-2 ${sidebarExpanded ? "2xl:col-span-1" : "xl:col-span-1"}`}>
            <HomeProfile user={user} authLoading={authLoading} perDay={activity.perDay} />
          </div>
        </div>
      </HomeShell>

      <MobileBottomNav user={user} />
      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} onSave={handlePreferencesSave} />
    </div>
  );
}
