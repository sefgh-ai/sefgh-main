"use client";

import { RepositoryCard } from "@/components/RepositoryCard";
import { LoadingState, CompactEmptyState } from "@/components/shared";
import {
  Star,
  GitFork,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/search/ViewToggle";

// Compact list item for list/compact views
function RepositoryListItem({ repo, onSelect, compact = false }) {
  const formatNumber = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  if (compact) {
    return (
      <div
        className="flex items-center gap-4 px-4 py-3 rounded-lg glass-premium border border-white/5 hover:border-blue-500/30 hover:bg-white/5 transition-all cursor-pointer group"
        onClick={() => onSelect?.(repo)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate group-hover:text-blue-400 transition-colors">
              {repo.full_name}
            </span>
            {repo.language && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                {repo.language}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {formatNumber(repo.stargazers_count)}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-3 w-3" />
            {formatNumber(repo.forks_count)}
          </span>
          <span className="hidden sm:flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(repo.updated_at)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-xl glass-premium border border-white/5 hover:border-blue-500/30 hover:shadow-glow-blue transition-all cursor-pointer group"
      onClick={() => onSelect?.(repo)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-lg group-hover:text-blue-400 transition-colors truncate">
            {repo.full_name}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              window.open(repo.html_url, "_blank");
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {repo.description || "No description available"}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {repo.language && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    repo.language === "JavaScript"
                      ? "#f1e05a"
                      : repo.language === "TypeScript"
                      ? "#3178c6"
                      : repo.language === "Python"
                      ? "#3572A5"
                      : "#6e7681",
                }}
              />
              {repo.language}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5" />
            {formatNumber(repo.stargazers_count)}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-3.5 w-3.5" />
            {formatNumber(repo.forks_count)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(repo.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SearchResults({
  loading,
  searchResults,
  setSelectedRepo,
  searchTime,
  totalCount,
  view = "grid",
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  currentPage = 1,
  onPageChange,
  itemsPerPage = 30,
  setView,
}) {
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const showPagination = totalPages > 1 && onPageChange;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if at edges
      if (currentPage <= 3) {
        end = Math.min(maxVisible, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - maxVisible + 1);
      }

      // Add ellipsis before range if needed
      if (start > 2) pages.push("...");

      // Add range
      for (let i = start; i <= end; i++) pages.push(i);

      // Add ellipsis after range if needed
      if (end < totalPages - 1) pages.push("...");

      // Always show last page
      if (totalPages > 1) pages.push(totalPages);
    }

    return pages;
  };

  if (loading) {
    return <LoadingState type="card" count={6} />;
  }

  if (searchResults.length === 0) {
    return (
      <div className="mx-auto">
        <CompactEmptyState
          icon="search"
          message="Enter a query above to search through millions of repositories"
        />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 text-sm text-muted-foreground flex items-center justify-between">
        <span>
          Showing {searchResults.length} of {totalCount.toLocaleString()}{" "}
          repositories
          {searchTime && <span className="ml-2">• Found in {searchTime}s</span>}
        </span>
        {setView && <ViewToggle view={view} setView={setView} />}
      </div>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {searchResults.map((repo) => (
            <div
              key={repo.id}
              className="transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300"
            >
              <RepositoryCard repo={repo} onSelect={setSelectedRepo} />
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="flex flex-col gap-3">
          {searchResults.map((repo) => (
            <RepositoryListItem
              key={repo.id}
              repo={repo}
              onSelect={setSelectedRepo}
            />
          ))}
        </div>
      )}

      {/* Compact View */}
      {view === "compact" && (
        <div className="flex flex-col gap-1">
          {searchResults.map((repo) => (
            <RepositoryListItem
              key={repo.id}
              repo={repo}
              onSelect={setSelectedRepo}
              compact
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <div className="flex items-center gap-1">
            {/* First Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1 || loadingMore}
              className="h-9 w-9 p-0 rounded-lg glass-premium border-white/10"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Previous Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || loadingMore}
              className="h-9 w-9 p-0 rounded-lg glass-premium border-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1 mx-2">
              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    disabled={loadingMore}
                    className={`h-9 w-9 p-0 rounded-lg ${
                      currentPage === page
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "glass-premium border-white/10 hover:border-blue-500/30"
                    }`}
                  >
                    {page}
                  </Button>
                )
              )}
            </div>

            {/* Next Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loadingMore}
              className="h-9 w-9 p-0 rounded-lg glass-premium border-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Last Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages || loadingMore}
              className="h-9 w-9 p-0 rounded-lg glass-premium border-white/10"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Page Info */}
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages.toLocaleString()}
          </span>
        </div>
      )}

      {/* Load More Button (fallback if no pagination handler) */}
      {!showPagination && hasMore && searchResults.length < totalCount && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-xl glass-premium hover:glow-border-blue transition-smooth px-8"
          >
            {loadingMore ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Loading more...
              </>
            ) : (
              <>
                Load More Results
                <span className="ml-2 text-muted-foreground">
                  ({totalCount - searchResults.length} remaining)
                </span>
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
