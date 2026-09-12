"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Loader2, Sparkles } from "lucide-react";
import { useCategories } from "@/hooks/home/useCategories";
import { cn } from "@/lib/utils";

export function TopicsNav({
  selectedCategory,
  onCategoryChange,
  userPreferences,
  onOpenPreferences,
}) {
  const { categories: liveCategories, loading } = useCategories();

  // Use useMemo for mounted state to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  // Use useEffect with empty cleanup to set mounted state
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Memoize categories to prevent useEffect dependency changes on every render
  const userTags = userPreferences?.tags;
  const categories = useMemo(() => {
    const filteredLiveCategories = liveCategories.filter(
      (cat) => cat.name !== "All"
    );

    if (userTags?.length > 0) {
      return userTags;
    }
    if (filteredLiveCategories.length > 0) {
      return filteredLiveCategories;
    }
    return [];
  }, [liveCategories, userTags]);

  return (
    <div className="mb-3 sm:mb-5">
      {/* Topics row - compact inline layout */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {/* Topic pills */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            categories.map((category) => {
              const isSelected = selectedCategory === category.name;
              return (
                <button
                  key={category.id || category.name}
                  onClick={() => onCategoryChange(category.name)}
                  className={cn(
                    "inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                  {category.usage_count !== undefined &&
                    category.usage_count > 0 && (
                      <span
                        className={cn(
                          "text-xs",
                          isSelected ? "opacity-80" : "text-muted-foreground"
                        )}
                      >
                        {category.usage_count}
                      </span>
                    )}
                </button>
              );
            })
          )}
        </div>

        {/* Personalize button - inline with topics */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenPreferences}
          className="h-7 sm:h-8 gap-1.5 rounded-full text-xs px-2 sm:px-3"
        >
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Personalize Feed</span>
        </Button>
      </div>

      {/* Active preferences indicator - only when has preferences */}
      {mounted && userPreferences?.tags?.length > 0 && (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>
            Your personalized feed: showing {userPreferences.tags.length}{" "}
            selected topic{userPreferences.tags.length > 1 ? "s" : ""}
          </span>
          <button
            onClick={onOpenPreferences}
            className="text-primary hover:underline"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
