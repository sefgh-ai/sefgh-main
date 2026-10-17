"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Header } from "@/components/Header";
import { RepositoryCard } from "@/components/RepositoryCard";
import { LoadingState, CompactEmptyState } from "@/components/shared";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchWithSession } from "@/lib/supabase/session-fetch";
import Link from "next/link";

export default function StarredPage() {
  const { user, loading: authLoading } = useAuth();
  const [starredRepos, setStarredRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchStarredRepos();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchStarredRepos = async () => {
    try {
      setLoading(true);
      // With the Supabase bearer, which the Go port needs (STAR-001).
      const response = await fetchWithSession("/api/repo/starred");
      const data = await response.json();

      if (response.ok) {
        setStarredRepos(data.repos || []);
      } else {
        throw new Error(data.error || "Failed to fetch starred repos");
      }
    } catch (error) {
      console.error("Error fetching starred repos:", error);
      toast.error("Failed to load starred repositories");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (repoFullName) => {
    setRemoving(repoFullName);
    try {
      const response = await fetchWithSession(
        `/api/repo/collect?repo=${encodeURIComponent(repoFullName)}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setStarredRepos((prev) =>
          prev.filter((repo) => repo.repo_full_name !== repoFullName)
        );
        toast.success("Removed from starred");
      } else {
        throw new Error("Failed to remove");
      }
    } catch (error) {
      console.error("Error removing repo:", error);
      toast.error("Failed to remove repository");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <SidebarProvider>
      <div
        className="flex h-full w-full bg-background gradient-mesh flex-col overflow-hidden"
        suppressHydrationWarning
      >
        <div className="flex flex-1 min-h-0 p-2 sm:p-4 gap-1 sm:gap-2 pb-[72px] md:pb-2">
          <SearchSidebar user={user} />

          <SidebarInset className="flex flex-col glass-premium rounded-xl sm:rounded-2xl shadow-premium border border-border overflow-hidden flex-1 min-h-0">
            {/* Top Navbar */}
            <div className="sticky top-0 z-50 border-b border-border backdrop-blur-sm">
              <div className="flex h-14 items-center px-4 gap-3">
                <SidebarTrigger className="hover:bg-accent rounded-xl transition-smooth" />
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold">Starred Repositories</span>
                </div>
                <div className="flex-1" />
                <Header showProfileDropdown={true} />
              </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 px-4 pb-4 overflow-y-auto min-h-0">
              <div className="max-w-6xl mx-auto py-6">
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2">
                    Your{" "}
                    <span className="bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                      Starred Repositories
                    </span>
                  </h1>
                  <p className="text-muted-foreground">
                    All the repositories you&apos;ve saved for later
                  </p>
                </div>

                {/* Loading State */}
                {loading && <LoadingState type="card" count={6} />}

                {/* Not Logged In */}
                {!loading && !user && (
                  <div className="text-center py-16">
                    <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-semibold mb-2">
                      Sign in to see your starred repos
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Create an account to save and organize your favorite
                      repositories
                    </p>
                    <Link href="/login">
                      <Button className="rounded-xl">Sign In</Button>
                    </Link>
                  </div>
                )}

                {/* Empty State */}
                {!loading && user && starredRepos.length === 0 && (
                  <div className="text-center py-16">
                    <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h2 className="text-xl font-semibold mb-2">
                      No starred repositories yet
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Start exploring and save repositories you like!
                    </p>
                    <Link href="/search">
                      <Button className="rounded-xl">
                        Explore Repositories
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Starred Repos Count */}
                {!loading && user && starredRepos.length > 0 && (
                  <div className="mb-4 text-sm text-muted-foreground">
                    {starredRepos.length} starred{" "}
                    {starredRepos.length === 1 ? "repository" : "repositories"}
                  </div>
                )}

                {/* Repos Grid */}
                {!loading && user && starredRepos.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {starredRepos.map((item) => (
                      <div key={item.id} className="relative group">
                        <RepositoryCard
                          repo={{
                            id: item.id,
                            full_name: item.repo_full_name,
                            name:
                              item.repo_full_name?.split("/")[1] ||
                              item.repo_full_name,
                            owner: {
                              login: item.repo_full_name?.split("/")[0],
                              avatar_url: `https://github.com/${
                                item.repo_full_name?.split("/")[0]
                              }.png`,
                            },
                            description: item.repo_data?.description || "",
                            stargazers_count:
                              item.repo_data?.stargazers_count || 0,
                            forks_count: item.repo_data?.forks_count || 0,
                            language: item.repo_data?.language || "",
                            html_url: `https://github.com/${item.repo_full_name}`,
                            topics: item.repo_data?.topics || [],
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                          onClick={() => handleRemove(item.repo_full_name)}
                          disabled={removing === item.repo_full_name}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
