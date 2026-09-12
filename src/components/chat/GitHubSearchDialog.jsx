"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RepositoryCard } from "@/components/RepositoryCard";
import { Search, Github, Loader2 } from "lucide-react";

export function GitHubSearchDialog({
  open,
  onOpenChange,
  githubSearchQuery,
  setGithubSearchQuery,
  searchingGithub,
  githubSearchResults,
  handleGithubSearch,
  handleSelectRepo,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] glass-premium border-white/10">
        <DialogHeader>
          <DialogTitle className="text-blue-900 dark:text-blue-100">
            Search GitHub Repositories
          </DialogTitle>
          <DialogDescription>
            Search for repositories to explore in the canvas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={githubSearchQuery}
                onChange={(e) => setGithubSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleGithubSearch()}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleGithubSearch}
              disabled={searchingGithub}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-glow-blue"
            >
              {searchingGithub ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Search Results */}
          <ScrollArea className="h-[400px] pr-4">
            {searchingGithub ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl border bg-card animate-pulse"
                  >
                    <div className="h-6 bg-muted rounded mb-3 w-3/4"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded mb-4 w-5/6"></div>
                    <div className="flex gap-4">
                      <div className="h-4 bg-muted rounded w-16"></div>
                      <div className="h-4 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : githubSearchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {githubSearchResults.map((repo) => (
                  <RepositoryCard
                    key={repo.id}
                    repo={repo}
                    onSelect={handleSelectRepo}
                  />
                ))}
              </div>
            ) : githubSearchQuery && !searchingGithub ? (
              <div className="text-center py-12 text-muted-foreground">
                <Github className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No repositories found</p>
                <p className="text-sm mt-1">Try a different search query</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Github className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Search for GitHub repositories</p>
                <p className="text-sm mt-1">Enter a query above to get started</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
