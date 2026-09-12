"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";

export function TrendingFilters({
  activeTab,
  setActiveTab,
  spokenLanguage,
  setSpokenLanguage,
  programmingLanguage,
  setProgrammingLanguage,
  dateRange,
  setDateRange,
  sortBy,
  setSortBy,
  spokenLanguages,
  programmingLanguages,
  sortOptions,
  lastRefresh,
  isDataStale,
  isRefreshing,
  handleRefreshTrending,
}) {
  const [languageSearch, setLanguageSearch] = useState("");
  const [spokenLanguageSearch, setSpokenLanguageSearch] = useState("");

  const filteredSpokenLanguages = spokenLanguages.filter((lang) =>
    lang.toLowerCase().includes(spokenLanguageSearch.toLowerCase())
  );

  const filteredProgrammingLanguages = programmingLanguages.filter((lang) =>
    lang.toLowerCase().includes(languageSearch.toLowerCase())
  );

  const capitalize = (str) => {
    if (str === "any") return "Any";
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      {/* Header with Refresh */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Trending</h1>
        <p className="text-muted-foreground">
          See what the community is most excited about today.
        </p>

        {/* Refresh Info */}
        <div className="flex items-center justify-center gap-4 mt-4">
          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date(lastRefresh).toLocaleDateString()}
            </span>
          )}
          {isDataStale && (
            <Badge
              variant="outline"
              className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
            >
              Data is older than 3 days
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshTrending}
            disabled={isRefreshing}
            className="hover:bg-accent"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh Trending"}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="glass-premium border-border backdrop-blur-sm mb-6">
        <CardContent className="p-4">
          <div className="flex items-center flex-wrap gap-3">
            {/* Tabs */}
            <div className="flex gap-2 mr-auto">
              <Button
                variant={activeTab === "repositories" ? "default" : "outline"}
                size="sm"
                className={
                  activeTab === "repositories"
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "hover:bg-accent"
                }
                onClick={() => setActiveTab("repositories")}
              >
                Repositories
              </Button>
              <Button
                variant={activeTab === "developers" ? "default" : "outline"}
                size="sm"
                className={
                  activeTab === "developers"
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "hover:bg-accent"
                }
                onClick={() => setActiveTab("developers")}
              >
                Developers
              </Button>
            </div>

            {/* Spoken Language */}
            <Select value={spokenLanguage} onValueChange={setSpokenLanguage}>
              <SelectTrigger className="w-[240px] bg-card border-border">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span
                    className="text-xs text-muted-foreground/70 shrink-0"
                    style={{ textShadow: "0 0 8px rgba(255, 255, 255, 0.15)" }}
                  >
                    Spoken Language:
                  </span>
                  <SelectValue placeholder="Spoken Language" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-[300px]">
                <div className="p-2 sticky top-0 bg-card z-10 border-b border-border">
                  <input
                    type="text"
                    placeholder="Filter spoken languages"
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary"
                    value={spokenLanguageSearch}
                    onChange={(e) => setSpokenLanguageSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredSpokenLanguages.map((lang) => (
                  <SelectItem
                    key={lang}
                    value={lang}
                    className="focus:bg-accent"
                  >
                    {capitalize(lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Programming Language */}
            <Select
              value={programmingLanguage}
              onValueChange={setProgrammingLanguage}
            >
              <SelectTrigger className="w-[200px] bg-card border-border">
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span
                    className="text-xs text-muted-foreground/70 shrink-0"
                    style={{ textShadow: "0 0 8px rgba(255, 255, 255, 0.15)" }}
                  >
                    Language:
                  </span>
                  <SelectValue placeholder="Language" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-card border-border max-h-[300px]">
                <div className="p-2 sticky top-0 bg-card z-10 border-b border-border">
                  <input
                    type="text"
                    placeholder="Filter languages"
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary"
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {filteredProgrammingLanguages.map((lang) => (
                  <SelectItem
                    key={lang}
                    value={lang}
                    className="focus:bg-accent"
                  >
                    {capitalize(lang)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px] bg-card border-border">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="daily" className="focus:bg-accent">
                  Today
                </SelectItem>
                <SelectItem value="weekly" className="focus:bg-accent">
                  This Week
                </SelectItem>
                <SelectItem value="monthly" className="focus:bg-accent">
                  This Month
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            {activeTab === "repositories" && (
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] bg-card border-border">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {sortOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="focus:bg-accent"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
