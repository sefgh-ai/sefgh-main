"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SearchNavbar } from "@/components/search/SearchNavbar";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingFilters } from "@/components/trending/TrendingFilters";
import { TrendingRepositoryCard } from "@/components/trending/TrendingRepositoryCard";
import { TrendingDeveloperCard } from "@/components/trending/TrendingDeveloperCard";
import { EditorsChoice } from "@/components/trending/EditorsChoice";
import { useTrendingData } from "@/hooks/trending/useTrendingData";
import {
  SPOKEN_LANGUAGES,
  SORT_OPTIONS,
  sortRepositories,
} from "@/lib/utils/trending/trendingHelpers";
import { getHeatIndicator } from "@/lib/utils/colors";
import { editorsChoice } from "@/data/editorsChoice";

export default function TrendingPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Filter state
  const [activeTab, setActiveTab] = useState("repositories");
  const [spokenLanguage, setSpokenLanguage] = useState("english");
  const [programmingLanguage, setProgrammingLanguage] = useState("any");
  const [dateRange, setDateRange] = useState("daily");
  const [sortBy, setSortBy] = useState("stars");

  // Programming languages state
  const [programmingLanguages, setProgrammingLanguages] = useState([]);

  // Custom hook for data fetching
  const {
    loading,
    repositories,
    developers,
    isRefreshing,
    lastRefresh,
    isDataStale,
    handleRefreshTrending,
    getCustomTrendingRepos,
  } = useTrendingData(
    activeTab,
    programmingLanguage,
    spokenLanguage,
    dateRange
  );

  // Fetch programming languages list
  useEffect(() => {
    const fetchProgrammingLanguages = async () => {
      try {
        const response = await fetch("/api/github/languages");
        if (response.ok) {
          const data = await response.json();
          setProgrammingLanguages(["any", ...data]);
        } else {
          // Fallback to common languages
          setProgrammingLanguages([
            "any",
            "javascript",
            "python",
            "java",
            "typescript",
            "go",
            "rust",
            "c++",
            "c#",
            "php",
            "ruby",
            "swift",
            "kotlin",
          ]);
        }
      } catch (error) {
        console.error("Error fetching languages:", error);
        setProgrammingLanguages([
          "any",
          "javascript",
          "python",
          "java",
          "typescript",
        ]);
      }
    };

    fetchProgrammingLanguages();
  }, []);

  // Merge and sort repositories (memoized for performance)
  const displayRepos = useMemo(() => {
    const customRepos = getCustomTrendingRepos();
    const allRepos = [...customRepos, ...repositories];
    return sortRepositories(allRepos, sortBy);
  }, [repositories, sortBy, getCustomTrendingRepos]);

  return (
    <SidebarProvider>
      <div className="flex h-full w-full bg-background gradient-mesh flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 p-2 sm:p-4 gap-2 sm:gap-4 pb-[72px] md:pb-2">
          <SearchSidebar user={user} />

          <SidebarInset className="flex flex-col glass-premium rounded-xl sm:rounded-2xl shadow-premium border border-white/10 overflow-hidden flex-1 min-h-0">
            <SearchNavbar showFilters={false} />

            <main className="flex-1 py-6 px-4 pb-4 overflow-y-auto min-h-0">
              <div className="max-w-7xl mx-auto px-4">
                {/* Editors' Choice */}
                <EditorsChoice
                  items={editorsChoice}
                  onNavigate={(path) => router.push(path)}
                />

                {/* Filters */}
                <TrendingFilters
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  spokenLanguage={spokenLanguage}
                  setSpokenLanguage={setSpokenLanguage}
                  programmingLanguage={programmingLanguage}
                  setProgrammingLanguage={setProgrammingLanguage}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  spokenLanguages={SPOKEN_LANGUAGES}
                  programmingLanguages={programmingLanguages}
                  sortOptions={SORT_OPTIONS}
                  lastRefresh={lastRefresh}
                  isDataStale={isDataStale}
                  isRefreshing={isRefreshing}
                  handleRefreshTrending={handleRefreshTrending}
                />

                {/* Content */}
                <div className="space-y-4 mt-4">
                  {loading
                    ? // Loading skeleton
                      Array.from({ length: 5 }).map((_, i) => (
                        <Card
                          key={i}
                          className="bg-slate-900/50 border-slate-800 backdrop-blur-sm animate-pulse"
                        >
                          <CardContent className="p-6">
                            <div className="h-6 bg-slate-800 rounded w-3/4 mb-4"></div>
                            <div className="h-4 bg-slate-800 rounded w-full mb-2"></div>
                            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                          </CardContent>
                        </Card>
                      ))
                    : activeTab === "repositories"
                    ? // Repositories List
                      displayRepos.map((repo, index) => (
                        <TrendingRepositoryCard
                          key={repo.id}
                          repo={repo}
                          index={index}
                          onNavigate={(path) => router.push(path)}
                          getHeatIndicator={getHeatIndicator}
                        />
                      ))
                    : // Developers List
                      developers.map((dev) => (
                        <TrendingDeveloperCard
                          key={dev.id}
                          dev={dev}
                          onNavigate={(path) => router.push(path)}
                        />
                      ))}
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav user={user} />
      </div>
    </SidebarProvider>
  );
}
