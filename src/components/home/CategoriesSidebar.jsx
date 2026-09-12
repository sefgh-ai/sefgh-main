"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Settings, Loader2 } from "lucide-react";
import { useCategories } from "@/hooks/home/useCategories";

export function CategoriesSidebar({
  selectedCategory,
  onCategoryChange,
  userPreferences,
  onOpenPreferences,
}) {
  const { categories: liveCategories, loading } = useCategories();

  // Filter out "All" from live categories to avoid duplication
  const filteredLiveCategories = liveCategories.filter(
    (cat) => cat.name !== "All"
  );

  // Determine which categories to display
  // Priority: User preferences > Live database categories
  const categories =
    userPreferences?.tags?.length > 0
      ? [{ name: "All", icon: "🎯" }, ...userPreferences.tags]
      : filteredLiveCategories.length > 0
      ? [{ name: "All", icon: "🎯" }, ...filteredLiveCategories]
      : [{ name: "All", icon: "🎯" }]; // Fallback if no data

  return (
    <Card className="glass-premium border-border backdrop-blur-sm h-[calc(100vh-180px)] flex flex-col">
      <CardContent className="p-3 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2 px-1 shrink-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Code className="w-3.5 h-3.5" />
            Topics
            {loading && (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            )}
          </div>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {filteredLiveCategories.length}
          </Badge>
        </div>

        {/* Categories List with Scroll */}
        <ScrollArea className="flex-1 min-h-0 -mx-1 px-1">
          <div className="space-y-0.5">
            {categories.map((category) => (
              <button
                key={category.id || category.name}
                onClick={() => onCategoryChange(category.name)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedCategory === category.name
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm">{category.icon}</span>
                  <span className="truncate">{category.name}</span>
                </span>
                {category.usage_count !== undefined &&
                  category.usage_count > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {category.usage_count}
                    </span>
                  )}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Preferences Button */}
        <button
          onClick={onOpenPreferences}
          className="w-full flex items-center gap-2 px-2 py-1.5 mt-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border-t border-border/50 pt-2 shrink-0"
        >
          <Settings className="w-3.5 h-3.5" />
          Preferences
        </button>
      </CardContent>
    </Card>
  );
}
