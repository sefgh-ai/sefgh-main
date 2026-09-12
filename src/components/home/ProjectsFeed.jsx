"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Loader2 } from "lucide-react";
import { ProjectCard, ProjectCardSkeleton } from "./ProjectCard";

export function ProjectsFeed({
  projects,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  userPreferences,
  onClearFilters,
  selectedCategory,
  onCategoryChange,
  onOpenPreferences,
}) {
  const scrollRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore?.();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <main className="col-span-1 lg:col-span-9 flex flex-col min-h-0">
      {/* Projects Feed - native scroll for cleaner appearance */}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
        <div className="space-y-3 px-1">
          {loading ? (
            // Loading skeleton - show only 3 for faster perceived load
            Array.from({ length: 3 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))
          ) : projects.length === 0 ? (
            // No results
            <Card className="glass-premium border-border backdrop-blur-sm">
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Code className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground" />
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">
                      No projects found
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Try adjusting your filters or preferences
                    </p>
                    <Button variant="outline" onClick={onClearFilters}>
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}

              {/* Infinite scroll trigger & Load More button */}
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                ) : hasMore ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLoadMore}
                    className="glass-premium"
                  >
                    Load More
                  </Button>
                ) : projects.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No more projects to load
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
