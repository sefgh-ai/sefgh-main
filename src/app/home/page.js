"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SearchNavbar } from "@/components/search/SearchNavbar";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import { PreferencesDialog } from "@/components/PreferencesDialog";
import AutoOnboarding from "@/components/AutoOnboarding";
import Footer from "@/components/Footer";
import {
  TopicsNav,
  ProjectsFeed,
  UserProfileCard,
  AboutCard,
} from "@/components/home";
import { useProjects } from "@/hooks/home/useProjects";
import { useFilteredProjects } from "@/hooks/home/useFilteredProjects";
import {
  getInitialPreferences,
  clearSavedPreferences,
} from "@/lib/utils/home/preferencesHelper";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTab, setSelectedTab] = useState("latest");
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState(getInitialPreferences);

  const { allProjects, loading, loadingMore, hasMore, loadMore } =
    useProjects(selectedTab);
  const projects = useFilteredProjects(
    allProjects,
    selectedCategory,
    userPreferences
  );

  const handlePreferencesSave = useCallback((preferences) => {
    setUserPreferences(preferences);
    setSelectedCategory("All");
    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("projectPreferences", JSON.stringify(preferences));
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory("All");
    setUserPreferences({ tags: [], mode: "OR" });
    clearSavedPreferences();
  }, []);

  return (
    <SidebarProvider>
      <div className="flex h-full w-full bg-background gradient-mesh flex-col overflow-hidden">
        {/* Main content area with sidebar */}
        <div className="flex flex-1 min-h-0 p-1 sm:p-4 gap-1 sm:gap-4 pb-[72px] md:pb-2">
          <SearchSidebar user={user} />

          <SidebarInset className="flex flex-col glass-premium rounded-lg sm:rounded-2xl shadow-premium border border-white/10 overflow-hidden flex-1 min-h-0">
            <SearchNavbar
              showFilters={false}
              selectedTab={selectedTab}
              onTabChange={setSelectedTab}
            />

            <div className="w-full px-2 sm:px-6 lg:px-8 py-2 sm:py-6 pb-4 overflow-y-auto flex-1 min-h-0">
              {/* Auto Onboarding Modal - opens automatically for new users */}
              <AutoOnboarding />

              {/* Topics Navigation - Horizontal menu at top */}
              <TopicsNav
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                userPreferences={userPreferences}
                onOpenPreferences={() => setPreferencesOpen(true)}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-6 max-w-[1600px] mx-auto">
                {/* Main Content - Feed */}
                <ProjectsFeed
                  projects={projects}
                  loading={loading}
                  loadingMore={loadingMore}
                  hasMore={hasMore}
                  onLoadMore={loadMore}
                  userPreferences={userPreferences}
                  onClearFilters={handleClearFilters}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  onOpenPreferences={() => setPreferencesOpen(true)}
                />

                {/* Right Sidebar - User Info (hidden on mobile, shown on large screens) */}
                <aside className="hidden lg:block lg:col-span-3 xl:col-span-3 space-y-4">
                  <UserProfileCard user={user} loading={authLoading} />
                  <AboutCard />
                </aside>
              </div>
            </div>
          </SidebarInset>
        </div>

        {/* Footer - hidden on mobile to make room for bottom nav */}
        <div className="hidden md:block">
          <Footer />
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav user={user} />
      </div>

      <PreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        onSave={handlePreferencesSave}
      />
    </SidebarProvider>
  );
}
