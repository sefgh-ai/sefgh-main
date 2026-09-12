"use client";

import { Button } from "@/components/ui/button";

export function PopularSearches({ setSearchQuery, handleSearch }) {
  const handleQuickSearch = (query) => {
    setSearchQuery(query);
    // Pass query directly to handleSearch to avoid state timing issues
    handleSearch(null, query);
  };

  return (
    <div className="mx-auto mb-8">
      <h2 className="text-lg font-semibold mb-4">Popular Searches</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 px-4 flex flex-col items-start justify-start text-left"
          onClick={() => handleQuickSearch("react")}
        >
          <span className="font-medium text-sm">React Projects</span>
          <span className="text-xs text-muted-foreground">
            Frontend frameworks
          </span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 px-4 flex flex-col items-start justify-start text-left"
          onClick={() => handleQuickSearch("machine learning")}
        >
          <span className="font-medium text-sm">Machine Learning</span>
          <span className="text-xs text-muted-foreground">
            AI & ML repositories
          </span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 px-4 flex flex-col items-start justify-start text-left"
          onClick={() => handleQuickSearch("blockchain")}
        >
          <span className="font-medium text-sm">Web3 & Blockchain</span>
          <span className="text-xs text-muted-foreground">
            Decentralized apps
          </span>
        </Button>
      </div>
    </div>
  );
}
