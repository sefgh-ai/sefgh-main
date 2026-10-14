"use client";

import { formatNumber } from "@/lib/utils/formatters";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { MobileBottomNav } from "@/components/search/MobileBottomNav";
import { SearchNavbar } from "@/components/search/SearchNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MessageSquare,
  Clock,
  Trash2,
  Filter,
  X,
  History as HistoryIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { PageLoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAuthenticated, isLoading } = useAuthGuard();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState("all"); // all, search, chat
  const [searchFilter, setSearchFilter] = useState("");

  const { history, loading, counts, refresh, deleteItem, clearAll } =
    useSearchHistory(user?.id);

  // Filtered history based on source and search text
  const filteredHistory = history.filter((item) => {
    // Source filter
    if (activeFilter !== "all" && item.source !== activeFilter) {
      return false;
    }
    // Text search filter
    if (
      searchFilter &&
      !item.query.toLowerCase().includes(searchFilter.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  // Group by date
  const groupedHistory = filteredHistory.reduce((groups, item) => {
    const date = new Date(item.created_at).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(item);
    return groups;
  }, {});

  const handleDelete = async (id) => {
    const success = await deleteItem(id);
    if (success) {
      toast.success("Search removed from history");
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to clear all your search history? This action cannot be undone."
    );
    if (confirmed) {
      const success = await clearAll();
      if (success) {
        toast.success("Search history cleared");
      }
    }
  };

  const handleSearchAgain = (item) => {
    if (item.source === "search") {
      router.push(`/search?q=${encodeURIComponent(item.query)}`);
    } else {
      router.push("/chat");
    }
  };

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div
        className="flex h-full w-full bg-background gradient-mesh flex-col overflow-hidden"
        suppressHydrationWarning
      >
        <div className="flex flex-1 min-h-0 p-2 sm:p-4 gap-2 sm:gap-4 pb-[72px] md:pb-2">
          <SearchSidebar user={user} />

          <SidebarInset className="flex flex-col glass-premium rounded-xl sm:rounded-2xl shadow-premium border border-border overflow-hidden flex-1 min-h-0">
            <SearchNavbar showFilters={false} />
            <main className="flex-1 flex flex-col px-4 pb-4 overflow-y-auto min-h-0">
              <div className="max-w-4xl mx-auto w-full py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-slate-500/20">
                      <HistoryIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">Search History</h1>
                      <p className="text-muted-foreground text-sm">
                        {counts.total} total searches
                      </p>
                    </div>
                  </div>
                  {history.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAll}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  {/* Source Filter Tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
                    <Button
                      variant={activeFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveFilter("all")}
                      className="h-8"
                    >
                      All ({counts.total})
                    </Button>
                    <Button
                      variant={activeFilter === "search" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveFilter("search")}
                      className="h-8"
                    >
                      <Search className="h-3 w-3 mr-1" />
                      Search ({counts.search})
                    </Button>
                    <Button
                      variant={activeFilter === "chat" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveFilter("chat")}
                      className="h-8"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Chat ({counts.chat})
                    </Button>
                  </div>

                  {/* Text Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter history..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-9 h-9"
                    />
                    {searchFilter && (
                      <button
                        onClick={() => setSearchFilter("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* History List */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <HistoryIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">
                      No history found
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {history.length === 0
                        ? "Your search history will appear here"
                        : "No results match your filters"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedHistory).map(([date, items]) => (
                      <div key={date}>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {date}
                        </h3>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="group flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card transition-all"
                            >
                              {/* Source Icon */}
                              <div
                                className={`p-2 rounded-lg ${
                                  item.source === "search"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-purple-500/10 text-purple-400"
                                }`}
                              >
                                {item.source === "search" ? (
                                  <Search className="h-4 w-4" />
                                ) : (
                                  <MessageSquare className="h-4 w-4" />
                                )}
                              </div>

                              {/* Query */}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {item.query}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {item.source === "search"
                                      ? "Search"
                                      : "AI Chat"}
                                  </Badge>
                                  {item.results_count > 0 &&
                                    item.source === "search" && (
                                      <span className="text-xs text-muted-foreground">
                                        {formatNumber(item.results_count)}{" "}
                                        results
                                      </span>
                                    )}
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(
                                      new Date(item.created_at),
                                      {
                                        addSuffix: true,
                                      }
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSearchAgain(item)}
                                  className="h-8 px-3"
                                >
                                  {item.source === "search" ? (
                                    <>
                                      <Search className="h-3 w-3 mr-1" />
                                      Search Again
                                    </>
                                  ) : (
                                    "Open Chat"
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(item.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
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
